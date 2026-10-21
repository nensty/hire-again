import type { PublicListing } from "./types";
import { isCandidate } from "./types";
import { optionKey } from "./constants";
export interface Filters {
  view: "people" | "roles";
  q: string;
  function: string;
  seniority: string;
  skills: string;
  regions: string[];
  workModes: string[];
}
export const EMPTY_FILTERS: Filters = {
  view: "people",
  q: "",
  function: "",
  seniority: "",
  skills: "",
  regions: [],
  workModes: [],
};
export function readFilters(params: URLSearchParams): Filters {
  return {
    view: params.get("view") === "roles" ? "roles" : "people",
    q: (params.get("q") || "").slice(0, 200),
    function: params.get("function") || "",
    seniority: params.get("seniority") || "",
    skills: (params.get("skills") || "").slice(0, 200),
    regions: params.getAll("region"),
    workModes: params.getAll("work-mode"),
  };
}
export function writeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.view === "roles") p.set("view", "roles");
  for (const k of ["q", "function", "seniority", "skills"] as const)
    if (f[k]) p.set(k, f[k]);
  f.regions.forEach((r) => p.append("region", r));
  f.workModes.forEach((w) => p.append("work-mode", w));
  return p.toString();
}
export function filterListings<T extends PublicListing>(
  listings: T[],
  f: Filters,
): T[] {
  const terms = f.q.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const skills = f.skills
    .toLocaleLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return listings.filter((l) => {
    const haystack = [
      isCandidate(l) ? l.full_name : l.company_name,
      isCandidate(l) ? l.target_role : l.role_title,
      isCandidate(l) ? l.pandadoc_role : l.contact_name,
      l.location,
      l.function,
      l.seniority,
      ...l.skills,
      ...l.regions,
      ...l.work_modes,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      terms.every((t) => haystack.includes(t)) &&
      (!f.function || optionKey(l.function) === f.function) &&
      (!f.seniority || optionKey(l.seniority) === f.seniority) &&
      skills.every((s) => l.skills.some((k) => k.toLowerCase().includes(s))) &&
      (!f.regions.length ||
        l.regions.some(
          (r) =>
            r === "Worldwide" ||
            f.regions.includes("worldwide") ||
            f.regions.includes(optionKey(r)),
        )) &&
      (!f.workModes.length ||
        l.work_modes.some(
          (w) =>
            w === "Flexible" ||
            f.workModes.includes("flexible") ||
            f.workModes.includes(optionKey(w)),
        ))
    );
  });
}
