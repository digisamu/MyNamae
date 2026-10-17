import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { generateName } from "@/features/generation/generate";
import { createSeededRandom } from "@/lib/random";
import {
  BUTTON_THROW,
  createDieMotion,
  createTimeline,
  flightProgress,
  impactsBetween,
  samplePose,
  type Pose,
} from "./choreography";
import { faceUpQuaternion, topFace } from "./orientation";

const pose = (): Pose => ({ position: new Vector3(), quaternion: new Quaternion(), squash: 1 });

function settle(face: number, t: number, opts: { reduced?: boolean; index?: number; count?: number; seed?: number } = {}) {
  const count = opts.count ?? 3;
  const index = opts.index ?? count - 1;
  const timeline = createTimeline(count, opts.reduced ?? false, 1.4);
  const rng = createSeededRandom(opts.seed ?? face + 1);
  const motion = createDieMotion(index, count, { power: 1.4, dirX: -0.6, dirZ: 0.8 }, opts.reduced ?? false, rng);
  const rest = new Vector3(1.5, 0.5, 0);
  const out = pose();
  const phase = samplePose(out, {
    motion,
    timeline,
    index,
    t: typeof t === "number" && t < 0 ? timeline.ends[index]! : t,
    rest,
    fromPosition: new Vector3(0.2, 0.5, 0.3),
    fromQuaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 1.1),
    target: faceUpQuaternion(face, 0.2),
  });
  return { out, phase, rest, timeline };
}

describe("roll choreography", () => {
  it("keeps normal rolls within about 2–3 seconds and staggers every settle", () => {
    for (const count of [2, 3]) {
      const tl = createTimeline(count, false);
      expect(tl.total).toBeGreaterThan(1400);
      expect(tl.total).toBeLessThan(2600);
      for (let i = 1; i < count; i++) expect(tl.ends[i]!).toBeGreaterThan(tl.ends[i - 1]! + 200);
    }
  });

  it("uses a short fade-and-settle with reduced motion", () => {
    const tl = createTimeline(3, true);
    expect(tl.anticipation).toBe(0);
    expect(tl.total).toBeLessThan(600);
  });

  it.each([0, 1, 2, 3, 4, 5])("lands exactly on face %i at its end time", (face) => {
    const { out, phase, rest } = settle(face, -1);
    expect(phase).toBe("settled");
    expect(topFace(out.quaternion)).toBe(face);
    expect(out.position.distanceTo(rest)).toBeLessThan(1e-9);
    expect(out.squash).toBe(1);
  });

  it.each([0, 1, 2, 3, 4, 5])("fast-forwarding (t = Infinity) shows face %i", (face) => {
    const { out, phase } = settle(face, Infinity);
    expect(phase).toBe("settled");
    expect(topFace(out.quaternion)).toBe(face);
  });

  it.each([0, 1, 2, 3, 4, 5])("reduced motion also lands on face %i", (face) => {
    const { out, phase } = settle(face, Infinity, { reduced: true });
    expect(phase).toBe("settled");
    expect(topFace(out.quaternion)).toBe(face);
    const mid = settle(face, 100, { reduced: true });
    expect(mid.out.squash).toBe(1);
  });

  it("is continuous with the starting pose and goes through anticipation, flight and settle", () => {
    const start = settle(2, 0);
    expect(start.phase).toBe("anticipation");
    expect(start.out.position.distanceTo(new Vector3(0.2, 0.5, 0.3))).toBeLessThan(1e-9);
    expect(settle(2, 600).phase).toBe("flight");
    // The die is airborne mid-flight and squashes on impact.
    const tl = createTimeline(3, false, 1.4);
    const flightAt = (u: number) => tl.anticipation + u * (tl.ends[2]! - tl.anticipation);
    expect(settle(2, flightAt(1 / 6)).out.position.y).toBeGreaterThan(0.8);
    expect(settle(2, flightAt(1 / 3)).out.squash).toBeLessThan(1);
  });

  it("reports each bounce once as progress advances", () => {
    expect(impactsBetween(0.3, 0.34).map((i) => i.at)).toEqual([1 / 3]);
    expect(impactsBetween(0.5, 1).length).toBe(2);
    expect(impactsBetween(0.4, 0.5)).toEqual([]);
    const strengths = impactsBetween(0, 1).map((i) => i.strength);
    expect(strengths[0]!).toBeGreaterThan(strengths[1]!);
  });

  it("gives every die a distinct spin so they never move in sync", () => {
    const rng = createSeededRandom(3);
    const spins = [0, 1, 2].map((i) => createDieMotion(i, 3, BUTTON_THROW, false, rng).spin);
    expect(new Set(spins).size).toBe(3);
  });

  it("matches generated outcomes end to end", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const res = generateName({ dice: ["turkic", "arabic", "japanese"], mode: "creative" }, { rng: createSeededRandom(seed) });
      if (!res.ok) throw new Error("generation failed");
      const timeline = createTimeline(3, false);
      res.outcome.dice.forEach((die, index) => {
        const out = pose();
        samplePose(out, {
          motion: createDieMotion(index, 3, BUTTON_THROW, false, createSeededRandom(seed * 7 + index)),
          timeline,
          index,
          t: timeline.ends[index]! + 5,
          rest: new Vector3(index, 0.5, 0),
          fromPosition: new Vector3(index, 0.5, 0),
          fromQuaternion: new Quaternion(),
          target: faceUpQuaternion(die.faceIndex, 0.1),
        });
        expect(die.faces[topFace(out.quaternion)]).toBe(res.outcome.result.components[index]!.componentId);
      });
    }
  });

  it("flight progress is 1 after the end and negative during anticipation", () => {
    const tl = createTimeline(2, false);
    expect(flightProgress(tl, 0, 10)).toBeLessThan(0);
    expect(flightProgress(tl, 1, tl.total + 1)).toBe(1);
  });
});
