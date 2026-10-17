import { Quaternion, Vector3 } from "three";

/*
 * Roll choreography, as pure functions of time so the 3D scene and the tests share one implementation.
 *
 *   anticipation → flight (arc, tumble, three diminishing bounces) → staggered settle (last die wobbles)
 *
 * Every die's pose at or after its end time is exactly its target orientation, so the face that ends up
 * on top is always the predetermined one — including when the roll is fast-forwarded (t = Infinity).
 */

export interface Timeline {
  reduced: boolean;
  /** Shared wind-up before the throw, in ms. */
  anticipation: number;
  /** Per-die settle time in ms from the start; strictly increasing so dice never settle together. */
  ends: number[];
  /** When the last die has settled. */
  total: number;
}

export interface ThrowParams {
  /** 1 for a button roll; higher after a charged hold or a fast flick (clamped to 0.8–1.7). */
  power: number;
  /** Horizontal throw direction in world space (x right, z towards the camera). */
  dirX: number;
  dirZ: number;
}

export const BUTTON_THROW: ThrowParams = { power: 1, dirX: 0.35, dirZ: -1 };

export function clampPower(power: number): number {
  return Math.min(1.7, Math.max(0.8, power));
}

export function createTimeline(count: number, reduced: boolean, power = 1): Timeline {
  if (reduced) {
    const ends = Array.from({ length: count }, (_, i) => 320 + i * 90);
    return { reduced, anticipation: 0, ends, total: ends.at(-1)! };
  }
  const anticipation = 230;
  const flight = 1100 * (1 + (clampPower(power) - 1) * 0.12);
  const ends = Array.from({ length: count }, (_, i) => Math.round(anticipation + flight + i * 320));
  return { reduced, anticipation, ends, total: ends.at(-1)! };
}

export interface DieMotion {
  axis: Vector3;
  spin: number;
  height: number;
  windup: Vector3;
  overshoot: Vector3;
  wobble: boolean;
  wobbleAxis: Vector3;
}

/** Randomised, per-die motion. Each die gets its own axis and spin speed so they never move in sync. */
export function createDieMotion(
  index: number,
  count: number,
  throwParams: ThrowParams,
  reduced: boolean,
  random: () => number,
): DieMotion {
  const power = clampPower(throwParams.power);
  const len = Math.hypot(throwParams.dirX, throwParams.dirZ) || 1;
  const dx = throwParams.dirX / len;
  const dz = throwParams.dirZ / len;
  const wobbleAngle = random() * Math.PI * 2;
  return {
    axis: new Vector3(random() - 0.5, 0.35 + random() * 0.4, random() - 0.5).normalize(),
    spin: Math.PI * (3 + random() * 1.4 + index * 0.55) * Math.sqrt(power),
    height: (0.9 + random() * 0.3) * power,
    windup: new Vector3(-dx * 0.35, 0, -dz * 0.3),
    overshoot: new Vector3(dx * (0.35 + random() * 0.3) * power, 0, dz * (0.25 + random() * 0.2) * power),
    wobble: !reduced && index === count - 1,
    wobbleAxis: new Vector3(Math.cos(wobbleAngle), 0, Math.sin(wobbleAngle)),
  };
}

export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
  /** Vertical scale for the impact squash (1 = none). */
  squash: number;
}

export type PosePhase = "anticipation" | "flight" | "settled";

export interface SampleArgs {
  motion: DieMotion;
  timeline: Timeline;
  index: number;
  /** Milliseconds since the roll started; Infinity fast-forwards to the end. */
  t: number;
  rest: Vector3;
  fromPosition: Vector3;
  fromQuaternion: Quaternion;
  target: Quaternion;
}

const LIFT = 0.28;
const TILT = -0.35;
const X_AXIS = new Vector3(1, 0, 0);
const _tilt = new Quaternion();
const _spin = new Quaternion();
const _wobble = new Quaternion();
const _start = new Quaternion();
const _p0 = new Vector3();

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** Bounce instants (fraction of the flight) and their relative strength. */
export const IMPACTS: readonly { at: number; strength: number }[] = [
  { at: 1 / 3, strength: (2 / 3) ** 1.5 },
  { at: 2 / 3, strength: (1 / 3) ** 1.5 },
  { at: 1, strength: 0.12 },
];

