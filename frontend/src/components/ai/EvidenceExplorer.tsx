import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AIAction, Artifact } from "../../types/artifact";
import { evidenceVisitKey, resolveEvidenceTarget } from "../../utils/evidenceActions";
import { useScrollLock } from "../../utils/useScrollLock";
import { useGameStore } from "../../store/gameStore";
import InscriptionModule from "../scenes/modules/InscriptionModule";

/** 第二层原生 dialog：聊天与原故事均保留，关闭只卸载这次证据探索。 */
export default function EvidenceExplorer({ artifact, action, onBack, onReturnStory }: {
  artifact: Artifact; action: AIAction; onBack: () => void; onReturnStory: () => void;
}) {
  const resolved = resolveEvidenceTarget(artifact, action.targetId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  useScrollLock(true);
  useEffect(() => {
    if (!resolved) return;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    const state = useGameStore.getState();
    state.markDiscovered(evidenceVisitKey(action.targetId));
    state.markDiscovered(`inscription:${action.targetId}`);
    state.persistCheckpoint();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
    // 每次打开记录一次；展开说明或来源不会重开 dialog。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact.id, action.targetId]);
  if (!resolved) return null;
  const { target, section, module } = resolved;
  const facts = artifact.verifiedFacts.filter((fact) => target.factIds.includes(fact.id));
  return createPortal(<dialog ref={dialogRef} aria-labelledby="evidence-explorer-title" onCancel={(event) => { event.preventDefault(); onBack(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-[#100e0b] p-0 text-rice-100 outline-none backdrop:bg-black/70">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gilt/15 px-5 pb-3 pt-[calc(1rem+var(--safe-top))] sm:px-8">
        <div><p className="text-[11px] tracking-wide text-gilt-light/65">跟着证据看铭文 · 第二幕</p>
          <h2 ref={titleRef} tabIndex={-1} id="evidence-explorer-title" className="mt-1 font-title text-xl outline-none">{target.label}</h2></div>
        <button type="button" onClick={onBack} className="min-h-11 shrink-0 rounded-full border border-gilt/25 px-4 text-xs text-gilt-light">返回对话</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        <div className="mx-auto h-[clamp(240px,36svh,400px)] max-w-3xl" aria-label={`定位到铭文：${target.label}`}>
          <InscriptionModule key={target.sectionId} artifact={artifact} data={module} focusSectionId={target.sectionId} onNext={onBack} />
        </div>
        <div className="mx-auto max-w-2xl space-y-5 px-5 sm:px-8">
          <section>
            <div className="flex items-center justify-between gap-3"><p className="text-xs text-gilt-light/75">铭文证据 · {section.sceneNote}</p>
              <div className="flex items-center gap-1">
                {section.debateNote && <button type="button" aria-expanded={debateOpen} aria-label="查看铭文释读说明" onClick={() => { setDebateOpen(!debateOpen); setInfoOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-cinnabar-light/40 text-xs text-cinnabar-light">考</button>}
                <button type="button" aria-expanded={infoOpen} aria-label="查看字形来源说明" onClick={() => { setInfoOpen(!infoOpen); setDebateOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-gilt/30 text-xs text-gilt-light">ⓘ</button>
              </div>
            </div>
            <p className="mt-2 font-title text-xl leading-relaxed text-gilt-light">「{target.excerpt}」</p>
            {infoOpen && <p className="mt-3 text-xs leading-6 text-rice-200/60">{module.footnote}</p>}
            {debateOpen && <p className="mt-3 border-l border-cinnabar-light/30 pl-3 text-xs leading-6 text-rice-200/70">{section.debateNote}</p>}
          </section>
          <section className="border-t border-gilt/15 pt-4"><p className="text-xs text-gilt-light/75">历史解释</p><p className="mt-2 text-sm leading-7 text-rice-100/85">{target.interpretation}</p></section>
          <section className="border-t border-gilt/15 pt-4"><p className="text-xs text-gilt-light/75">理解边界</p><p className="mt-2 text-sm leading-7 text-rice-200/70">{target.boundary}</p></section>
          <button type="button" aria-expanded={sourcesOpen} onClick={() => {
            if (!sourcesOpen) {
              const state = useGameStore.getState();
              target.factIds.forEach((id) => state.markDiscovered(`evidence:${id}`));
              state.persistCheckpoint();
            }
            setSourcesOpen(!sourcesOpen);
          }} className="flex min-h-11 w-full items-center justify-between text-left text-xs text-gilt-light">
            {sourcesOpen ? "收起对应史料依据" : "查看对应史料依据"}<span aria-hidden="true">{sourcesOpen ? "⌃" : "⌄"}</span>
          </button>
          {sourcesOpen && <div className="space-y-4">{facts.map((fact) => <article key={fact.id} className="border-l border-gilt/25 pl-3"><p className="text-xs leading-6 text-rice-100/80">{fact.content}</p><p className="mt-1 text-[11px] leading-5 text-rice-200/50">来源：{fact.source}</p></article>)}</div>}
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gilt/15 px-5 pb-[calc(0.75rem+var(--safe-bottom))] pt-3 sm:px-8">
        <p className="text-[11px] text-rice-200/45">原故事的位置与进度已保留</p>
        <button type="button" onClick={onReturnStory} className="min-h-11 shrink-0 rounded-full bg-gilt/20 px-5 text-sm text-gilt-light">回到故事</button>
      </footer>
    </div>
  </dialog>, document.body);
}
