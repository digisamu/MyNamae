import { Quaternion, Vector3 } from "three";

/** Outward normals of BoxGeometry's six material groups, in group order (+X, −X, +Y, −Y, +Z, −Z). */
export const FACE_NORMALS: readonly Vector3[] = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
];

/** Direction of increasing texture v (the top of a face label) for each face, in local space. */
export const FACE_TEXT_UP: readonly Vector3[] = [
  new Vector3(0, 1, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, 0, -1),
  new Vector3(0, 0, 1),
  new Vector3(0, 1, 0),
  new Vector3(0, 1, 0),
];

const WORLD_UP = new Vector3(0, 1, 0);
const AWAY_FROM_CAMERA = Math.PI; // azimuth of −Z, measured from +Z towards +X

/**
 * Orientation that puts `face` on top with its label reading upright for a camera in front of the dice.
 * `yawJitter` (radians) adds a slight natural twist without changing which face is up.
 */
export function faceUpQuaternion(face: number, yawJitter = 0): Quaternion {
  const normal = FACE_NORMALS[face];
  if (!normal) throw new RangeError(`face must be 0–5, got ${face}`);
  const tilt = new Quaternion().setFromUnitVectors(normal, WORLD_UP);
  const textUp = FACE_TEXT_UP[face]!.clone().applyQuaternion(tilt);
  const yaw = AWAY_FROM_CAMERA - Math.atan2(textUp.x, textUp.z) + yawJitter;
  return new Quaternion().setFromAxisAngle(WORLD_UP, yaw).multiply(tilt);
}

/** Which face currently points up, read back from an actual orientation. */
export function topFace(orientation: Quaternion): number {
  let best = 0;
  let bestY = -Infinity;
  FACE_NORMALS.forEach((normal, i) => {
    const y = normal.clone().applyQuaternion(orientation).y;
    if (y > bestY) {
      bestY = y;
      best = i;
    }
  });
  return best;
}
