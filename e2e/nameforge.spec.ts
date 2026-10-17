import { expect, test, type Page } from "@playwright/test";

async function rollAndWait(page: Page) {
  await page.getByTestId("roll-button").click();
  await expect(page.getByTestId("dice-arena")).toHaveAttribute("data-phase", "revealed", { timeout: 10_000 });
  // Every die must report the face it actually settled on.
  const dice = page.locator('[data-testid^="die-status-"]');
  const count = await dice.count();
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId(`die-status-${i}`)).toHaveAttribute("data-settled", "true");
  }
  return count;
}

/** The result card must list exactly the components showing on top of the dice, in dice order. */
async function expectResultMatchesDice(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const shown = await page.getByTestId(`die-status-${i}`).getAttribute("data-component-id");
    expect(shown).toBeTruthy();
    await expect(page.getByTestId(`result-component-${i}`)).toHaveAttribute("data-component-id", shown!);
  }
  await expect(page.locator('[data-testid^="result-component-"]')).toHaveCount(count);
}

/** Reaches a single-culture configuration through the culture cards. */
async function selectOnly(page: Page, culture: "turkic" | "arabic" | "japanese") {
  const card = (c: string) => page.getByTestId(`culture-card-${c}`);
  if ((await card(culture).getAttribute("aria-pressed")) !== "true") await card(culture).click();
  for (const other of ["turkic", "arabic", "japanese"].filter((c) => c !== culture)) {
    if ((await card(other).getAttribute("aria-pressed")) === "true") await card(other).click();
  }
  await expect(card(culture)).toHaveAttribute("aria-pressed", "true");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("opens in English by default @mobile", async ({ page }) => {
  await expect(page).toHaveTitle(/NameForge/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Roll the Dice.");
  await expect(page.getByTestId("roll-button")).toBeVisible();
  // No horizontal overflow at any viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("switches the interface language", async ({ page }) => {
  const header = page.getByRole("banner");
  await header.getByRole("radio", { name: "RU" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Бросьте кости.");
  await expect(page.getByTestId("roll-button")).toHaveText(/Бросить кости/);

  await header.getByRole("radio", { name: "日本語" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("サイコロを振って");
});

test("selecting a single culture assigns it to both dice, and rolling matches the dice", async ({ page }) => {
  await selectOnly(page, "japanese");
  await expect(page.getByTestId("die-select-0")).toHaveValue("japanese");
  await expect(page.getByTestId("die-select-1")).toHaveValue("japanese");
  await expect(page.locator('[data-testid^="die-select-"]')).toHaveCount(2);

  const count = await rollAndWait(page);
  expect(count).toBe(2);
  await expectResultMatchesDice(page, count);
  await expect(page.getByTestId("result-name-primary")).not.toBeEmpty();
  await expect(page.getByTestId("announcement")).toContainText("Die 1:");
});

test("a mixed-culture name uses only English Latin letters", async ({ page }) => {
  await page.getByRole("button", { name: "Use Turkic + Arabic + Japanese" }).click();
  await expect(page.locator('[data-testid^="die-select-"]')).toHaveCount(3);

  for (let i = 0; i < 3; i++) {
    const count = await rollAndWait(page);
    await expectResultMatchesDice(page, count);
    const name = await page.getByTestId("result-name-primary").textContent();
    expect(name).toMatch(/^[A-Za-z]+(?:['-][A-Za-z]+)*$/);
    await expect(page.getByTestId("result-name-secondary")).toHaveCount(0);
  }
});

test("saves and removes a favorite", async ({ page }) => {
  await rollAndWait(page);
  const name = (await page.getByTestId("result-name-primary").textContent())!;
  const toggle = page.getByTestId("favorite-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("tab-favorites").click();
  const favorites = page.getByTestId("favorites-list");
  await expect(favorites.getByTestId("saved-item")).toHaveCount(1);
  await expect(favorites).toContainText(name);

  await favorites.getByTestId("saved-favorite").click();
  await expect(page.getByText("Save a name you love")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("keeps preferences, configuration and history after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Use Arabic + Japanese" }).click();
  await page.getByTestId("motion-setting").getByRole("radio", { name: "Reduced" }).click();
  await rollAndWait(page);
  await page.getByRole("banner").getByRole("radio", { name: "RU" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Бросьте кости.");
  await expect(page.getByTestId("die-select-0")).toHaveValue("arabic");
  await expect(page.getByTestId("die-select-1")).toHaveValue("japanese");
  await expect(page.getByTestId("motion-setting").getByRole("radio", { name: "Уменьшенная" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByTestId("recent-list").getByTestId("saved-item")).toHaveCount(1);
});

test("clearing history asks for confirmation", async ({ page }) => {
  await rollAndWait(page);
  await page.getByRole("button", { name: "Clear history" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("recent-list").getByTestId("saved-item")).toHaveCount(1);

  await page.getByRole("button", { name: "Clear history" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear history" }).click();
  await expect(page.getByText("Your recent rolls will appear here.")).toBeVisible();
});

test("mobile menu reaches every section @mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Favorites" }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator("#favorites")).toBeInViewport();
  await rollAndWait(page);
});
