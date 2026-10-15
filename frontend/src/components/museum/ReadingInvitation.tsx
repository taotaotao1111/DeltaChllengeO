import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { Artifact } from "../../types/artifact";
import { useScrollLock } from "../../utils/useScrollLock";

interface Props {
  invitation: NonNullable<Artifact["readingInvitation"]>;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ReadingInvitation({ invitation, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  useScrollLock(true);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    contentRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="reading-invitation-title"
      aria-describedby="reading-invitation-duration reading-invitation-body reading-invitation-reassurance"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-rice-100 backdrop:bg-transparent"
    >
      <motion.div
        className="flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain bg-ink-900/60 px-6 pb-[max(2rem,var(--safe-bottom))] pt-[max(1.5rem,var(--safe-top))] backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
      >
        <motion.section
          ref={contentRef}
          tabIndex={-1}
          className="relative my-auto w-full max-w-sm shrink-0 rounded-sm border border-gilt/30 bg-ink-800 px-6 py-8 text-center shadow-2xl outline-none sm:px-9 sm:py-10"
          initial={{ y: reduceMotion ? 0 : 8 }}
          animate={{ y: 0 }}
          exit={{ y: reduceMotion ? 0 : -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭开篇小笺，留在展厅"
            className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-rice-200/60 transition-colors hover:text-rice-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gilt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <p className="mb-5 text-[11px] tracking-[0.35em] text-gilt-light/70">开篇 · 小笺</p>
          <h2 id="reading-invitation-title" className="font-title whitespace-pre-line text-2xl leading-[1.7] tracking-wide text-rice-100">
            {invitation.title}
          </h2>
          <p id="reading-invitation-duration" className="mb-7 mt-5 flex items-center justify-center gap-3 text-sm tracking-wider">
            <span className="text-gilt-light">{invitation.durationLabel}</span>
            <span className="h-3 w-px bg-gilt/30" aria-hidden="true" />
            <span className="text-rice-200/70">{invitation.chapterLabel}</span>
          </p>
          <div id="reading-invitation-body" className="font-serif text-sm leading-[2.2] text-rice-200/85">
            {invitation.lines.map((line, index) => (
              <p key={line} className={index === invitation.lines.length - 1 ? "mt-3" : undefined}>{line}</p>
            ))}
          </div>
          <p id="reading-invitation-reassurance" className="mb-6 mt-5 text-xs leading-relaxed text-rice-200/60">
            {invitation.reassurance}
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 w-full rounded-full border border-gilt/40 bg-gilt/20 px-5 py-3 text-sm tracking-widest text-gilt-light transition-colors hover:border-gilt/70 hover:bg-gilt/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gilt-light"
          >
            {invitation.confirmLabel}
          </button>
        </motion.section>
      </motion.div>
    </dialog>,
    document.body,
  );
}
