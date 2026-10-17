import { CULTURE_IDS, type CultureId } from "@/types/names";
import { MAX_DICE, MIN_DICE } from "@/types/generation";

export type ConfigIssue =
  | "too-few-dice"
  | "too-many-dice"
  | "unknown-culture"
  | "single-culture-needs-two-dice";

export type ConfigValidation = { ok: true } | { ok: false; issue: ConfigIssue };

export function isCultureId(value: unknown): value is CultureId {
  return typeof value === "string" && (CULTURE_IDS as readonly string[]).includes(value);
}

export function validateDiceConfig(dice: readonly unknown[]): ConfigValidation {
  if (dice.length < MIN_DICE) return { ok: false, issue: "too-few-dice" };
  if (dice.length > MAX_DICE) return { ok: false, issue: "too-many-dice" };
  if (!dice.every(isCultureId)) return { ok: false, issue: "unknown-culture" };
  // A single-culture name is always exactly two dice.
  if (new Set(dice).size === 1 && dice.length !== 2) {
    return { ok: false, issue: "single-culture-needs-two-dice" };
  }
  return { ok: true };
}

export function uniqueCultures(dice: readonly CultureId[]): CultureId[] {
  return [...new Set(dice)];
}

export function isCrossCultural(dice: readonly CultureId[]): boolean {
  return new Set(dice).size > 1;
}

/**
 * Maps a set of selected cultures to dice: one culture → two dice of that culture; two or three
 * cultures → one die each. Keeps the existing order when the selection still matches it.
 */
export function diceForCultures(
  selected: readonly CultureId[],
  current: readonly CultureId[] = [],
): CultureId[] {
  const unique = uniqueCultures(selected);
  if (unique.length === 0) return [...current];
  if (unique.length === 1) return [unique[0]!, unique[0]!];
  const currentUnique = uniqueCultures(current);
  const sameSelection =
    currentUnique.length === unique.length && unique.every((c) => currentUnique.includes(c));
  if (sameSelection && validateDiceConfig(current).ok) return [...current];
  const ordered = [
    ...currentUnique.filter((c) => unique.includes(c)),
    ...unique.filter((c) => !currentUnique.includes(c)),
  ];
  return ordered;
}
