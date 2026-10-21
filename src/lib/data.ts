import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { publicConfig, isDemo } from "./env";
import { isPublic } from "./expiry";
import type { Candidate, Role, DirectoryData } from "./types";
import { demoPeople, demoRoles } from "./demo";
const shared =
  "id,slug,function,seniority,location,regions,work_modes,skills,note,status,expires_at,created_at,updated_at,reminder_sent_at,closed_at";
export const CANDIDATE_COLUMNS =
  shared +
  ",full_name,linkedin_url,pandadoc_role,target_role,relocation,open_to_work_post_url";
export const ROLE_COLUMNS =
  shared +
  ",company_name,company_website,contact_name,contact_linkedin_url,role_title,vacancy_url,hiring_post_url,visa_support";
const cachedDirectory = unstable_cache(
  async () => {
    const c = publicConfig();
    if (!c) return { people: [], roles: [] };
    const client = createClient(c.url, c.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    async function read(table: string, columns: string) {
      const rows: unknown[] = [];
      const now = new Date().toISOString();
      for (let start = 0; ; start += 1000) {
        const { data, error } = await client
          .from(table)
          .select(columns)
          .eq("status", "active")
          .gt("expires_at", now)
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + 999);
        if (error) throw new Error("Directory unavailable");
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    }
    const [people, roles] = await Promise.all([
      read("candidate_profiles", CANDIDATE_COLUMNS),
      read("hiring_roles", ROLE_COLUMNS),
    ]);
    return { people: people as Candidate[], roles: roles as Role[] };
  },
  ["public-directory-v1"],
  { revalidate: 60, tags: ["directory"] },
);
export async function getDirectory(): Promise<DirectoryData> {
  const asOf = Date.now();
  if (isDemo())
    return {
      asOf,
      people: demoPeople.filter((l) => isPublic(l)),
      roles: demoRoles.filter((l) => isPublic(l)),
      demo: true,
      configured: false,
      unavailable: false,
    };
  if (!publicConfig())
    return {
      asOf,
      people: [],
      roles: [],
      demo: false,
      configured: false,
      unavailable: false,
    };
  try {
    const d = await cachedDirectory();
    return {
      asOf,
      people: d.people.filter((l) => isPublic(l)),
      roles: d.roles.filter((l) => isPublic(l)),
      demo: false,
      configured: true,
      unavailable: false,
    };
  } catch {
    return {
      asOf,
      people: [],
      roles: [],
      demo: false,
      configured: true,
      unavailable: true,
    };
  }
}
