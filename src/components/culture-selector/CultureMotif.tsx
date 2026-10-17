import type { CultureId } from "@/types/names";

/** Restrained line motifs: a crescent moon (Ay), an eight-pointed geometric star, a cherry blossom. */
export function CultureMotif({ culture, className = "size-6" }: { culture: CultureId; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (culture) {
    case "turkic":
      return (
        <svg {...common}>
          <path d="M15.5 4.2a8 8 0 1 0 4.3 12.6A6.5 6.5 0 1 1 15.5 4.2Z" />
          <path d="M18.5 7.5v3M17 9h3" />
        </svg>
      );
    case "arabic":
      return (
        <svg {...common}>
          <path d="M12.00 2.50 L14.78 5.28 L18.72 5.28 L18.72 9.22 L21.50 12.00 L18.72 14.78 L18.72 18.72 L14.78 18.72 L12.00 21.50 L9.22 18.72 L5.28 18.72 L5.28 14.78 L2.50 12.00 L5.28 9.22 L5.28 5.28 L9.22 5.28Z" />
          <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" />
        </svg>
      );
    case "japanese":
      return (
        <svg {...common}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M12 11c-2.2-1.4-2.8-4.6-1.1-6.6.4.7.8.9 1.1.9s.7-.2 1.1-.9c1.7 2 1.1 5.2-1.1 6.6Z"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
