import type { FormattedName } from "@/features/formatting/formatName";

interface Props {
  formatted: FormattedName;
  size?: "lg" | "sm";
  testId?: string;
}

/** Renders a formatted name: primary line plus the culture's secondary script, with correct lang/dir. */
export function NameDisplay({ formatted, size = "lg", testId }: Props) {
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

  return (
    <div data-testid={testId}>
      <p lang={formatted.primaryLang} className={`${primaryClass} break-words text-ink`} data-testid={testId ? `${testId}-primary` : undefined}>
        {formatted.primaryText}
      </p>
      {formatted.secondaryText && (
        <p
          lang={formatted.secondaryLang ?? undefined}
          dir={formatted.textDirection}
          className={`${secondaryClass} ${size === "lg" ? "mt-2" : "mt-0.5"} ${
            formatted.textDirection === "rtl" ? "text-left" : ""
          }`}
          data-testid={testId ? `${testId}-secondary` : undefined}
        >
          {formatted.secondaryText}
        </p>
      )}
    </div>
  );
}
