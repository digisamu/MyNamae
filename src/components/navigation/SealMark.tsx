/**
 * Hanko-style seal containing 名 ("name"). The glyph is drawn as strokes rather than text so it renders
 * identically everywhere, including at favicon size. Keep in sync with public/icon.svg.
 */
export const SEAL_GLYPH_PATHS = [
  "M27 10 19.5 21",
  "M23.5 16.5H40.5Q35 31 15 41",
  "M25 24.5 32.5 30",
  "M26.5 35V53M26.5 35H48V53M26.5 51.5H48",
] as const;

export function SealMark({ className = "size-9", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect x="3" y="3" width="58" height="58" rx="14" fill="#D94B3D" />
      <rect x="8.5" y="8.5" width="47" height="47" rx="9.5" fill="none" stroke="#FAF9F6" strokeWidth="2" opacity="0.55" />
      <g fill="none" stroke="#FAF9F6" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        {SEAL_GLYPH_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
