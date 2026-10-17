import { useCallback, useSyncExternalStore } from "react";
import type { FormattedName } from "@/features/formatting/formatName";
import { pickVoice, pronunciationTarget } from "./pronunciation";

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function subscribe(onChange: () => void) {
  if (!supported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** A stable string snapshot of the installed voice languages. */
const voicesKey = () => (supported() ? window.speechSynthesis.getVoices().map((v) => `${v.lang}|${v.name}`).join(",") : "");

/** Speaks a name with an on-device voice (no external TTS). `available` is false without a suitable voice. */
export function usePronunciation(formatted: FormattedName | null) {
  const key = useSyncExternalStore(subscribe, voicesKey, () => "");
  const target = formatted ? pronunciationTarget(formatted) : null;
  const voice = key && target ? pickVoice(window.speechSynthesis.getVoices(), target.langs) : null;

  const speak = useCallback(() => {
    if (!voice || !target) return;
    const utterance = new SpeechSynthesisUtterance(target.text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voice, target]);

  return { available: voice !== null, speak };
}
