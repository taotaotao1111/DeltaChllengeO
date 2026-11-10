import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { Artifact, ChatMessage as Message, ChatTurnContext } from "../../types/artifact";
import { useScrollLock } from "../../utils/useScrollLock";
import ChatMessage from "./ChatMessage";
import { useSheetResize } from "../../utils/useSheetResize";

interface Props {
  artifact: Artifact;
  context: ChatTurnContext;
  messages: Message[];
  questions: string[];
  loading: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onSend: (text: string) => void;
  onDeepDive: (message: Message) => void;
  onRetry: (message: Message) => void;
  onStop: () => void;
  onClose: () => void;
  scrollPosition: MutableRefObject<number>;
}

function useChatViewport() {
  const read = () => ({
    desktop: window.matchMedia("(min-width: 768px)").matches,
    height: window.visualViewport?.height ?? window.innerHeight,
    bottom: Math.max(0, window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) - (window.visualViewport?.offsetTop ?? 0)),
  });
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const update = () => setViewport(read());
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
  return viewport;
}

export default function ChatSheet(props: Props) {
  const { artifact, context, messages, questions, loading, draft, onDraft, onSend, onDeepDive, onRetry, onStop, onClose, scrollPosition } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const atBottomRef = useRef(true);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const viewport = useChatViewport();
  const reduceMotion = useReducedMotion();
  const sheet = useSheetResize(viewport.desktop, viewport.height, reduceMotion, listRef, scrollPosition);
  const { expanded } = sheet;
  useScrollLock(true);

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = Number.isFinite(scrollPosition.current) ? scrollPosition.current : list.scrollHeight;
    atBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }, [scrollPosition]);

  useEffect(() => {
    const list = listRef.current;
    if (list && (atBottomRef.current || scrollPosition.current === Number.POSITIVE_INFINITY)) list.scrollTop = list.scrollHeight;
  }, [messages, scrollPosition]);

  const openSources = (id: string) => {
    setSourceId((current) => current === id ? null : id);
    // 查看旧回答的依据时不把用户强制滚回最新消息。
    atBottomRef.current = false;
    if (listRef.current) scrollPosition.current = listRef.current.scrollTop;
  };
  const contextTitle = context.storyMoment?.title ?? context.currentChapterTitle ?? artifact.name;

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="artifact-chat-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-rice-100 backdrop:bg-transparent">
      <motion.button aria-label="收起对话，返回故事" onClick={onClose} tabIndex={-1}
        className="fixed inset-0 cursor-default bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.section initial={{ opacity: 0, x: viewport.desktop ? 32 : 0, y: viewport.desktop ? 0 : 48 }}
        animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: viewport.desktop ? 32 : 0, y: viewport.desktop ? 0 : 48 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
        style={{ height: viewport.desktop ? "calc(100dvh - 2rem)" : sheet.height, bottom: viewport.desktop ? 16 : viewport.bottom, maxHeight: viewport.height }}
        className={`fixed inset-x-0 flex min-h-0 flex-col overflow-hidden border border-gilt/25 bg-ink-900/95 shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-4 md:top-4 md:w-[440px] md:rounded-2xl ${expanded && !viewport.desktop ? "rounded-none" : "rounded-t-3xl"}`}>

        <header onPointerDown={sheet.onPointerDown} onPointerMove={sheet.onPointerMove}
          onPointerUp={sheet.onPointerUp} onPointerCancel={sheet.onPointerCancel}
          onKeyDown={(event) => {
            if (viewport.desktop) return;
            if (event.key === "ArrowUp") { event.preventDefault(); sheet.settle(true); }
            if (event.key === "ArrowDown") { event.preventDefault(); sheet.settle(false); }
          }}
          className={`shrink-0 touch-none select-none px-4 pb-3 md:touch-auto md:pt-5 ${expanded && !viewport.desktop ? "pt-[calc(0.25rem+var(--safe-top))]" : "pt-1"}`}>
          <button type="button" onClick={(event) => { if (event.detail === 0) sheet.settle(!expanded); else sheet.toggle(); }}
            aria-label={expanded ? "下滑或点击收回半屏" : "上滑或点击展开全屏"} aria-expanded={expanded} aria-controls="artifact-chat-content"
            className="mx-auto flex h-9 w-20 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-gilt-light md:hidden">
            <span aria-hidden className="h-1 w-10 rounded-full bg-gilt-light/65" />
          </button>
          <div className="min-w-0 pt-1 md:pt-0">
            <h2 ref={titleRef} tabIndex={-1} id="artifact-chat-title" className="font-title text-base text-rice-100 outline-none">与{artifact.name}对话</h2>
            <p className="mt-1 text-[11px] text-gilt-light/65">{context.actTitle ?? "有据可循地，慢慢聊"}</p>
          </div>
        </header>

        <div className="shrink-0 border-y border-gilt/15 bg-gilt/5 px-4 py-2">
          <p className="truncate text-[11px] text-rice-200/65">刚才看到：{contextTitle}</p>
          <p className="mt-1 text-[10px] text-rice-200/40">已带上当前画面与探索记录，故事停在这里等你。</p>
        </div>

        <div ref={listRef} id="artifact-chat-content" role="log" aria-label="与文物的对话记录" aria-live="polite" aria-relevant="additions"
          onClickCapture={sheet.onListClickCapture}
          onScroll={(e) => { const el = e.currentTarget; scrollPosition.current = el.scrollTop; atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
          className="scrollbar-none min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          {!messages.length && <div className="py-1">
            <p className="font-title text-base text-rice-100/90">关于刚才的故事，你想知道什么？</p>
            <p className="mt-2 text-xs leading-6 text-rice-200/60">先聊一点。有兴趣，再深入；史料没有记载的，我会如实告诉你。</p>
          </div>}
          {messages.map((message) => <ChatMessage key={message.id} message={message} facts={(message.factIds ?? []).flatMap((id) => { const fact = artifact.verifiedFacts.find((f) => f.id === id); return fact ? [fact] : []; })}
            sourcesOpen={sourceId === message.id} loading={loading}
            onSources={() => openSources(message.id)}
            onDeepDive={() => { atBottomRef.current = true; onDeepDive(message); }}
            onRetry={() => { atBottomRef.current = true; onRetry(message); }} />)}
          {questions.length > 0 && <div className="space-y-2 pt-1">
            <p className="text-[10px] tracking-wide text-gilt-light/60">你也许还想问</p>
            {questions.slice(0, messages.length ? 2 : 3).map((question) => <button key={question} disabled={loading}
              onClick={() => { atBottomRef.current = true; onSend(question); }}
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-gilt/20 px-3 py-2 text-left text-xs leading-5 text-rice-100/80 transition hover:bg-gilt/10 disabled:opacity-40">
              <span>{question}</span><span aria-hidden>↗</span>
            </button>)}
          </div>}
        </div>

        <footer className="shrink-0 border-t border-gilt/15 bg-ink-900 px-3 pb-[calc(0.5rem+var(--safe-bottom))] pt-2">
          {loading && <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-rice-200/55"><span>正在整理档案中的回答…</span><button onClick={onStop} className="min-h-8 px-2 text-gilt-light/80">暂停回答</button></div>}
          <form onSubmit={(e) => { e.preventDefault(); atBottomRef.current = true; onSend(draft); }} className="flex items-center gap-2">
            <label htmlFor="artifact-chat-input" className="sr-only">向文物提问</label>
            <input id="artifact-chat-input" value={draft} onChange={(e) => onDraft(e.target.value)} maxLength={400}
              placeholder="接着刚才的发现问一句…"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-rice-100/15 bg-ink-800/80 px-4 py-2 text-base text-rice-100 outline-none placeholder:text-rice-200/35 focus:border-gilt/50 md:text-sm" />
            <button type="submit" disabled={loading || !draft.trim()} className="min-h-11 shrink-0 rounded-full bg-gilt/25 px-4 text-sm text-gilt-light transition hover:bg-gilt/35 disabled:opacity-35">发送</button>
          </form>
        </footer>
      </motion.section>
    </dialog>, document.body,
  );
}
