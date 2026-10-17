"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

/**
 * Accessible modal on <dialog>: native focus trap and Escape handling. Focus is returned explicitly to the
 * element that was focused when the dialog opened (its trigger).
 */
export function Modal({ open, title, closeLabel, onClose, children, footer, testId }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        onClose();
        returnTo.current?.focus?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      data-testid={testId}
      className="m-auto max-h-[min(44rem,calc(100dvh-2rem))] w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-washi p-0 text-ink shadow-lift backdrop:bg-ink/25 backdrop:backdrop-blur-[2px] open:flex open:flex-col"
    >
      <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id={titleId} className="flex items-center gap-2.5 font-display text-xl font-medium">
          <span aria-hidden className="size-2.5 rotate-45 rounded-[2px] bg-vermilion" />
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-ivory hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <footer className="border-t border-line bg-surface/60 px-6 py-4">{footer}</footer>}
    </dialog>
  );
}
