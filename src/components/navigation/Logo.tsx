import { SealMark } from "./SealMark";

export function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-mincho font-medium tracking-tight text-ink ${className}`}>
      My<span className="text-vermilion-ink">Namae</span>
    </span>
  );
}

/** Seal plus wordmark; 名前 ("name") is a decorative subtitle, never a translation of the brand. */
export function Logo({ label }: { label: string }) {
  return (
    <a href="#top" aria-label={label} className="group inline-flex items-center gap-2.5 rounded-lg">
      <SealMark className="size-9 -rotate-3 transition-transform group-hover:rotate-0" />
      <span className="flex items-baseline gap-2">
        <Wordmark />
        <span aria-hidden lang="ja" className="hidden font-mincho text-xs tracking-[0.2em] text-muted sm:inline">
          名前
        </span>
      </span>
    </a>
  );
}
