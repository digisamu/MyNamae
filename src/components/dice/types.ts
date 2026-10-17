import type { FaceLabel } from "@/features/formatting/formatName";
import type { CultureId } from "@/types/names";

export interface SceneDie {
  culture: CultureId;
  /** Six labels, in face order. */
  faces: readonly FaceLabel[];
  /** Face that must end up on top. */
  targetFace: number;
}

export interface DiceViewProps {
  dice: readonly SceneDie[];
  /** Changes for every roll; null while showing idle preview dice. */
  rollId: number | null;
  /** Identifies the current set of faces; settled reports are tagged with it. */
  sceneKey: string;
  startedAt: number;
  duration: number;
  reducedMotion: boolean;
  /** Reports the face actually showing on top of each die once everything has settled. */
  onSettled: (sceneKey: string, visibleFaces: number[]) => void;
}
