export const FUNCTIONS = [
  "Engineering",
  "QA / Automation",
  "DevOps / SRE",
  "Product",
  "Design",
  "Data",
  "Marketing",
  "Sales",
  "Customer Success",
  "People / Operations",
  "Finance / Legal",
  "Other",
] as const;
export const SENIORITIES = [
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Staff / Principal",
  "Manager",
  "Director+",
  "Flexible",
] as const;
export const REGIONS = [
  "Worldwide",
  "Europe",
  "EU / EEA",
  "UK",
  "US / Canada",
  "Latin America",
  "APAC",
  "Other",
] as const;
export const WORK_MODES = ["Remote", "Hybrid", "On-site", "Flexible"] as const;
export type EntityType = "candidate" | "role";
export const ENTITY_TABLE = {
  candidate: "candidate_profiles",
  role: "hiring_roles",
} as const;
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "listing";
export const optionKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*\/\s*/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
