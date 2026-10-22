export function SpamTrap() {
  return (
    <div hidden aria-hidden="true">
      <label>
        Leave empty
        <input name="website_confirm" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
