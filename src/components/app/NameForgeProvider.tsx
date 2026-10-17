"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { diceForCultures, validateDiceConfig, type ConfigIssue } from "@/features/generation/config";
import { generateName, signatureOf } from "@/features/generation/generate";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { formatList, translate, type Locale, type MessageKey, type MessageVars } from "@/features/localization/i18n";
import { FAVORITES_LIMIT, HISTORY_LIMIT, type MotionPreference, type PersistedState } from "@/features/persistence/schema";
import { appStore, type StoreStatus } from "@/features/persistence/store";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { GenerationMode, NameResult, RollOutcome } from "@/types/generation";
import type { CultureId } from "@/types/names";

export type RollPhase = "idle" | "rolling" | "revealed";

export interface ActiveRoll {
  id: number;
  outcome: RollOutcome;
  startedAt: number;
  duration: number;
  phase: Exclude<RollPhase, "idle">;
}

type Translate = (key: MessageKey, vars?: MessageVars) => string;

interface NameForgeContextValue {
  hydrated: boolean;
  state: PersistedState;
  storage: StoreStatus;
  locale: Locale;
  t: Translate;
  cultureName: (id: CultureId) => string;
  listCultures: (ids: readonly CultureId[]) => string;
  setLocale: (locale: Locale) => void;
  setDice: (dice: CultureId[]) => void;
  setSelectedCultures: (cultures: CultureId[]) => void;
  setMode: (mode: GenerationMode) => void;
  setMotion: (motion: MotionPreference) => void;
  setDice3d: (enabled: boolean) => void;
  reducedMotion: boolean;
  configIssue: ConfigIssue | null;
  roll: (override?: { dice: readonly CultureId[]; mode: GenerationMode }) => void;
  activeRoll: ActiveRoll | null;
  phase: RollPhase;
  currentResult: NameResult | null;
  error: MessageKey | null;
  announcement: string;
  isFavorite: (result: NameResult) => boolean;
  toggleFavorite: (result: NameResult) => void;
  clearHistory: () => void;
  clearFavorites: () => void;
}

const NameForgeContext = createContext<NameForgeContextValue | null>(null);

const ROLL_MS = 1900;
const REDUCED_ROLL_MS = 450;

const signature = (r: NameResult) => signatureOf(r.components.map((c) => c.componentId));

const subscribeHydration = () => () => {};

