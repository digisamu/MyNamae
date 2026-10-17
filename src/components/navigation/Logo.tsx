/** Hanko-style seal with the kanji 名 ("name") beside the wordmark. */
export function Logo({ label }: { label: string }) {
  return (
    <a href="#top" aria-label={label} className="group inline-flex items-center gap-2.5 rounded-lg">
      <span
        aria-hidden
        className="grid size-9 -rotate-3 place-items-center rounded-[10px] bg-vermilion font-mincho text-lg leading-none text-washi shadow-[inset_0_0_0_2px_rgb(250_249_246/0.35)] transition-transform group-hover:rotate-0"
        lang="ja"
      >
        名
      </span>
      <span className="font-mincho text-xl font-medium tracking-tight text-ink">
        Name<span className="text-vermilion-ink">Forge</span>
      </span>
    </a>
  );
}