/** Flight progress (0–1) of one die at time t; negative during anticipation. */
export function flightProgress(timeline: Timeline, index: number, t: number): number {
  const end = timeline.ends[index]!;
  if (t >= end) return 1;
  return (t - timeline.anticipation) / (end - timeline.anticipation);
}

/** Impacts crossed between two flight-progress samples, for sounds and ink ripples. */
export function impactsBetween(previous: number, current: number): { at: number; strength: number }[] {
  return IMPACTS.filter((i) => previous < i.at && current >= i.at);
}

/** Writes the pose of one die at time t into `out` without allocating. */
export function samplePose(out: Pose, a: SampleArgs): PosePhase {
  const end = a.timeline.ends[a.index]!;
  if (a.t >= end) {
    out.position.copy(a.rest);
    out.quaternion.copy(a.target);
    out.squash = 1;
    return "settled";
  }
  const t = Math.max(0, a.t);

  if (a.timeline.reduced) {
    const u = t / end;
    out.position.copy(a.fromPosition).lerp(a.rest, smooth(u));
    out.quaternion.copy(a.fromQuaternion).slerp(a.target, easeInOut(u));
    out.squash = 1;
    return "flight";
  }

  const A = a.timeline.anticipation;
  if (t < A) {
    const k = easeOutCubic(t / A);
    out.position.copy(a.fromPosition).addScaledVector(a.motion.windup, k);
    out.position.y += LIFT * k;
    out.quaternion.copy(_tilt.setFromAxisAngle(X_AXIS, TILT * k)).multiply(a.fromQuaternion);
    out.squash = 1;
    return "anticipation";
  }

  const u = (t - A) / (end - A);
  _p0.copy(a.fromPosition).add(a.motion.windup);
  _p0.y += LIFT;

  // Horizontal: from the wind-up spot to rest, with a sideways overshoot in the throw direction.
  const travel = easeOutCubic(Math.min(1, u * 1.6));
  const sway = Math.sin(Math.PI * u) * (1 - u);
  out.position.x = _p0.x + (a.rest.x - _p0.x) * travel + a.motion.overshoot.x * sway;
  out.position.z = _p0.z + (a.rest.z - _p0.z) * travel + a.motion.overshoot.z * sway;
  // Vertical: three decaying hops touching the floor at u = 1/3, 2/3 and 1.
  const hop = a.motion.height * (1 - u) ** 1.5 * Math.abs(Math.sin(Math.PI * 3 * u));
  out.position.y = a.rest.y + (_p0.y - a.rest.y) * (1 - smooth(u / 0.15)) + hop;

  // Tumble that unwinds exactly onto the target orientation.
  _spin.setFromAxisAngle(a.motion.axis, a.motion.spin * (1 - easeOutCubic(u))).multiply(a.target);
  if (a.motion.wobble && u > 0.72) {
    // Rock on an edge before dropping onto the predetermined face.
    const v = (u - 0.72) / 0.28;
    const angle = 0.42 * (1 - v) ** 2 * Math.cos(v * Math.PI * 3.5) * smooth(v / 0.12);
    _spin.premultiply(_wobble.setFromAxisAngle(a.motion.wobbleAxis, angle));
  }
  _start.copy(_tilt.setFromAxisAngle(X_AXIS, TILT)).multiply(a.fromQuaternion);
  out.quaternion.copy(_start).slerp(_spin, smooth(u / 0.12));

  out.squash = 1;
  for (const impact of IMPACTS) {
    const d = Math.abs(u - impact.at);
    if (d < 0.035) out.squash = Math.min(out.squash, 1 - 0.13 * impact.strength * (1 - d / 0.035));
  }
  return "flight";
}
