import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("public pages and contribution routes are paused without source data in HTML or metadata", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/about",
    "/?view=posts",
    "/?view=roles",
    "/add/person",
    "/add/role",
    "/add/post",
    "/add/post?edit=10000000-0000-4000-8000-000000000001",
    "/published?kind=candidate&slug=fictional",
    "/renew?t=invalid",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Public directory paused." }),
    ).toBeVisible();
    await expect(
      page.locator(".person-result,.listing-card,.post-form"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Add someone", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Publish|Share post|Add someone/ }),
    ).toHaveCount(0);
    expect(await page.content()).not.toMatch(
      /fictional-demo-|Jamie Example|Alex Morgan|lnkd\.in\/p\//,
    );
  }
  for (const path of [
    "/people/alex-morgan-demo",
    "/roles/northstar-product-designer-demo",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    expect(await page.content()).not.toContain("Alex Morgan");
  }
});
test("owner sign-in/removal entry point and privacy information remain reachable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Manage my data", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("status")).toContainText("paused");
});
for (const width of [375, 768, 1440])
  test(`privacy hold is accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations.map((v) => v.id)).toEqual([]);
  });
