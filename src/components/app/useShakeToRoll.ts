import { useEffect, useEffectEvent } from "react";

const THRESHOLD = 17; // change in acceleration (m/s²) that counts as a shake
const COOLDOWN_MS = 1500;

type PermissionRequester = { requestPermission?: () => Promise<"granted" | "denied"> };

export function supportsDeviceMotion(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

/**
 * Asks for motion access where the browser requires it (iOS). Must be called from a user gesture.
 * Returns whether motion events may be used.
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (!supportsDeviceMotion()) return false;
  const ctor = window.DeviceMotionEvent as unknown as PermissionRequester;
  if (typeof ctor.requestPermission !== "function") return true;
  try {
    return (await ctor.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Rolls when the device is shaken. Off unless the user enabled it in settings. */
export function useShakeToRoll(enabled: boolean, roll: () => void): void {
  const onShake = useEffectEvent(() => roll());

  useEffect(() => {
    if (!enabled || !supportsDeviceMotion()) return;
    let last: { x: number; y: number; z: number } | null = null;
    let lastShake = 0;
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const current = { x: a.x, y: a.y, z: a.z };
      if (last) {
        const delta = Math.abs(current.x - last.x) + Math.abs(current.y - last.y) + Math.abs(current.z - last.z);
        const now = performance.now();
        if (delta > THRESHOLD && now - lastShake > COOLDOWN_MS) {
          lastShake = now;
          onShake();
        }
      }
      last = current;
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled]);
}
