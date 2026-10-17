import { SEAL_GLYPH_PATHS } from "@/components/navigation/SealMark";

/** The seal as plain SVG for next/og image generation (icons and the social preview). */
export function SealArtwork({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect x="3" y="3" width="58" height="58" rx="14" fill="#D94B3D" />
      <rect x="8.5" y="8.5" width="47" height="47" rx="9.5" fill="none" stroke="#FAF9F6" strokeWidth="2" opacity="0.55" />
      {SEAL_GLYPH_PATHS.map((d) => (
        <path key={d} d={d} fill="none" stroke="#FAF9F6" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
