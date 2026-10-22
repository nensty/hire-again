import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import seed from "../src/data/shared-posts.json";
let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001",
  other = "20000000-0000-4000-8000-000000000002";
const post = "30000000-0000-4000-8000-000000000003";
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
  for (const file of [
    "202610200001_initial.sql",
    "202610220001_community_posts.sql",
    "202610220002_shared_posts.sql",
  ])
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("post migrations, seed provenance, and ownership", () => {
  it("seeds exactly the eight provided links, idempotently, with no invented auth users or candidate profiles", async () => {
    const rows = await db.query<{ url: string; author_name: string | null }>(
      "select url,author_name from community_posts",
    );
    expect(rows.rows.map((r) => r.url).sort()).toEqual(
      seed.map((p) => p.url).sort(),
    );
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from auth.users")).rows).toHaveLength(2);
    await db.exec(
      readFileSync("supabase/migrations/202610220002_shared_posts.sql", "utf8"),
    );
    expect((await db.query("select * from community_posts")).rows).toHaveLength(
      8,
    );
  });
  it("allows public reads but blocks anonymous writes and maintenance", async () => {
    await as("anon");
    expect((await db.query("select * from community_posts")).rows).toHaveLength(
      8,
    );
    await expect(
      db.exec(
        "insert into community_posts(url) values('https://lnkd.in/test')",
      ),
    ).rejects.toThrow();
    await expect(db.exec("select retention_cleanup()")).rejects.toThrow();
  });
  it("requires the caller to own every inserted post; organizer links cannot be claimed by arbitrary users", async () => {
    await as("authenticated", owner);
    await db.exec(
      `insert into community_posts(id,url,title) values('${post}','https://lnkd.in/p/test-owned','Owned post')`,
    );
    await expect(
      db.exec(
        `insert into community_posts(owner_id,url) values('${other}','https://lnkd.in/p/spoof')`,
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "update community_posts set title='claimed' where owner_id is null returning id",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("lets the owner hide/read posts while denying cross-user updates/deletes and public hidden reads", async () => {
    await as("authenticated", other);
    expect(
      (
        await db.query(
          `update community_posts set title='tampered' where id='${post}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          `delete from community_posts where id='${post}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    await as("authenticated", owner);
    await db.exec(
      `update community_posts set status='hidden' where id='${post}'`,
    );
    expect(
      (await db.query(`select * from community_posts where id='${post}'`)).rows,
    ).toHaveLength(1);
    await as("anon");
    expect(
      (await db.query(`select * from community_posts where id='${post}'`)).rows,
    ).toHaveLength(0);
  });
  it("owns expiry and identity in SQL and enforces the five-skill limit", async () => {
    await as("authenticated", owner);
    await expect(
      db.exec(
        `update community_posts set owner_id='${other}' where id='${post}'`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update community_posts set status='active',expires_at='2099-01-01' where id='${post}'`,
    );
    const days = (
      await db.query<{ days: string }>(
        `select extract(epoch from expires_at-now())/86400 as days from community_posts where id='${post}'`,
      )
    ).rows[0].days;
    expect(Number(days)).toBeCloseTo(30, 2);
    await expect(
      db.exec(
        `update community_posts set skills=array['a','b','c','d','e','f'] where id='${post}'`,
      ),
    ).rejects.toThrow();
  });
  it("supports private reports and cleans expired posts without exposing reports", async () => {
    await as("service_role");
    await db.exec(
      `insert into reports(entity_type,entity_id,reason) values('post','${post}','Other')`,
    );
    await as("authenticated", owner);
    await expect(db.exec("select * from reports")).rejects.toThrow();
    await as("postgres");
    await db.exec(
      `alter table community_posts disable trigger validate_community_post;update community_posts set expires_at=now()-interval '31 days' where id='${post}';alter table community_posts enable trigger validate_community_post;`,
    );
    await as("anon");
    expect(
      (await db.query(`select * from community_posts where id='${post}'`)).rows,
    ).toHaveLength(0);
    await as("service_role");
    await db.exec("select retention_cleanup()");
    expect(
      (await db.query(`select * from community_posts where id='${post}'`)).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from reports")).rows).toHaveLength(0);
  });
});
