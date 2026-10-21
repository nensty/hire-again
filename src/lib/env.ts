export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}
export const isDemo = () =>
  process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return new URL(raw).origin;
  if (process.env.NODE_ENV === "production")
    throw new Error("NEXT_PUBLIC_SITE_URL must be set.");
  return "http://localhost:3000";
}
