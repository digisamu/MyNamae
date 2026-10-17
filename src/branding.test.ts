import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, messagesByLocale } from "@/features/localization/i18n";

const ROOT = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("MyNamae branding", () => {
  it.each(LOCALES)("%s messages never mention the old name and keep the brand untranslated", (locale) => {
    const text = JSON.stringify(messagesByLocale[locale]);
    expect(text).not.toMatch(/name\s*forge/i);
    expect(text).toContain("MyNamae");
  });

  it("source, tests, README and public assets contain no leftover NameForge naming", () => {
    // The legacy storage key is the single intentional reference, kept to migrate old data.
    const allowed = join(ROOT, "src/features/persistence/migration.ts");
    const scanned = [
      ...files(join(ROOT, "src")),
      ...files(join(ROOT, "e2e")),
      ...files(join(ROOT, "public")),
      join(ROOT, "README.md"),
      join(ROOT, "package.json"),
    ].filter((f) => f !== allowed && f !== __filename);
    const offenders = scanned.filter((f) => /name\s*forge/i.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    expect(readFileSync(allowed, "utf8")).toContain('"nameforge:state"');
  });
});
