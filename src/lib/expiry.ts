export const DAY = 86400000;
export function isPublic(
  listing: { status: string; expires_at: string },
  now = Date.now(),
) {
  return (
    listing.status === "active" && new Date(listing.expires_at).getTime() > now
  );
}
export function reminderDue(
  listing: {
    status: string;
    expires_at: string;
    reminder_sent_at: string | null;
  },
  now = Date.now(),
) {
  const expiry = Date.parse(listing.expires_at);
  return (
    isPublic(listing, now) &&
    expiry <= now + 5 * DAY &&
    !listing.reminder_sent_at
  );
}
export function renewalExpiry(now = Date.now()) {
  return new Date(now + 30 * DAY).toISOString();
}
