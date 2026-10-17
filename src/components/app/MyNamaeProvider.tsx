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
import { BUTTON_THROW, createTimeline, type ThrowParams, type Timeline } from "@/components/dice/choreography";
import { consentStore, localeStore } from "@/features/consent/clientStores";
import type { ConsentChoices, ConsentRecord } from "@/features/consent/config";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { diceForCultures, validateDiceConfig, type ConfigIssue } from "@/features/generation/config";
import { generateName } from "@/features/generation/generate";
import { formatList, translate, type Locale, type MessageKey, type MessageVars } from "@/features/localization/i18n";
import {
  FAVORITES_LIMIT,
  HISTORY_LIMIT,
  resultSignature,
  type MotionPreference,
  type NameStyle,
  type PersistedState,
} from "@/features/persistence/schema";
import { appStore, type StoreStatus } from "@/features/persistence/store";
import { rollForResult } from "@/features/share/shareLink";
import { playStamp, unlockAudio } from "@/features/sound/soundEngine";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { DieOutcome, GenerationMode, NameResult, RollOutcome } from "@/types/generation";
import type { CultureId } from "@/types/names";
import { useShakeToRoll } from "./useShakeToRoll";

export type RollPhase = "idle" | "rolling" | "revealed";

export interface ActiveRoll {
  id: number;
  outcome: RollOutcome;
  startedAt: number;
  timeline: Timeline;
  throwParams: ThrowParams;
  phase: Exclude<RollPhase, "idle">;
  /** The user tapped to skip; the dice snap to their settled faces. */
  fastForwarded: boolean;
  source: "roll" | "shared";
  /** Dice indexes kept from the previous roll (they do not move). */
  lockedIndexes: readonly number[];
}

export interface RollOptions {
  dice?: readonly CultureId[];
  mode?: GenerationMode;
  throwParams?: ThrowParams;
  /** Regenerating from history starts fresh, without the current locks. */
  ignoreLocks?: boolean;
}

type Translate = (key: MessageKey, vars?: MessageVars) => string;

interface MyNamaeContextValue {
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
  setSound: (enabled: boolean) => void;
  setShake: (enabled: boolean) => void;
  setStyle: (style: NameStyle) => void;
  reducedMotion: boolean;
  configIssue: ConfigIssue | null;
  roll: (options?: RollOptions) => void;
  fastForward: () => void;
  charging: boolean;
  setCharging: (charging: boolean) => void;
  activeRoll: ActiveRoll | null;
  phase: RollPhase;
  currentResult: NameResult | null;
  error: MessageKey | null;
  announcement: string;
  locks: readonly number[];
  toggleLock: (index: number) => void;
  isFavorite: (result: NameResult) => boolean;
  toggleFavorite: (result: NameResult) => void;
  clearHistory: () => void;
  clearFavorites: () => void;
  consent: ConsentRecord | null;
  functionalAllowed: boolean;
  saveConsent: (choices: ConsentChoices) => void;
  pendingConsent: ConsentChoices | null;
  resolvePendingConsent: (confirmed: boolean) => void;
  cookieSettingsOpen: boolean;
  setCookieSettingsOpen: (open: boolean) => void;
  privacyOpen: boolean;
  setPrivacyOpen: (open: boolean) => void;
}

const MyNamaeContext = createContext<MyNamaeContextValue | null>(null);

/** Pause after the last die settles while its components travel into the result card. */
const REVEAL_DELAY_MS = 380;
const REDUCED_REVEAL_DELAY_MS = 80;
const FAST_FORWARD_REVEAL_MS = 140;

const subscribeHydration = () => () => {};

interface ProviderProps {
  children: ReactNode;
  initialLocale: Locale;
  initialConsent: ConsentRecord | null;
  initialShared: NameResult | null;
}

