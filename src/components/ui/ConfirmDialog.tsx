"use client";

import { useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal confirmation built on <dialog>, which provides focus trapping, Escape handling and
 * focus restoration natively. Focus starts on Cancel so a stray Enter never destroys data.
 */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/25 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <h2 id={titleId} className="font-display text-lg font-medium">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm leading-relaxed text-muted">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-ivory"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="min-h-10 rounded-full bg-vermilion-ink px-4 text-sm font-medium text-white hover:bg-[#9e2f22]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
