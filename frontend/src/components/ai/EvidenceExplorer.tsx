import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AIAction, Artifact } from "../../types/artifact";
import { getEvidenceActionPresentation, getEvidenceDiscoveryKeys, resolveActionTarget } from "../../utils/evidenceActions";
import { historyPhaseKey } from "../../utils/historyTimeline";
import { useScrollLock } from "../../utils/useScrollLock";
import { useGameStore } from "../../store/gameStore";
import InscriptionModule from "../scenes/modules/InscriptionModule";
import ArtifactViewer from "../artifact/ArtifactViewer";
import HistoryTimeline from "../story/HistoryTimeline";
import "../scenes/TimelineScene.css";

/** 原生 dialog 保留聊天和原故事；三种探索都使用独立状态，不改变主线场景。 */
export default function EvidenceExplorer({ artifact, action, onBack, onReturnStory }: {
  artifact: Artifact; action: AIAction; onBack: () => void; onReturnStory: () => void;
}) {
  const resolved = resolveActionTarget(artifact, action);
  const presentation = getEvidenceActionPresentation(artifact, action);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [focusReady, setFocusReady] = useState(false);
  const [focusedPhase, setFocusedPhase] = useState(action.targetId);
  const [activePhase, setActivePhase] = useState<string | null>(action.targetId);
  const discovered = useGameStore((state) => state.discoveredDetails);
  useScrollLock(true);

  const recordVisit = useCallback(() => {
    const state = useGameStore.getState();
    getEvidenceDiscoveryKeys(artifact, action).forEach((key) => state.markDiscovered(key));
    state.persistCheckpoint();
  }, [artifact, action]);
  const finishFocus = useCallback(() => { setFocusReady(true); recordVisit(); }, [recordVisit]);
  const recordSources = useCallback((ids: string[]) => {
    const state = useGameStore.getState();
    ids.forEach((id) => state.markDiscovered(`evidence:${id}`));
    state.persistCheckpoint();
  }, []);

  useEffect(() => {
    if (!resolveActionTarget(artifact, action)) return;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    // 热点在相机定位完成或插画兜底显示之后，才计为真实观察。
    if (action.type !== "FOCUS_HOTSPOT") recordVisit();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [artifact, action, recordVisit]);

  if (!resolved || !presentation) return null;
  const { target } = resolved;
  const facts = artifact.verifiedFacts.filter((fact) => target.factIds.includes(fact.id));
  const focusedTimeline = resolved.kind === "timeline";

  return createPortal(<dialog ref={dialogRef} aria-labelledby="evidence-explorer-title" onCancel={(event) => { event.preventDefault(); onBack(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-[#100e0b] p-0 text-rice-100 outline-none backdrop:bg-black/70">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gilt/15 px-5 pb-3 pt-[calc(1rem+var(--safe-top))] sm:px-8">
        <div><p className="text-[11px] tracking-wide text-gilt-light/65">{presentation.scene}</p>
          <h2 ref={titleRef} tabIndex={-1} id="evidence-explorer-title" className="mt-1 font-title text-xl outline-none">{target.label}</h2></div>
        <button type="button" onClick={onBack} className="min-h-11 shrink-0 rounded-full border border-gilt/25 px-4 text-xs text-gilt-light">返回对话</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        {resolved.kind === "inscription" && <div className="mx-auto h-[clamp(240px,36svh,400px)] max-w-3xl" aria-label={`定位到铭文：${target.label}`}>
          <InscriptionModule artifact={artifact} data={resolved.module} focusSectionId={resolved.section.id} onNext={onBack} />
        </div>}

        {resolved.kind === "hotspot" && <section className="mx-auto max-w-3xl px-5 pb-5 pt-3 sm:px-8" aria-label={`定位纹饰：${target.label}`}>
          <div className="h-[clamp(260px,43svh,480px)]">
            <ArtifactViewer artifact={artifact} hotspots={[resolved.hotspot]} discoveredIds={discovered}
              activeHotspotType={focusReady ? resolved.hotspot.type : null} className="h-full w-full"
              focusView={resolved.target.view} onFocusComplete={finishFocus} onHotspotClick={finishFocus} />
          </div>
          <p role="status" className="mt-3 text-center text-xs leading-6 text-gilt-light/80">
            {focusReady ? "已定位腹部兽面纹 · 可拖动旋转，点击高亮热点继续观察" : "正在转向腹部纹饰…"}
          </p>
        </section>}

        {resolved.kind === "timeline" && <section className="mx-auto max-w-5xl px-5 pb-6 pt-7 sm:px-12" aria-label="发现何尊的时间线与史料">
          <h3 className="mb-5 text-center font-title text-lg text-gilt-light">我的一生 · 时间线</h3>
          <HistoryTimeline artifact={artifact} focusedId={focusedPhase} activeId={activePhase}
            visitedIds={(artifact.historyEnding?.phases ?? []).filter((phase) => discovered.includes(historyPhaseKey(phase.id))).map((phase) => phase.id)}
            evidenceInitiallyOpen onViewEvidence={recordSources}
            onFocus={(id) => {
              setFocusedPhase(id); setActivePhase(null);
              const state = useGameStore.getState();
              state.markDiscovered(historyPhaseKey(id)); state.persistCheckpoint();
            }} onSelect={setActivePhase} />
        </section>}

        {(resolved.kind !== "hotspot" || focusReady) && <div className="mx-auto max-w-2xl space-y-5 px-5 sm:px-8">
          {resolved.kind === "inscription" && <section>
            <div className="flex items-center justify-between gap-3"><p className="text-xs text-gilt-light/75">铭文证据 · {resolved.section.sceneNote}</p>
              <div className="flex items-center gap-1">
                {resolved.section.debateNote && <button type="button" aria-expanded={debateOpen} aria-label="查看铭文释读说明" onClick={() => { setDebateOpen(!debateOpen); setInfoOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-cinnabar-light/40 text-xs text-cinnabar-light">考</button>}
                <button type="button" aria-expanded={infoOpen} aria-label="查看字形来源说明" onClick={() => { setInfoOpen(!infoOpen); setDebateOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-gilt/30 text-xs text-gilt-light">ⓘ</button>
              </div>
            </div>
            <p className="mt-2 font-title text-xl leading-relaxed text-gilt-light">「{resolved.target.excerpt}」</p>
            {infoOpen && <p className="mt-3 text-xs leading-6 text-rice-200/60">{resolved.module.footnote}</p>}
            {debateOpen && <p className="mt-3 border-l border-cinnabar-light/30 pl-3 text-xs leading-6 text-rice-200/70">{resolved.section.debateNote}</p>}
          </section>}
          <section className="border-t border-gilt/15 pt-4"><p className="text-xs text-gilt-light/75">{focusedTimeline ? "理解这三个时间点" : "历史解释"}</p><p className="mt-2 text-sm leading-7 text-rice-100/85">{target.interpretation}</p></section>
          <section className="border-t border-gilt/15 pt-4"><p className="text-xs text-gilt-light/75">理解边界</p><p className="mt-2 text-sm leading-7 text-rice-200/70">{target.boundary}</p></section>
          {!focusedTimeline && <>
            <button type="button" aria-expanded={sourcesOpen} onClick={() => {
              if (!sourcesOpen) recordSources(target.factIds);
              setSourcesOpen(!sourcesOpen);
            }} className="flex min-h-11 w-full items-center justify-between text-left text-xs text-gilt-light">
              {sourcesOpen ? "收起对应史料依据" : "查看对应史料依据"}<span aria-hidden="true">{sourcesOpen ? "⌃" : "⌄"}</span>
            </button>
            {sourcesOpen && <div className="space-y-4">{facts.map((fact) => <article key={fact.id} className="border-l border-gilt/25 pl-3"><p className="text-xs leading-6 text-rice-100/80">{fact.content}</p><p className="mt-1 text-[11px] leading-5 text-rice-200/50">来源：{fact.source}</p></article>)}</div>}
          </>}
        </div>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gilt/15 px-5 pb-[calc(0.75rem+var(--safe-bottom))] pt-3 sm:px-8">
        <p className="text-[11px] text-rice-200/45">原故事的位置与进度已保留</p>
        <button type="button" onClick={onReturnStory} className="min-h-11 shrink-0 rounded-full bg-gilt/20 px-5 text-sm text-gilt-light">回到故事</button>
      </footer>
    </div>
  </dialog>, document.body);
}
