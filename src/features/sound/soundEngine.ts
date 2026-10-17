/**
 * Procedural sounds via the Web Audio API — no files and no network requests.
 * The AudioContext is created lazily inside a user gesture (browsers require it) and only when sound is on.
 */
type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Call from a click/keypress handler so later sounds are allowed to play. */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

function burst(c: AudioContext, at: number, freq: number, q: number, gain: number, decay: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(filter).connect(env).connect(c.destination);
  src.start(at);
  src.stop(at + decay + 0.02);
}

function tone(c: AudioContext, at: number, freq: number, gain: number, decay: number, endFreq = freq) {
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(endFreq, at + decay);
  const env = c.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(env).connect(c.destination);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** A soft wooden clack; volume scales with impact strength (0–1). */
export function playClack(strength: number): void {
  const c = ctx;
  if (!c || c.state !== "running") return;
  const s = Math.min(1, Math.max(0.05, strength));
  const at = c.currentTime;
  const pitch = 1 + (Math.random() - 0.5) * 0.15;
  burst(c, at, 2300 * pitch, 6, 0.22 * s, 0.05);
  tone(c, at, 820 * pitch, 0.12 * s, 0.08, 620 * pitch);
}

/** A muted seal "stamp": low thump with a short paper rustle. */
export function playStamp(): void {
  const c = ctx;
  if (!c || c.state !== "running") return;
  const at = c.currentTime;
  tone(c, at, 150, 0.25, 0.18, 70);
  burst(c, at, 900, 1.2, 0.08, 0.12);
}
