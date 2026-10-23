import { test, expect } from "@playwright/test";
test("people search and shareable filters work without reloading", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good people.",
  );
  await expect(
    page.getByText("Self-published profiles and hiring teams are fictional.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".person-result")).toHaveCount(13);
  await page.getByRole("searchbox").fill("typescript");
  await expect(page.locator(".person-result")).toHaveCount(2);
  await expect(page).toHaveURL(/q=typescript/);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("typescript");
  await expect(page.locator(".person-result")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".person-result")).toHaveCount(13);
  await page.getByRole("searchbox").fill("nothing like this");
  await expect(page.getByText("No matches just yet.")).toBeVisible();
  expect(errors).toEqual([]);
});
test("simple people navigation and existing profile recommendations work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Directory view" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Hiring now", exact: true }),
  ).toHaveCount(0);
  await page.goto("/?view=roles");
  await expect(page.locator(".role-card")).toHaveCount(3);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Find people" })
    .click();
  await expect(page.locator(".person-result")).toHaveCount(13);
  await page.goto("/people/alex-morgan-demo");
  await expect(
    page.getByRole("heading", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Teams that may be a fit" }),
  ).toBeVisible();
  await expect(page.getByText("Strong overlap")).toBeVisible();
  await page.getByRole("link", { name: "View role", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People who may be a fit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View vacancy" }),
  ).toHaveAttribute("href", "https://example.com/");
});
test("sign-in and invalid-link states stay calm", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("fictional@example.invalid");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("isn’t connected yet");
  await page.goto("/auth/callback?code=invalid");
  await expect(page).toHaveURL(/auth\/error/);
  await expect(
    page.getByRole("heading", { name: "Let’s try a fresh link." }),
  ).toBeVisible();
  await page.goto("/manage");
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("development forms include required consent and safe limits", async ({
  page,
}) => {
  await page.goto("/add/person");
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish my profile" }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("I currently work or previously worked at PandaDoc", {
      exact: false,
    }),
  ).toHaveAttribute("required", "");
  await expect(page.getByLabel("A short note")).toHaveAttribute(
    "maxlength",
    "240",
  );
  await page.goto("/add/role");
  await expect(page.getByLabel("Vacancy URL")).toBeVisible();
  await expect(
    page.getByLabel("This is a genuine opportunity", { exact: false }),
  ).toBeVisible();
});
test("missing listings, legal pages, secured cron, and renewal errors", async ({
  page,
  request,
}) => {
  const r = await page.goto("/people/no-such-person");
  expect(r?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "A new chapter, perhaps." }),
  ).toBeVisible();
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Retention", exact: true }),
  ).toBeVisible();
  await page.goto("/about");
  await expect(
    page
      .getByText(
        "Independent community initiative. Not affiliated with or endorsed by PandaDoc.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page.goto("/renew?t=invalid");
  await expect(
    page.getByRole("heading", { name: "Let’s start fresh." }),
  ).toBeVisible();
  expect((await request.get("/api/cron")).status()).toBe(401);
});
for (const width of [375, 430, 768, 1440])
  test(`responsive directory at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("combobox", { name: "Specialty" })
      .selectOption("qa-automation");
    await expect(page.locator(".person-result")).toHaveCount(3);
    await expect(page).toHaveURL(/function=qa-automation/);
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Specialty" })).toHaveValue(
      "qa-automation",
    );
    await page.screenshot({
      path: `test-results/directory-${width}.png`,
      fullPage: true,
    });
    await page.goto("/?view=roles");
    await expect(
      page.getByRole("heading", { name: "Find your next team." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "vacancy list",
    ).toBe(true);
  });

test("key pages have no automated WCAG AA violations or mobile overflow", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.setViewportSize({ width: 375, height: 900 });
  for (const [name, path] of [
    ["home", "/"],
    ["about", "/about"],
    ["add-post", "/add/post"],
    ["hiring", "/?view=roles"],
    ["profile", "/people/alex-morgan-demo"],
    ["role", "/roles/northstar-product-designer-demo"],
    ["login", "/login"],
    ["add-person", "/add/person"],
    ["add-role", "/add/role"],
    ["manage", "/manage"],
  ] as const) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      name,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/${name}-mobile.png`,
      fullPage: true,
    });
  }
});
