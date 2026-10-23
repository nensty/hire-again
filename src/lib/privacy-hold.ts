// A deliberate release hold, not a runtime setting that can accidentally be
// enabled in production. Reopening requires a reviewed code/database change.
export function privacyHoldActive() {
  return true;
}
export const PRIVACY_HOLD_MESSAGE =
  "Publication is paused while privacy and consent are reviewed. You can still hide or delete your own listings.";
