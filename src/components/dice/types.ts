import type { FaceLabel } from "@/features/formatting/formatName";
import type { CultureId } from "@/types/names";
import type { ThrowParams, Timeline } from "./choreography";

export interface SceneDie {
  culture: CultureId;
  /** Six labels, in face order. */
  faces: readonly FaceLabel[];
  /** Changes only when the painted labels change, so textures are not repainted needlessly. */
  facesKey: string;
  /** Face that must end up on top. */
  targetFace: number;
  /** Locked dice stay exactly where they are during a reroll. */
  locked: boolean;
}

/** Position within the arena as fractions of its width and height. */
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface DiceViewProps {
  dice: readonly SceneDie[];
  /** Changes for every roll; null while showing idle preview dice. */
  rollId: number | null;
  /** Identifies the current set of faces; settled reports are tagged with it. */
  sceneKey: string;
  startedAt: number;
  timeline: Timeline | null;
  throwParams: ThrowParams;
  fastForwarded: boolean;
  charging: boolean;
  reducedMotion: boolean;
  /** Reports the face actually showing on top of each die, and where each die is, once all have settled. */
  onSettled: (sceneKey: string, visibleFaces: number[], points: ScreenPoint[]) => void;
  /** A bounce, with strength 0–1 (for sound). */
  onImpact?: (strength: number) => void;
}
