import { generateName } from "@/features/generation/generate";
import { createSeededRandom } from "@/lib/random";
import type { KeyValueStorage } from "@/lib/storage/safeStorage";

/** Test helpers: an in-memory storage that records writes, and reproducible results. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  const writes: string[] = [];
  const storage: KeyValueStorage = {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      writes.push(k);
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
  return { storage, data, writes };
}

export function sampleResult(seed = 1) {
  const res = generateName({ dice: ["turkic", "japanese"], mode: "creative" }, { rng: createSeededRandom(seed), createId: () => `r${seed}` });
  if (!res.ok) throw new Error("generation failed");
  return res.outcome.result;
}
