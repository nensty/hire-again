import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
const payloadSchema = z.object({
  kind: z.enum(["candidate", "role"]),
  id: z.uuid(),
  version: z.iso.datetime({ offset: true }),
  until: z.number(),
});
export type RenewalPayload = z.infer<typeof payloadSchema>;
function signature(content: string, secret: string) {
  return createHmac("sha256", secret).update(content).digest("base64url");
}
export function makeToken(payload: RenewalPayload, secret: string) {
  if (secret.length < 32)
    throw new Error("CRON_SECRET must contain at least 32 characters.");
  const content = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${content}.${signature(content, secret)}`;
}
export function verifyToken(
  token: string,
  secret: string,
  now = Date.now(),
): RenewalPayload | null {
  try {
    if (secret.length < 32 || token.length > 1000) return null;
    const [content, sig, ...extra] = token.split(".");
    if (!content || !sig || extra.length) return null;
    const expected = signature(content, secret);
    const a = Buffer.from(sig),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = payloadSchema.parse(
      JSON.parse(Buffer.from(content, "base64url").toString()),
    );
    return payload.until > now ? payload : null;
  } catch {
    return null;
  }
}
