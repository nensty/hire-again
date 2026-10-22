import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("find the supplied engineering manager post in seconds and preserve a shareable search", async ({
  page,
}) => {
  await page.goto("/?view=posts");
  await expect(
    page.getByRole("button", { name: "Posts 8", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".post-card")).toHaveCount(8);
  await page.getByRole("searchbox").fill("Aleksandra manager");
  await expect(page.locator(".post-card")).toHaveCount(1);
  await expect(
    page.locator(".post-card").getByRole("link", { name: "Read on LinkedIn" }),
  ).toHaveAttribute("href", "https://lnkd.in/p/dft8SFe5");
  await expect(page).toHaveURL(/view=posts.*q=Aleksandra/);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("Aleksandra manager");
  await expect(page.locator(".post-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Looking for work", exact: true })
    .click();
  await expect(page.locator(".post-card")).toHaveCount(7);
  await page.getByRole("button", { name: "Community", exact: true }).click();
  await expect(page.locator(".post-card")).toHaveCount(1);
  await expect(page.locator(".post-card a").first()).toHaveAttribute(
    "href",
    "https://lnkd.in/p/dc8K-GpP",
  );
});
test("shows simple filters first and reveals only relevant post filters", async ({
  page,
}) => {
  await page.goto("/?view=posts");
  await page
    .getByRole("combobox", { name: "Function", exact: true })
    .selectOption("qa-automation");
  await expect(page.locator(".post-card")).toHaveCount(2);
  await expect(page.getByLabel("Seniority", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Skills", { exact: true })
    .fill("SDET");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Show 1 result/ })
    .click();
  await expect(page.locator(".post-card")).toHaveCount(1);
  await expect(page.locator(".post-card")).toContainText("Dmitry Zakutalin");
});
test("paste a list, review names and roles, and remove a mistaken entry before sharing", async ({
  page,
}) => {
  await page.goto("/add/post");
  await expect(
    page.getByLabel("LinkedIn post link", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Paste a list", exact: true }).click();
  await page
    .getByLabel("Posts or comments")
    .fill(
      "Alex Example - Engineering Manager  https://lnkd.in/p/test-first\n\nPavel Example - Backend Engineer (Python)  https://lnkd.in/p/test-second",
    );
  await page.getByRole("button", { name: "Review posts" }).click();
  await expect(page.locator(".import-row")).toHaveCount(2);
  await expect(page.getByLabel("Person / team name").first()).toHaveValue(
    "Alex Example",
  );
  await expect(page.getByLabel("Role", { exact: true }).last()).toHaveValue(
    "Backend Engineer (Python)",
  );
  await page
    .getByRole("button", { name: "Remove from this list" })
    .first()
    .click();
  await expect(page.locator(".import-row")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Share 1 post" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Sharing is disabled in the fictional preview."),
  ).toBeVisible();
});
for (const width of [375, 430, 768, 1440])
  test(`posts are readable and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/?view=posts");
    await expect(page.locator(".post-card")).toHaveCount(8);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/posts-${width}.png`,
      fullPage: true,
    });
  });
