import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001",
  other = "20000000-0000-4000-8000-000000000002";
const person = "30000000-0000-4000-8000-000000000003";
const role = "40000000-0000-4000-8000-000000000004";
async function as(
  who: "anon" | "authenticated" | "service_role" | "postgres",
  uid = "",
) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${uid}',false);select set_config('request.jwt.claim.role','${who}',false);set role ${who};`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
insert into auth.users values ('${owner}','fictional-owner@example.invalid'),('${other}','fictional-other@example.invalid');
`);
  await db.exec(
    readFileSync("supabase/migrations/202610200001_initial.sql", "utf8"),
  );
  await as("authenticated", owner);
  await db.exec(`insert into candidate_profiles(id,slug,full_name,linkedin_url,target_role,function,seniority,location,regions,work_modes,skills) values ('${person}','test-person-1234','Fictional Person','https://www.linkedin.com/in/fictional','Engineer','Engineering','Senior','Europe',array['Europe'],array['Remote'],array['TypeScript']);
insert into hiring_roles(id,slug,company_name,contact_name,role_title,function,seniority,location,regions,work_modes,skills,vacancy_url) values ('${role}','test-role-1234','Fictional Team','Fictional Contact','Engineer','Engineering','Senior','Europe',array['Europe'],array['Remote'],array['TypeScript'],'https://example.com/role');`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("actual Postgres RLS and lifecycle", () => {
  it("allows anonymous public reads but no anonymous writes", async () => {
    await as("anon");
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(1);
    expect((await db.query("select * from hiring_roles")).rows).toHaveLength(1);
    await expect(
      db.exec(
        `update candidate_profiles set full_name='tampered' where id='${person}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into reports(entity_type,entity_id,reason) values('candidate','${person}','Other')`,
      ),
    ).rejects.toThrow();
  });
  it("denies cross-owner insert, update, and delete on both listing types", async () => {
    await as("authenticated", other);
    expect(
      (
        await db.query(
          `update candidate_profiles set full_name='tampered' where id='${person}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          `delete from hiring_roles where id='${role}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into hiring_roles(owner_id,slug,company_name,contact_name,role_title,function,seniority,location,regions,work_modes,skills,vacancy_url) values('${owner}','spoof-1234','Fake','Fake','Fake','Engineering','Senior','Europe',array['Europe'],array['Remote'],array['SQL'],'https://example.com/')`,
      ),
    ).rejects.toThrow();
  });
  it("lets owners hide and read their own listings but removes them from anonymous reads", async () => {
    await as("authenticated", owner);
    await db.exec(
      `update candidate_profiles set status='hidden' where id='${person}';update hiring_roles set status='hidden' where id='${role}'`,
    );
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(1);
    await as("anon");
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from hiring_roles")).rows).toHaveLength(0);
    await as("authenticated", other);
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(0);
  });
  it("prevents changing ownership and stable slugs; limits candidate duplicates", async () => {
    await as("authenticated", owner);
    await expect(
      db.exec(
        `update candidate_profiles set owner_id='${other}' where id='${person}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `update candidate_profiles set slug='new-slug' where id='${person}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into candidate_profiles(slug,full_name,linkedin_url,target_role,function,seniority,location,regions,work_modes,skills) select 'duplicate-1234',full_name,linkedin_url,target_role,function,seniority,location,regions,work_modes,skills from candidate_profiles`,
      ),
    ).rejects.toThrow();
  });
  it("enforces server-owned 30-day renewal and rejects invalid array inputs", async () => {
    await as("authenticated", owner);
    await db.exec(
      `update candidate_profiles set status='active',expires_at='2099-01-01' where id='${person}'`,
    );
    const result = await db.query<{ days: number }>(
      `select extract(epoch from expires_at-now())/86400 as days from candidate_profiles`,
    );
    expect(Number(result.rows[0].days)).toBeCloseTo(30, 2);
    await expect(
      db.exec(
        `update candidate_profiles set skills=array[]::text[] where id='${person}'`,
      ),
    ).rejects.toThrow();
  });
  it("hides expired rows even when cron has not run and still lets the owner read them", async () => {
    await as("postgres");
    await db.exec(
      `alter table candidate_profiles disable trigger validate_candidate;update candidate_profiles set expires_at=now()-interval '1 second' where id='${person}';alter table candidate_profiles enable trigger validate_candidate;`,
    );
    await as("anon");
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(0);
    await as("authenticated", owner);
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(1);
  });
  it("makes service-only reminder claims idempotent and marks one renewal cycle sent", async () => {
    await as("postgres");
    await db.exec(
      `alter table candidate_profiles disable trigger validate_candidate;update candidate_profiles set expires_at=now()+interval '4 days',status='active',reminder_sent_at=null where id='${person}';alter table candidate_profiles enable trigger validate_candidate;`,
    );
    await as("anon");
    await expect(
      db.exec("select * from claim_reminders(10)"),
    ).rejects.toThrow();
    await as("service_role");
    const first = await db.query<{ delivery_id: string }>(
      "select * from claim_reminders(10)",
    );
    expect(first.rows).toHaveLength(1);
    expect(
      (await db.query("select * from claim_reminders(10)")).rows,
    ).toHaveLength(0);
    await db.query("select complete_reminder($1)", [first.rows[0].delivery_id]);
    await db.query("select complete_reminder($1)", [first.rows[0].delivery_id]);
    expect(
      (await db.query("select * from claim_reminders(10)")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ reminder_sent_at: string | null }>(
          "select reminder_sent_at from candidate_profiles",
        )
      ).rows[0].reminder_sent_at,
    ).toBeTruthy();
  });
  it("enforces service-only rate limits and retention without manual moderation", async () => {
    await as("authenticated", owner);
    await expect(
      db.exec("select consume_limit('x','report',2)"),
    ).rejects.toThrow();
    await as("service_role");
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select consume_limit('x','report',2) as ok",
        )
      ).rows[0].ok,
    ).toBe(true);
    await db.exec("select consume_limit('x','report',2)");
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select consume_limit('x','report',2) as ok",
        )
      ).rows[0].ok,
    ).toBe(false);
    await as("postgres");
    await db.exec(
      `alter table candidate_profiles disable trigger validate_candidate;update candidate_profiles set expires_at=now()-interval '31 days' where id='${person}';alter table candidate_profiles enable trigger validate_candidate;alter table hiring_roles disable trigger validate_role;update hiring_roles set status='closed',closed_at=now()-interval '31 days' where id='${role}';alter table hiring_roles enable trigger validate_role;`,
    );
    await as("service_role");
    await db.exec("select retention_cleanup()");
    expect(
      (await db.query("select * from candidate_profiles")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from hiring_roles")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from reminder_deliveries")).rows,
    ).toHaveLength(0);
  });
});
