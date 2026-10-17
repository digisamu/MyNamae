import { describe, expect, it } from "vitest";
import { createSeededRandom, pickOne, randomInt, shuffle } from "./index";

describe("random utilities", () => {
  it("is reproducible for a given seed", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("randomInt stays in range even when the source returns 1", () => {
    expect(randomInt(() => 0.999999, 6)).toBe(5);
    expect(randomInt(() => 1, 6)).toBe(5);
    expect(randomInt(() => 0, 6)).toBe(0);
  });

  it("randomInt rejects invalid bounds", () => {
    expect(() => randomInt(Math.random, 0)).toThrow(RangeError);
    expect(() => randomInt(Math.random, 2.5)).toThrow(RangeError);
  });

  it("pickOne handles empty inventories safely", () => {
    expect(pickOne(Math.random, [])).toBeUndefined();
  });

  it("can select every element", () => {
    const rng = createSeededRandom(7);
    const items = ["a", "b", "c", "d", "e"];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickOne(rng, items)!);
    expect(seen.size).toBe(items.length);
  });

  it("shuffle returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(createSeededRandom(3), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });
});
