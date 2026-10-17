import { expect, test, type Page } from "@playwright/test";

async function rollAndWait(page: Page, trigger?: () => Promise<void>) {
  await (trigger ? trigger() : page.getByTestId("roll-button").click());
  await expect(page.getByTestId("dice-arena")).toHaveAttribute("data-phase", "revealed", { timeout: 10_000 });
  const count = await page.locator('[data-testid^="die-status-"]').count();
  // Every die must report the face it actually settled on.
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

async function decide(page: Page, choice: "accept" | "reject") {
  await page.getByTestId(choice === "accept" ? "consent-accept" : "consent-reject").click();
  await expect(page.getByTestId("consent-banner")).toHaveCount(0);
}

async function selectOnly(page: Page, culture: "turkic" | "arabic" | "japanese") {
  const card = (c: string) => page.getByTestId(`culture-card-${c}`);
  if ((await card(culture).getAttribute("aria-pressed")) !== "true") await card(culture).click();
  for (const other of ["turkic", "arabic", "japanese"].filter((c) => c !== culture)) {
    if ((await card(other).getAttribute("aria-pressed")) === "true") await card(other).click();
  }
  await expect(card(culture)).toHaveAttribute("aria-pressed", "true");
}

const storageKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage));

test.describe("first visit and consent", () => {
  test("shows the banner; rejecting keeps the app fully usable with session-only names @mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MyNamae/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Roll the Dice.");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    for (const action of ["consent-accept", "consent-reject", "consent-customize"]) {
      await expect(banner.getByTestId(action)).toBeVisible();
    }
    // The previous product name must not appear anywhere on the rendered page.
    await expect(page.locator("body")).not.toContainText(new RegExp(["name", "forge"].join(""), "i"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await decide(page, "reject");
    const count = await rollAndWait(page);
    await expectResultMatchesDice(page, count);
    await page.getByTestId("favorite-toggle").click();
    await expect(page.getByTestId("session-only-note")).toBeVisible();
    await page.getByTestId("tab-favorites").click();
    await expect(page.getByTestId("favorites-list").getByTestId("saved-item")).toHaveCount(1);
    // Nothing functional was written without consent.
    expect(await storageKeys(page)).toEqual([]);

    await page.reload();
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    await expect(page.getByTestId("tab-favorites")).toContainText("0");
  });

  test("the banner never hides the Roll button on mobile @mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await expect(page.getByTestId("consent-banner")).toBeVisible();
    const button = page.getByTestId("roll-button");
    await button.scrollIntoViewIfNeeded();
    const covered = await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(hit && el.contains(hit));
    });
    expect(covered).toBe(false);
    await rollAndWait(page);
  });

  test("Customize: enabling Functional storage keeps a favorite after reload", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("consent-customize").click();
    const dialog = page.getByTestId("cookie-settings");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("consent-toggle-necessary")).toBeDisabled();
    await expect(dialog.getByTestId("consent-toggle-functional")).toHaveAttribute("aria-checked", "false");
    await expect(dialog.getByTestId("consent-toggle-analytics")).toHaveCount(0); // no provider configured
    await expect(dialog.getByRole("table")).toContainText("mynamae_consent");
    await dialog.getByTestId("consent-toggle-functional").click();
    await dialog.getByTestId("consent-save").click();
    await expect(dialog).toBeHidden();

    await rollAndWait(page);
    const name = (await page.getByTestId("result-name-primary").textContent())!;
    await page.getByTestId("favorite-toggle").click();
    expect(await storageKeys(page)).toContain("mynamae:state");

    await page.reload();
    await page.getByTestId("tab-favorites").click();
    await expect(page.getByTestId("favorites-list")).toContainText(name);
    await expect(page.getByTestId("session-only-note")).toHaveCount(0);
  });

  test("withdrawing Functional consent deletes saved data after confirmation", async ({ page }) => {
    await page.goto("/");
    await decide(page, "accept");
    await rollAndWait(page);
    await page.getByTestId("favorite-toggle").click();
    expect(await storageKeys(page)).toContain("mynamae:state");

    await page.getByTestId("footer-cookie-settings").click();
    await page.getByTestId("cookie-settings").getByRole("button", { name: "Reject non-essential" }).click();
    const confirm = page.getByRole("dialog", { name: "Delete saved names?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Delete and save" }).click();
    await expect.poll(() => storageKeys(page)).toEqual([]);
    // The current session still has its names.
    await page.getByTestId("tab-favorites").click();
    await expect(page.getByTestId("favorites-list").getByTestId("saved-item")).toHaveCount(1);
  });

  test("a new policy version asks for consent again", async ({ page, context }) => {
    const decidedAt = Date.now().toString(36);
    await context.addCookies([{ name: "mynamae_consent", value: `v1.f1.a0.t${decidedAt}`, url: "http://localhost:3218" }]);
    await page.goto("/");
    await expect(page.getByTestId("consent-banner")).toHaveCount(0);
    await context.addCookies([{ name: "mynamae_consent", value: `v0.f1.a0.t${decidedAt}`, url: "http://localhost:3218" }]);
    await page.reload();
    await expect(page.getByTestId("consent-banner")).toBeVisible();
  });

  test("reopens cookie settings from the footer, with focus returning to the link", async ({ page }) => {
    await page.goto("/");
    await decide(page, "reject");
    const link = page.getByTestId("footer-cookie-settings");
    await link.click();
    const dialog = page.getByTestId("cookie-settings");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("consent-toggle-functional")).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(link).toBeFocused();

    await page.getByTestId("footer-privacy").click();
    await expect(page.getByTestId("privacy-dialog")).toContainText("Only in your browser");
  });
});