export function NameForgeProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const storage = hydrated ? appStore.getStatus() : { available: true, recovered: false };
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { locale } = state;
  const { motion } = state.preferences;
  const reducedMotion = motion === "reduced" || (motion === "system" && systemReduced);

  const [activeRoll, setActiveRoll] = useState<ActiveRoll | null>(null);
  const [currentResult, setCurrentResult] = useState<NameResult | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const rollingRef = useRef(false);
  const rollCounter = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full";
  }, [reducedMotion]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale]);
  const cultureName = useCallback((id: CultureId) => translate(locale, `cultures.${id}.name`), [locale]);
  const listCultures = useCallback(
    (ids: readonly CultureId[]) => formatList(locale, [...new Set(ids)].map(cultureName)),
    [locale, cultureName],
  );

  const update = appStore.update;

  const setLocale = useCallback((next: Locale) => update((s) => ({ ...s, locale: next })), [update]);
  const setDice = useCallback(
    (dice: CultureId[]) => {
      setError(null);
      update((s) => ({ ...s, dice }));
    },
    [update],
  );
  const setSelectedCultures = useCallback(
    (cultures: CultureId[]) => {
      setError(null);
      update((s) => ({ ...s, dice: diceForCultures(cultures, s.dice) }));
    },
    [update],
  );
  const setMode = useCallback(
    (mode: GenerationMode) => update((s) => ({ ...s, preferences: { ...s.preferences, mode } })),
    [update],
  );
  const setMotion = useCallback(
    (m: MotionPreference) => update((s) => ({ ...s, preferences: { ...s.preferences, motion: m } })),
    [update],
  );
  const setDice3d = useCallback(
    (dice3d: boolean) => update((s) => ({ ...s, preferences: { ...s.preferences, dice3d } })),
    [update],
  );

  const validation = validateDiceConfig(state.dice);
  const configIssue = validation.ok ? null : validation.issue;

  const roll = useCallback<NameForgeContextValue["roll"]>(
    (override) => {
      // Overlapping rolls are ignored until the dice settle.
      if (rollingRef.current) return;
      const snapshot = appStore.getSnapshot();
      const dice = override?.dice ?? snapshot.dice;
      const mode = override?.mode ?? snapshot.preferences.mode;
      if (override) update((s) => ({ ...s, dice: [...dice], preferences: { ...s.preferences, mode } }));

      const avoid = new Set(snapshot.history.slice(0, 10).map(signature));
      const res = generateName({ dice, mode }, { avoid });
      if (!res.ok) {
        setError(`errors.${res.reason}`);
        return;
      }
      setError(null);
      rollingRef.current = true;
      const id = ++rollCounter.current;
      const duration = reducedMotion ? REDUCED_ROLL_MS : ROLL_MS;
      setActiveRoll({ id, outcome: res.outcome, startedAt: performance.now(), duration, phase: "rolling" });

      // The reveal is driven by a timer, not by animation frames, so it also completes in a background tab.
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        rollingRef.current = false;
        const result = res.outcome.result;
        setActiveRoll((r) => (r && r.id === id ? { ...r, phase: "revealed" } : r));
        setCurrentResult(result);
        update((s) => ({
          ...s,
          history: [result, ...s.history.filter((h) => h.id !== result.id)].slice(0, HISTORY_LIMIT),
        }));
      }, duration + 120);
    },
    [reducedMotion, update],
  );

  // Live-region text for the revealed result; recomputed (and re-announced) when the language changes.
  const announcement = useMemo(() => {
    const formatted = currentResult ? formatGeneratedName(currentResult) : null;
    if (!formatted) return "";
    const dice = formatted.components
      .map((c, i) =>
        translate(locale, "result.announceDie", {
          n: i + 1,
          component: c.label,
          culture: translate(locale, `cultures.${c.culture}.name`),
        }),
      )
      .join(" ");
    return translate(locale, "result.announce", { name: formatted.primaryText, dice });
  }, [currentResult, locale]);

  const favoriteSignatures = useMemo(() => new Set(state.favorites.map(signature)), [state.favorites]);
  const isFavorite = useCallback((r: NameResult) => favoriteSignatures.has(signature(r)), [favoriteSignatures]);
  const toggleFavorite = useCallback(
    (r: NameResult) =>
      update((s) => {
        const sig = signature(r);
        const exists = s.favorites.some((f) => signature(f) === sig);
        return {
          ...s,
          favorites: exists
            ? s.favorites.filter((f) => signature(f) !== sig)
            : [r, ...s.favorites].slice(0, FAVORITES_LIMIT),
        };
      }),
    [update],
  );
  const clearHistory = useCallback(() => update((s) => ({ ...s, history: [] })), [update]);
  const clearFavorites = useCallback(() => update((s) => ({ ...s, favorites: [] })), [update]);

  const phase: RollPhase = activeRoll?.phase ?? "idle";

  const value: NameForgeContextValue = {
    hydrated,
    state,
    storage,
    locale,
    t,
    cultureName,
    listCultures,
    setLocale,
    setDice,
    setSelectedCultures,
    setMode,
    setMotion,
    setDice3d,
    reducedMotion,
    configIssue,
    roll,
    activeRoll,
    phase,
    currentResult,
    error,
    announcement,
    isFavorite,
    toggleFavorite,
    clearHistory,
    clearFavorites,
  };

  return <NameForgeContext.Provider value={value}>{children}</NameForgeContext.Provider>;
}

export function useNameForge(): NameForgeContextValue {
  const ctx = useContext(NameForgeContext);
  if (!ctx) throw new Error("useNameForge must be used inside <NameForgeProvider>");
  return ctx;
}
