import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001",
  other = "20000000-0000-4000-8000-000000000002";
async function as(role: string, uid = "") {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${uid}',false);select set_config('request.jwt.claim.role','${role}',false);set role ${role}`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('${owner}','owner@example.invalid'),('${other}','other@example.invalid');`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && !f.includes("privacy_hold"))
    .sort())
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
  expect((await db.query("select id from community_posts")).rows).toHaveLength(
    0,
  );
  for (const uid of [owner, other]) {
    await db.exec(
      `insert into candidate_profiles(owner_id,slug,full_name,linkedin_url,target_role,function,seniority,location,regions,work_modes,skills) values('${uid}','person-${uid}','Fictional Example','https://www.linkedin.com/in/fictional-example','Engineer','Engineering','Senior','Example city','{Europe}','{Remote}','{TypeScript}');insert into hiring_roles(owner_id,slug,company_name,contact_name,role_title,function,seniority,location,regions,work_modes,skills,vacancy_url) values('${uid}','role-${uid}','Fictional Company','Fictional Contact','Engineer','Engineering','Senior','Example city','{Europe}','{Remote}','{TypeScript}','https://example.invalid/job');insert into community_posts(owner_id,url) values('${uid}','https://www.linkedin.com/posts/fictional-${uid}');`,
    );
  }
  await db.exec(
    "insert into community_posts(owner_id,url) values(null,'https://www.linkedin.com/posts/fictional-guest')",
  );
  await db.exec(
    readFileSync("supabase/migrations/202610230001_privacy_hold.sql", "utf8"),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("privacy hold against direct database access", () => {
  it("hides existing rows without deleting them or automatically republishing them", async () => {
    await as("service_role");
    for (const [table, count] of [
      ["candidate_profiles", 2],
      ["hiring_roles", 2],
      ["community_posts", 3],
    ] as const) {
      const result = await db.query<{ status: string }>(
        `select status from ${table}`,
      );
      expect(result.rows).toHaveLength(count);
      expect(result.rows.every((row) => row.status === "hidden")).toBe(true);
    }
  });
  it("prevents anonymous enumeration and limits signed-in reads to owned records", async () => {
    await as("anon");
    for (const table of [
      "candidate_profiles",
      "hiring_roles",
      "community_posts",
    ])
      expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
    await as("authenticated", owner);
    for (const table of [
      "candidate_profiles",
      "hiring_roles",
      "community_posts",
    ]) {
      const data = await db.query<{ owner_id: string }>(
        `select * from ${table}`,
      );
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0].owner_id).toBe(owner);
    }
  });
  it("blocks authenticated inserts and re-publication without relying on the website", async () => {
    await as("authenticated", owner);
    await expect(
      db.exec(
        `insert into community_posts(owner_id,url) values('${owner}','https://www.linkedin.com/posts/fictional-new')`,
      ),
    ).rejects.toThrow();
    for (const table of [
      "candidate_profiles",
      "hiring_roles",
      "community_posts",
    ])
      await expect(
        db.exec(
          `update ${table} set status='active',expires_at=now()+interval '30 days' where owner_id='${owner}'`,
        ),
      ).rejects.toThrow();
  });
  it("keeps owner hide/delete working, blocks other-user access, and makes ownerless entries unclaimable", async () => {
    await as("authenticated", owner);
    for (const table of [
      "candidate_profiles",
      "hiring_roles",
      "community_posts",
    ]) {
      expect(
        (
          await db.query(
            `update ${table} set status='hidden' where owner_id='${owner}' returning id`,
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await db.query(
            `delete from ${table} where owner_id='${other}' returning id`,
          )
        ).rows,
      ).toHaveLength(0);
    }
    expect(
      (
        await db.query(
          `update community_posts set owner_id='${owner}',status='hidden' where owner_id is null returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    for (const table of [
      "candidate_profiles",
      "hiring_roles",
      "community_posts",
    ])
      expect(
        (
          await db.query(
            `delete from ${table} where owner_id='${owner}' returning id`,
          )
        ).rows,
      ).toHaveLength(1);
    await as("service_role");
    expect(
      (await db.query("select id from community_posts")).rows,
    ).toHaveLength(2);
    await db.exec("select retention_cleanup()");
  });
});
