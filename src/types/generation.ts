import type { CultureId } from "./names";

export type GenerationMode = "established" | "creative";

export const MIN_DICE = 2;
export const MAX_DICE = 3;
export const FACES_PER_DIE = 6;

export interface DiceConfig {
  /** Culture assigned to each die, in order. */
  dice: readonly CultureId[];
}

export interface ResultComponent {
  culture: CultureId;
  componentId: string;
}

export type ResultExplanation =
  | "established"
  | "creative"
  /** A creative roll that happens to spell a curated name. */
  | "creative-matched"
  /** Established mode was requested for a mixed configuration; curated names are single-culture. */
  | "established-unavailable-mixed";

export interface NameResult {
  id: string;
  createdAt: number;
  mode: GenerationMode;
  requestedMode: GenerationMode;
  dice: readonly CultureId[];
  /** One per die, in dice order. */
  components: readonly ResultComponent[];
  cultures: readonly CultureId[];
  curatedNameId?: string;
  /** Snapshot of the formatted primary text at generation time. */
  displayName: string;
  explanation: ResultExplanation;
}

export interface DieOutcome {
  index: number;
  culture: CultureId;
  componentId: string;
  /** Six component ids painted on the die faces. */
  faces: readonly string[];
  /** Which face (0–5) carries the selected component. */
  faceIndex: number;
}

export interface RollOutcome {
  result: NameResult;
  dice: readonly DieOutcome[];
}