test.describe("language", () => {
  test("switching language and reloading renders the right language on first paint", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await header.getByRole("radio", { name: "RU" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Бросьте кости.");
    await expect(page.getByTestId("consent-banner")).toContainText("Принять все");

    // The server HTML itself is Russian: no flash of English before hydration.
    const html = await (await page.request.get("/")).text();
    expect(html).toContain('<html lang="ru"');
    expect(html).toContain("Бросьте кости.");
    expect(html).not.toContain("Roll the Dice.");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await header.getByRole("radio", { name: "日本語" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("サイコロを振って");
  });
});

test.describe("rolling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await decide(page, "reject");
  });

  test("a single culture assigns both dice, and the result matches the dice", async ({ page }) => {
    await selectOnly(page, "japanese");
    await expect(page.getByTestId("die-select-0")).toHaveValue("japanese");
    await expect(page.getByTestId("die-select-1")).toHaveValue("japanese");
    const count = await rollAndWait(page);
    expect(count).toBe(2);
    await expectResultMatchesDice(page, count);
    await expect(page.getByTestId("announcement")).toContainText("Die 1:");
  });

  test("rolls with the keyboard shortcut on the focused arena", async ({ page }) => {
    const arena = page.getByTestId("dice-arena");
    await expect(arena).toHaveAttribute("aria-describedby", /.+/);
    const count = await rollAndWait(page, async () => {
      await arena.focus();
      await page.keyboard.press("Space");
    });
    await expectResultMatchesDice(page, count);
    await rollAndWait(page, () => page.keyboard.press("Enter"));
  });

  test("tapping during a roll fast-forwards to the same settled outcome", async ({ page }) => {
    await page.getByTestId("roll-button").click();
    const arena = page.getByTestId("dice-arena");
    await expect(arena).toHaveAttribute("data-phase", "rolling");
    await page.mouse.click(5, 300);
    await expect(arena).toHaveAttribute("data-fast-forwarded", "true");
    const count = await rollAndWait(page, async () => {});
    await expectResultMatchesDice(page, count);
  });

  test("reduced motion still shows the generated outcome", async ({ page }) => {
    await page.getByTestId("motion-setting").getByRole("radio", { name: "Reduced" }).click();
    const count = await rollAndWait(page);
    await expectResultMatchesDice(page, count);
  });

  test("a mixed-culture name uses only English Latin letters", async ({ page }) => {
    await page.getByRole("button", { name: "Use Turkic + Arabic + Japanese" }).click();
    for (let i = 0; i < 3; i++) {
      const count = await rollAndWait(page);
      await expectResultMatchesDice(page, count);
      const name = await page.getByTestId("result-name-primary").textContent();
      expect(name).toMatch(/^[A-Za-z]+(?:['-][A-Za-z]+)*$/);
      await expect(page.getByTestId("result-name-secondary")).toHaveCount(0);
    }
  });

  test("locks a die and rerolls only the others", async ({ page }) => {
    await page.getByRole("button", { name: "Use Turkic + Japanese" }).click();
    await rollAndWait(page);
    const kept = await page.getByTestId("die-status-0").getAttribute("data-component-id");
    await page.getByTestId("result-lock-0").click();
    await expect(page.getByTestId("die-lock-0")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("roll-button")).toHaveText(/Reroll unlocked dice/);
    for (let i = 0; i < 3; i++) {
      const count = await rollAndWait(page);
      await expectResultMatchesDice(page, count);
      await expect(page.getByTestId("die-status-0")).toHaveAttribute("data-component-id", kept!);
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
    await expect(favorites).toContainText(name);
    await favorites.getByTestId("saved-favorite").click();
    await expect(page.getByText("Save a name you love")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("clearing history asks for confirmation", async ({ page }) => {
    await rollAndWait(page);
    await page.getByRole("button", { name: "Clear history" }).click();
    const dialog = page.getByRole("dialog");
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
    await menu.getByRole("link", { name: "Favorites" }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#favorites")).toBeInViewport();
  });
});

test.describe("sharing", () => {
  test("a copied link restores the same result card", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await decide(page, "reject");
    await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await rollAndWait(page);
    const name = (await page.getByTestId("result-name-primary").textContent())!;
    await page.getByTestId("share-link").click();
    await expect(page.getByText("Link copied to clipboard")).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toMatch(/\/\?r=[a-z0-9.-]+&m=[ec]$/);

    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByTestId("result-name-primary")).toHaveText(name);
  });

  test("downloads the result card as a PNG", async ({ page }) => {
    await page.goto("/?r=tr-ay.tr-xan&m=e");
    await expect(page.getByTestId("result-name-primary")).toHaveText("Ayxan");
    await decide(page, "reject");
    const download = page.waitForEvent("download");
    await page.getByTestId("download-card").click();
    expect((await download).suggestedFilename()).toBe("mynamae-ay-xan.png");
  });
});
