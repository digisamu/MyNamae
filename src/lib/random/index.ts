/** Returns a float in [0, 1). Injectable so tests never depend on uncontrolled randomness. */
export type RandomSource = () => number;

export const defaultRandom: RandomSource = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0]! / 2 ** 32;
  }
  return Math.random();
};

/** Small, fast deterministic generator (mulberry32) for tests and reproducible rolls. */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: RandomSource, maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`randomInt needs a positive integer bound, got ${maxExclusive}`);
  }
  const value = Math.floor(rng() * maxExclusive);
  // Guard against sources that return exactly 1.
  return Math.min(value, maxExclusive - 1);
}

export function pickOne<T>(rng: RandomSource, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(rng, items.length)];
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(rng: RandomSource, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
