import { useCallback, useEffect, useState } from "react";
import Timeline from "../story/Timeline";
import HistoryTimeline from "../story/HistoryTimeline";
import SpanBar from "../story/SpanBar";
import AppraiseGate from "../story/AppraiseGate";
import TraceGlyphs from "../story/TraceGlyphs";
import ExtraDialog from "../shared/ExtraDialog";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { track } from "../../utils/tracking";
import { useStoryMoment } from "../../utils/useStoryMoment";
import { getInitialHistoryPhase, historyPhaseKey } from "../../utils/historyTimeline";
import "./TimelineScene.css";

function SectionHeading({ children, main = false }: { children: string; main?: boolean }) {
  const Heading = main ? "h1" : "h2";
  return <div className="history-section-heading">
    <div className="history-section-knot" aria-hidden><span /><svg viewBox="0 0 48 24"><path d="m16 3 10 9-10 9-10-9 10-9Zm16 0 10 9-10 9-10-9 10-9ZM24 7l6 5-6 5-6-5 6-5Z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg><span /></div>
    <Heading>{children}</Heading>
  </div>;
}

export default function TimelineScene() {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const openMemoryCard = useGameStore((s) => s.openMemoryCard);
  const setStage = useGameStore((s) => s.setStage);
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const appraiseDone = useGameStore((s) => s.appraiseDone);
  const markAppraiseDone = useGameStore((s) => s.markAppraiseDone);
  const setTracedGlyphs = useGameStore((s) => s.setTracedGlyphs);
  const tracedGlyphs = useGameStore((s) => s.tracedGlyphs);
  const [appraiseOpen, setAppraiseOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [focusedPhaseId, setFocusedPhaseId] = useState(() => {
    const state = useGameStore.getState();
    return getInitialHistoryPhase(getArtifact(state.currentArtifactId), state.chapterIndex);
  });
  const focusPhase = useCallback((id: string) => {
    setFocusedPhaseId(id);
    setActivePhaseId(null);
  }, []);
  const artifact = getArtifact(artifactId);
  const ending = artifact.historyEnding;
  const appraise = artifact.chapters.flatMap((c) => c.module.kind === "flip" && c.module.appraise ? [c.module.appraise] : [])[0];
  const focusedPhase = ending?.phases.find((phase) => phase.id === focusedPhaseId);
  const visibleEvents = focusedPhase ? artifact.timeline.filter((event) => focusedPhase.eventIds.includes(event.id)) : artifact.timeline;
  useStoryMoment({
    id: `${artifactId}:timeline:${focusedPhaseId ?? "overview"}`,
    title: focusedPhase ? `我的一生 · ${focusedPhase.title}` : "探索历史 · 四段往事",
    summary: visibleEvents.map((event) => `${event.year} · ${event.title}：${event.narration}`).join("\n"),
    factIds: [...new Set(visibleEvents.flatMap((event) => event.factIds))],
    questions: [], ready: true,
  });
  useEffect(() => {
    const id = artifact.hotspots.find((h) => h.type === "timeline")?.id;
    if (id) markDiscovered(id);
  }, [artifact, markDiscovered]);
  useEffect(() => {
    if (!focusedPhaseId || !artifact.historyEnding?.phases.some((phase) => phase.id === focusedPhaseId)) return;
    const key = historyPhaseKey(focusedPhaseId);
    if (useGameStore.getState().discoveredDetails.includes(key)) return;
    markDiscovered(key);
    useGameStore.getState().persistCheckpoint();
  }, [artifact, focusedPhaseId, markDiscovered]);

  return (
    <main className="history-ending" aria-label={`${artifact.name}的历史与更多探索`}>
      {ending && <picture className="history-ending__backdrop" aria-hidden>
        <source media="(min-width: 768px)" srcSet={ending.background.desktop} />
        <img src={ending.background.mobile} alt="" width={941} height={1672} fetchPriority="high" />
      </picture>}
      <div className="history-ending__shade" aria-hidden />
      <button type="button" onClick={() => setStage("chapter")} className="history-return"><span aria-hidden>←</span> 故事之旅</button>
      <div className="history-content">
        <header className="history-toolbar">
          <span className="history-toolbar__label">物语千年 · 探索历史</span>
          <button type="button" onClick={() => openMemoryCard()} className="history-memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden><rect x="7" y="4" width="13" height="17" rx="2" /><path d="m7 18-3-.5a2 2 0 0 1-1.5-2.4L5 4.5a2 2 0 0 1 2.4-1.4l2 .5M11 9h5M11 13h5" /></svg>
            <span>我的探索记忆卡</span>
          </button>
        </header>
        <section className="history-section history-life" aria-label="我的一生时间线">
          <SectionHeading main>我的一生 · 时间线</SectionHeading>
          {ending ? <HistoryTimeline key={artifactId} artifact={artifact} focusedId={focusedPhaseId} activeId={activePhaseId}
            visitedIds={ending.phases.filter((phase) => discovered.includes(historyPhaseKey(phase.id))).map((phase) => phase.id)}
            onFocus={focusPhase} onSelect={setActivePhaseId} /> : <Timeline events={artifact.timeline} />}
        </section>

        {artifact.span && <SpanBar castYear={artifact.span.castYear} foundYear={artifact.span.foundYear} note={artifact.span.note} />}

        {(appraise || artifact.traceGlyphs) && <section className="history-section history-more" aria-label="故事之后的自选探索">
          <SectionHeading>故事之后 · 更多探索</SectionHeading>
          <div className="history-extras">
            {appraise && <button type="button" className="history-extra" onClick={() => { track("appraise_open", { artifactId }); setAppraiseOpen(true); }}>
              {ending && <img src={ending.appraisalImage} alt="" width={960} height={540} loading="lazy" />}
              <span className="history-extra__copy"><small>自愿挑战{appraiseDone ? " · 已完成" : ""}</small><strong>轮到你来掌眼</strong><span>辨一辨，哪些是{artifact.name}的故事？</span></span>
              <span className="history-extra__arrow" aria-hidden>↗</span>
            </button>}
            {artifact.traceGlyphs && <button type="button" className="history-extra" onClick={() => setTraceOpen(true)}>
              {ending && <img src={ending.tracingImage} alt="" width={960} height={540} loading="lazy" />}
              <span className="history-extra__copy"><small>铭文体验{tracedGlyphs?.some(Boolean) ? " · 已留笔迹" : ""}</small><strong>为铭文描红</strong><span>亲手描出「{artifact.traceGlyphs.chars.join("")}」</span></span>
              <span className="history-extra__arrow" aria-hidden>↗</span>
            </button>}
          </div>
        </section>}
      </div>
      {appraiseOpen && appraise && <ExtraDialog title="结尾彩蛋 · 鉴宝" onClose={() => setAppraiseOpen(false)}><div className="h-[max(680px,calc(100dvh-5rem))]"><AppraiseGate artifactId={artifactId} data={appraise} onDone={() => { markAppraiseDone(); setAppraiseOpen(false); }} /></div></ExtraDialog>}
      {traceOpen && artifact.traceGlyphs && <ExtraDialog title="故事之后 · 铭文描红" onClose={() => setTraceOpen(false)}>
        <TraceGlyphs embedded chars={artifact.traceGlyphs.chars} returnLabel="返回更多探索" onSkip={() => setTraceOpen(false)} onComplete={(urls) => { setTracedGlyphs(urls); setTraceOpen(false); openMemoryCard(); }} />
      </ExtraDialog>}
    </main>
  );
}
