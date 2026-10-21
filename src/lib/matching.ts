import { isPublic } from "./expiry";
import type { Candidate, Role } from "./types";
const level: Record<string, number> = {
  Junior: 0,
  "Mid-level": 1,
  Senior: 2,
  Lead: 3,
  "Staff / Principal": 3,
  Manager: 4,
  "Director+": 5,
};
export function match(candidate: Candidate, role: Role) {
  let score = 0;
  const reasons: string[] = [];
  if (candidate.function !== role.function)
    return { score: 0, label: "Potential fit", reasons: [] };
  score += 4;
  const seniority =
    candidate.seniority === "Flexible" ||
    role.seniority === "Flexible" ||
    candidate.seniority === role.seniority ||
    Math.abs(level[candidate.seniority] - level[role.seniority]) === 1;
  if (seniority) {
    score += 2;
    reasons.push("Seniority");
  }
  const overlap = candidate.skills.filter((s) =>
    role.skills.some((t) => t.toLowerCase() === s.toLowerCase()),
  );
  score += Math.min(overlap.length, 3) * 2;
  reasons.unshift(...overlap.slice(0, 2));
  const region =
    candidate.regions.includes("Worldwide") ||
    role.regions.includes("Worldwide") ||
    candidate.regions.some((r) => role.regions.includes(r)) ||
    (candidate.regions.some((r) => ["Europe", "EU / EEA", "UK"].includes(r)) &&
      role.regions.includes("Europe")) ||
    (candidate.regions.includes("Europe") &&
      role.regions.some((r) => ["EU / EEA", "UK"].includes(r)));
  const mode =
    candidate.work_modes.includes("Flexible") ||
    role.work_modes.includes("Flexible") ||
    candidate.work_modes.some((w) => role.work_modes.includes(w));
  if (region) {
    score += 2;
    reasons.push("Region");
  }
  if (mode) {
    score += 2;
    reasons.push(
      candidate.work_modes.includes("Remote") &&
        role.work_modes.includes("Remote")
        ? "Remote"
        : "Work mode",
    );
  }
  return {
    score: region && mode ? score : 0,
    label: score >= 12 ? "Strong overlap" : "Potential fit",
    reasons,
  };
}
export function matchingRoles(c: Candidate, roles: Role[]) {
  return roles
    .filter((r) => isPublic(r))
    .map((item) => ({ item, ...match(c, item) }))
    .filter((m) => m.score >= 8)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, 6);
}
export function matchingPeople(r: Role, people: Candidate[]) {
  return people
    .filter((p) => isPublic(p))
    .map((item) => ({ item, ...match(item, r) }))
    .filter((m) => m.score >= 8)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, 6);
}
