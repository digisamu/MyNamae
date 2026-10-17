import type { FormattedName } from "@/features/formatting/formatName";

interface Props {
  formatted: FormattedName;
  size?: "lg" | "sm";
  testId?: string;
  /** Play the reveal: a seal-stamp press for the name, kana appearing one by one, Arabic from right to left. */
  reveal?: boolean;
}

/** Renders a formatted name: primary line plus the culture's secondary script, with correct lang/dir. */
export function NameDisplay({ formatted, size = "lg", testId, reveal = false }: Props) {
  const isJapanesePrimary = formatted.primaryLang === "ja";
  const primaryClass =
    size === "lg"
      ? `${isJapanesePrimary ? "font-mincho text-6xl sm:text-7xl tracking-wide" : "font-display text-5xl sm:text-6xl"} leading-[1.1] font-medium`
      : `${isJapanesePrimary ? "font-mincho text-2xl" : "font-display text-xl"} leading-tight font-medium`;
  const secondaryClass =
    formatted.secondaryLang === "ar"
      ? size === "lg"
        ? "font-arabic text-3xl leading-[1.6]"
        : "font-arabic text-lg leading-snug"
      : size === "lg"
        ? `${formatted.secondaryLang === "ja" ? "font-mincho tracking-[0.2em]" : "font-display"} text-2xl text-muted`
        : "text-sm text-muted";
  const rtl = formatted.textDirection === "rtl";
  const kanaSteps = reveal && formatted.secondaryLang === "ja" && formatted.secondaryText;

  return (
    <div data-testid={testId}>
      <p
        lang={formatted.primaryLang}
        className={`${primaryClass} break-words text-ink ${reveal ? "animate-name-stamp origin-left" : ""}`}
        data-testid={testId ? `${testId}-primary` : undefined}
      >
        {formatted.primaryText}
      </p>
      {formatted.secondaryText && (
        <p
          lang={formatted.secondaryLang ?? undefined}
          dir={formatted.textDirection}
          // Visible text is split for the kana animation; the full reading stays available to assistive tech.
          aria-label={kanaSteps ? formatted.secondaryText : undefined}
          className={`${secondaryClass} ${size === "lg" ? "mt-2" : "mt-0.5"} ${rtl ? "text-left" : ""} ${
            reveal && rtl ? "animate-reveal-rtl" : ""
          } ${reveal && !rtl && !kanaSteps ? "animate-reveal" : ""}`}
          data-testid={testId ? `${testId}-secondary` : undefined}
        >
          {kanaSteps
            ? Array.from(formatted.secondaryText!, (ch, i) => (
                <span key={i} aria-hidden className="inline-block animate-kana" style={{ animationDelay: `${380 + i * 90}ms` }}>
                  {ch}
                </span>
              ))
            : formatted.secondaryText}
        </p>
      )}
    </div>
  );
}