export function MyNamaeProvider({ children, initialLocale, initialConsent, initialShared }: ProviderProps) {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getServerSnapshot);
  const locale = useSyncExternalStore(localeStore.subscribe, localeStore.getSnapshot, () => initialLocale);
  const consent = useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, () => initialConsent);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const storage = hydrated ? appStore.getStatus() : { available: true, recovered: false, persisting: false };
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { motion } = state.preferences;
  const reducedMotion = motion === "reduced" || (motion === "system" && systemReduced);
  const functionalAllowed = consent?.functional === true;

  const [activeRoll, setActiveRoll] = useState<ActiveRoll | null>(() =>
    initialShared
      ? {
          id: 0,
          outcome: rollForResult(initialShared),
          startedAt: 0,
          timeline: createTimeline(initialShared.dice.length, true),
          throwParams: BUTTON_THROW,
          phase: "revealed",
          fastForwarded: true,
          source: "shared",
          lockedIndexes: [],
        }
      : null,
  );
  const [currentResult, setCurrentResult] = useState<NameResult | null>(initialShared);
  const [error, setError] = useState<MessageKey | null>(null);
  const [locks, setLocks] = useState<readonly number[]>([]);
  const [charging, setCharging] = useState(false);
  const [pendingConsent, setPendingConsent] = useState<ConsentChoices | null>(null);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const rollingRef = useRef(false);
  const rollCounter = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const revealRef = useRef<(() => void) | null>(null);

  // Functional consent gates every localStorage write; nothing is written before it.
  useEffect(() => {
    appStore.setPersistence(functionalAllowed);
  }, [functionalAllowed]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full";
  }, [reducedMotion]);

  // A shared link restores its configuration once, then the URL is tidied so a reload starts fresh.
  useEffect(() => {
    if (!initialShared) return;
    appStore.update((s) => ({ ...s, dice: [...initialShared.dice] }));
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, [initialShared]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale]);
  const cultureName = useCallback((id: CultureId) => translate(locale, `cultures.${id}.name`), [locale]);
  const listCultures = useCallback(
    (ids: readonly CultureId[]) => formatList(locale, [...new Set(ids)].map(cultureName)),
    [locale, cultureName],
  );

  const update = appStore.update;
  const setPrefs = useCallback(
    (patch: Partial<PersistedState["preferences"]>) =>
      update((s) => ({ ...s, preferences: { ...s.preferences, ...patch } })),
    [update],
  );

  const setLocale = useCallback((next: Locale) => localeStore.set(next), []);

  /** Locks survive configuration changes only for dice whose position and culture are unchanged. */
  const applyDice = useCallback(
    (next: CultureId[]) => {
      setError(null);
      const previous = appStore.getSnapshot().dice;
      setLocks((current) =>
        next.length !== previous.length ? [] : current.filter((i) => next[i] === previous[i]),
      );
      update((s) => ({ ...s, dice: next }));
    },
    [update],
  );
  const setDice = useCallback((dice: CultureId[]) => applyDice(dice), [applyDice]);
  const setSelectedCultures = useCallback(
    (cultures: CultureId[]) => applyDice(diceForCultures(cultures, appStore.getSnapshot().dice)),
    [applyDice],
  );
  const setMode = useCallback((mode: GenerationMode) => setPrefs({ mode }), [setPrefs]);
  const setMotion = useCallback((m: MotionPreference) => setPrefs({ motion: m }), [setPrefs]);
  const setDice3d = useCallback((dice3d: boolean) => setPrefs({ dice3d }), [setPrefs]);
  const setStyle = useCallback((style: NameStyle) => setPrefs({ style }), [setPrefs]);
  const setShake = useCallback((shake: boolean) => setPrefs({ shake }), [setPrefs]);
  const setSound = useCallback(
    (enabled: boolean) => {
      // Called from a click, so the audio context may be unlocked here.
      if (enabled) unlockAudio();
      setPrefs({ sound: enabled });
    },
    [setPrefs],
  );

  const validation = validateDiceConfig(state.dice);
  const configIssue = validation.ok ? null : validation.issue;

  const reveal = useCallback(
    (id: number, result: NameResult) => {
      rollingRef.current = false;
      revealRef.current = null;
      setActiveRoll((r) => (r && r.id === id ? { ...r, phase: "revealed" } : r));
      setCurrentResult(result);
      if (appStore.getSnapshot().preferences.sound) playStamp();
      update((s) => ({
        ...s,
        history: [result, ...s.history.filter((h) => h.id !== result.id)].slice(0, HISTORY_LIMIT),
      }));
    },
    [update],
  );

  const roll = useCallback(
    (options: RollOptions = {}) => {
      // Overlapping rolls are ignored until the dice settle.
      if (rollingRef.current) return;
      const snapshot = appStore.getSnapshot();
      const dice = options.dice ?? snapshot.dice;
      const mode = options.mode ?? snapshot.preferences.mode;
      if (options.dice || options.mode) {
        update((s) => ({ ...s, dice: [...dice], preferences: { ...s.preferences, mode } }));
      }

      const previous = activeRoll?.outcome;
      const sameShape = previous && previous.result.dice.length === dice.length;
      const lockedIndexes =
        options.ignoreLocks || !sameShape ? [] : locks.filter((i) => previous.dice[i]?.culture === dice[i]);
      const locked: (DieOutcome | null)[] = dice.map((_, i) => (lockedIndexes.includes(i) ? previous!.dice[i]! : null));
      if (options.ignoreLocks) setLocks([]);

      const avoid = new Set(snapshot.history.slice(0, 10).map(resultSignature));
      const res = generateName({ dice, mode }, { avoid, locked, style: snapshot.preferences.style });
      if (!res.ok) {
        setError(`errors.${res.reason}`);
        return;
      }
      setError(null);
      setCharging(false);
      if (snapshot.preferences.sound) unlockAudio();
      rollingRef.current = true;
      const id = ++rollCounter.current;
      const throwParams = options.throwParams ?? BUTTON_THROW;
      const timeline = createTimeline(dice.length, reducedMotion, throwParams.power);
      setActiveRoll({
        id,
        outcome: res.outcome,
        startedAt: performance.now(),
        timeline,
        throwParams,
        phase: "rolling",
        fastForwarded: false,
        source: "roll",
        lockedIndexes,
      });

      // The reveal is driven by a timer, not by animation frames, so it also completes in a background tab.
      const result = res.outcome.result;
      revealRef.current = () => reveal(id, result);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(
        () => reveal(id, result),
        timeline.total + (reducedMotion ? REDUCED_REVEAL_DELAY_MS : REVEAL_DELAY_MS),
      );
    },
    [activeRoll, locks, reducedMotion, reveal, update],
  );

  const fastForward = useCallback(() => {
    if (!rollingRef.current || !revealRef.current) return;
    const finish = revealRef.current;
    setActiveRoll((r) => (r && r.phase === "rolling" ? { ...r, fastForwarded: true } : r));
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(finish, FAST_FORWARD_REVEAL_MS);
  }, []);

  const phase: RollPhase = activeRoll?.phase ?? "idle";

  // Tapping anywhere during a roll skips straight to the settled dice.
  useEffect(() => {
    if (phase !== "rolling") return;
    const onPointer = () => fastForward();
    window.addEventListener("pointerdown", onPointer, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointer, { capture: true });
  }, [phase, fastForward]);

  useShakeToRoll(hydrated && state.preferences.shake, roll);

  const toggleLock = useCallback(
    (index: number) => {
      if (!activeRoll || activeRoll.phase === "rolling" || index >= activeRoll.outcome.dice.length) return;
      setLocks((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]));
    },
    [activeRoll],
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

  const favoriteSignatures = useMemo(() => new Set(state.favorites.map(resultSignature)), [state.favorites]);
  const isFavorite = useCallback((r: NameResult) => favoriteSignatures.has(resultSignature(r)), [favoriteSignatures]);
  const toggleFavorite = useCallback(
    (r: NameResult) =>
      update((s) => {
        const sig = resultSignature(r);
        const exists = s.favorites.some((f) => resultSignature(f) === sig);
        return {
          ...s,
          favorites: exists
            ? s.favorites.filter((f) => resultSignature(f) !== sig)
            : [r, ...s.favorites].slice(0, FAVORITES_LIMIT),
        };
      }),
    [update],
  );
  const clearHistory = useCallback(() => update((s) => ({ ...s, history: [] })), [update]);
  const clearFavorites = useCallback(() => update((s) => ({ ...s, favorites: [] })), [update]);

  const commitConsent = useCallback((choices: ConsentChoices, deleteStored: boolean) => {
    consentStore.save(choices);
    if (deleteStored) appStore.clearPersisted();
    setCookieSettingsOpen(false);
  }, []);

  /** Declining Functional storage while data is saved asks for confirmation before deleting it. */
  const saveConsent = useCallback(
    (choices: ConsentChoices) => {
      if (!choices.functional && appStore.hasPersistedData()) {
        setPendingConsent(choices);
        return;
      }
      commitConsent(choices, false);
    },
    [commitConsent],
  );
  const resolvePendingConsent = useCallback(
    (confirmed: boolean) => {
      if (confirmed && pendingConsent) commitConsent(pendingConsent, true);
      setPendingConsent(null);
    },
    [commitConsent, pendingConsent],
  );

  const value: MyNamaeContextValue = {
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
    setSound,
    setShake,
    setStyle,
    reducedMotion,
    configIssue,
    roll,
    fastForward,
    charging,
    setCharging,
    activeRoll,
    phase,
    currentResult,
    error,
    announcement,
    locks,
    toggleLock,
    isFavorite,
    toggleFavorite,
    clearHistory,
    clearFavorites,
    consent,
    functionalAllowed,
    saveConsent,
    pendingConsent,
    resolvePendingConsent,
    cookieSettingsOpen,
    setCookieSettingsOpen,
    privacyOpen,
    setPrivacyOpen,
  };

  return <MyNamaeContext.Provider value={value}>{children}</MyNamaeContext.Provider>;
}

export function useMyNamae(): MyNamaeContextValue {
  const ctx = useContext(MyNamaeContext);
  if (!ctx) throw new Error("useMyNamae must be used inside <MyNamaeProvider>");
  return ctx;
}
