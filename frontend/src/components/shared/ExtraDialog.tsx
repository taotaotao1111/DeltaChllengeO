import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "../../utils/useScrollLock";

/** 自选彩蛋支持焦点约束、Escape 和关闭后回到原入口。 */
export default function ExtraDialog({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useScrollLock(true);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-ink-900 p-0 text-rice-100 backdrop:bg-ink-900/80">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-gilt/15 px-6 pb-3 pt-[calc(0.75rem+var(--safe-top))]">
          <p className="text-xs tracking-widest text-gilt-light/80">{title}</p>
          <button autoFocus onClick={onClose} className="min-h-11 px-3 text-sm text-rice-200/80">返回</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </dialog>, document.body,
  );
}
