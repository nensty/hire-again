import { z } from "zod";
import { FUNCTIONS, SENIORITIES, REGIONS, WORK_MODES } from "./constants";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Please fill this in.")
    .max(max, `Use ${max} characters or fewer.`);
export function normalizeUrl(value: string) {
  const s = value.trim();
  const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !url.hostname.includes(".") ||
    url.port
  )
    throw new Error("Use a public HTTPS link.");
  url.hash = "";
  return url.toString();
}
const url = z
  .string()
  .trim()
  .max(2048)
  .transform((s, ctx) => {
    try {
      return normalizeUrl(s);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid public HTTPS link.",
      });
      return z.NEVER;
    }
  });
const linkedIn = url.refine((s) => {
  const u = new URL(s);
  return u.hostname === "linkedin.com" || u.hostname === "www.linkedin.com";
}, "Use a linkedin.com link.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => s || null);
const optionalUrl = (linkedin = false) =>
  z
    .union([z.literal(""), linkedin ? linkedIn : url])
    .nullish()
    .transform((s) => s || null);
const shared = {
  function: z.enum(FUNCTIONS),
  seniority: z.enum(SENIORITIES),
  location: text(120),
  regions: z
    .array(z.enum(REGIONS))
    .min(1, "Choose at least one region.")
    .max(REGIONS.length)
    .transform((a) => [...new Set(a)]),
  work_modes: z
    .array(z.enum(WORK_MODES))
    .min(1, "Choose at least one work mode.")
    .max(WORK_MODES.length)
    .transform((a) => [...new Set(a)]),
  skills: z
    .array(text(40))
    .min(1, "Add at least one skill.")
    .max(10, "Use up to 10 skills.")
    .transform((a) => [
      ...new Map(a.map((s) => [s.toLowerCase(), s])).values(),
    ]),
  note: optionalText(240),
  consent: z.literal(true, { error: "Please confirm before publishing." }),
};
export const candidateSchema = z.object({
  ...shared,
  full_name: text(100),
  linkedin_url: linkedIn,
  target_role: text(120),
  pandadoc_role: optionalText(120),
  relocation: z.boolean(),
  open_to_work_post_url: optionalUrl(true),
});
export const roleSchema = z.object({
  ...shared,
  company_name: text(100),
  contact_name: text(100),
  role_title: text(120),
  vacancy_url: url,
  company_website: optionalUrl(),
  contact_linkedin_url: optionalUrl(true),
  visa_support: optionalText(160),
  hiring_post_url: optionalUrl(true),
});
export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  next: z.string().optional(),
});
export const reportSchema = z.object({
  entity_type: z.enum(["candidate", "role", "post"]),
  entity_id: z.uuid(),
  reason: z.enum([
    "Outdated or filled",
    "Misleading information",
    "Spam or scam",
    "Privacy concern",
    "Other",
  ]),
});
export function formValues(form: FormData) {
  return {
    ...Object.fromEntries(form),
    regions: form.getAll("regions"),
    work_modes: form.getAll("work_modes"),
    skills: String(form.get("skills") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    consent: form.get("consent") === "on",
    relocation: form.get("relocation") === "on",
  };
}
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || /[\\\s]/.test(next))
    return "/manage";
  try {
    const url = new URL(next, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/login")
    )
      return "/manage";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/manage";
  }
}
