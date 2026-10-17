import { BoxGeometry, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createRoundedBoxGeometry } from "./roundedBox";
import { FACE_NORMALS, FACE_TEXT_UP, faceUpQuaternion, topFace } from "./orientation";

/** Measures, for one material group, the local direction in which the uv v-coordinate increases. */
function measuredTextUp(geometry: BoxGeometry, group: number): Vector3 {
  const { start, count } = geometry.groups[group]!;
  const index = geometry.index!;
  const pos = geometry.attributes.position!;
  const uv = geometry.attributes.uv!;
  let low: Vector3 | null = null;
  let high: Vector3 | null = null;
  let lowV = Infinity;
  let highV = -Infinity;
  for (let i = start; i < start + count; i++) {
    const vi = index.getX(i);
    const v = uv.getY(vi);
    const p = new Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
    if (uv.getX(vi) !== 0) continue;
    if (v < lowV) [lowV, low] = [v, p];
    if (v > highV) [highV, high] = [v, p];
  }
  return high!.sub(low!).normalize();
}

describe("dice orientation", () => {
  it("text-up table matches three.js BoxGeometry uv layout", () => {
    const geometry = new BoxGeometry(1, 1, 1);
    for (let face = 0; face < 6; face++) {
      expect(measuredTextUp(geometry, face).distanceTo(FACE_TEXT_UP[face]!)).toBeLessThan(1e-6);
    }
  });

  it("rounded geometry keeps the six face groups", () => {
    const geometry = createRoundedBoxGeometry(1, 0.14, 4);
    expect(geometry.groups).toHaveLength(6);
  });

  it.each([0, 1, 2, 3, 4, 5])("face %i ends up on top with its label facing the camera", (face) => {
    for (const jitter of [0, 0.15, -0.2]) {
      const q = faceUpQuaternion(face, jitter);
      expect(topFace(q)).toBe(face);
      expect(FACE_NORMALS[face]!.clone().applyQuaternion(q).y).toBeCloseTo(1, 6);
      if (jitter === 0) {
        const up = FACE_TEXT_UP[face]!.clone().applyQuaternion(q);
        expect(up.z).toBeCloseTo(-1, 6);
      }
    }
  });

  it("reads back the top face of arbitrary orientations", () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    // Rotating +90° about X maps −Z onto +Y.
    expect(topFace(q)).toBe(5);
  });
});
