import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from "react";
import type { Artifact } from "../../types/artifact";
import "./HistoryTimeline.css";

interface Props {
  artifact: Artifact;
  focusedId: string | null;
  activeId: string | null;
  visitedIds: string[];
  onFocus: (id: string) => void;
  onSelect: (id: string | null) => void;
}

/** 四段往事并排，当前图片轻微前凸；金线串起时间，点选节点直接展开故事。 */
export default function HistoryTimeline({ artifact, focusedId, activeId, visitedIds, onFocus, onSelect }: Props) {
  const phases = useMemo(() => artifact.historyEnding?.phases ?? [], [artifact.historyEnding]);
  const focusedIndex = Math.max(0, phases.findIndex((phase) => phase.id === focusedId));
  const isLit = (index: number) => !!phases[index] && (index === focusedIndex || visitedIds.includes(phases[index].id));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const nodesRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const active = phases.find((phase) => phase.id === activeId);
  const events = active ? artifact.timeline.filter((event) => active.eventIds.includes(event.id)) : [];
  const eventFactIds = new Set(events.flatMap((event) => event.factIds));
  const facts = artifact.verifiedFacts.filter((fact) => eventFactIds.has(fact.id));

  // 窄屏保持可读的卡片尺寸；键盘、前后按钮或 AI 定位后只滚动时间线自身。
  useEffect(() => {
    const nodes = nodesRef.current;
    const card = refs.current[focusedIndex];
    if (!nodes || !card || nodes.scrollWidth <= nodes.clientWidth) return;
    const left = nodes.scrollLeft + card.getBoundingClientRect().left - nodes.getBoundingClientRect().left
      - (nodes.clientWidth - card.clientWidth) / 2;
    nodes.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [focusedIndex]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = phases.length - 1;
    const index = event.key === "ArrowRight" ? Math.min(last, focusedIndex + 1)
      : event.key === "ArrowLeft" ? Math.max(0, focusedIndex - 1)
        : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (index === null || index < 0) return;
    event.preventDefault();
    onFocus(phases[index].id);
    refs.current[index]?.focus({ preventScroll: true });
  };

  return <>
    <div className="history-timeline" role="group" aria-label="四段历史时间线" onKeyDown={moveFocus}>
      <div className="history-timeline__gallery">
      <button type="button" className="history-timeline-nav history-timeline-nav--previous" aria-label="选中上一段历史" disabled={focusedIndex === 0}
        onClick={() => onFocus(phases[focusedIndex - 1].id)}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <div className="history-timeline__nodes" ref={nodesRef}>
        {phases.map((phase, index) => <button type="button" key={phase.id}
          ref={(node) => { refs.current[index] = node; }}
          className={`history-timeline-card${index === focusedIndex ? " is-focused" : ""}${isLit(index) ? " is-visited" : ""}`}
          tabIndex={index === focusedIndex ? 0 : -1}
          aria-label={`${phase.title}，${phase.period}；${activeId === phase.id ? "收起故事" : "展开故事"}`}
          aria-current={index === focusedIndex ? "step" : undefined}
          aria-expanded={activeId === phase.id} aria-controls={panelId}
          onClick={() => { onFocus(phase.id); onSelect(activeId === phase.id ? null : phase.id); }}>
          <span className="history-timeline-card__image"><img src={phase.image} alt="" width={720} height={540} loading="lazy" draggable={false} /></span>
          <span className={`history-timeline-card__thread${isLit(index) || isLit(index + 1) ? " is-linked" : ""}`} aria-hidden="true">
            {index < phases.length - 1 && <svg className="history-timeline-link" viewBox="0 0 100 24" preserveAspectRatio="none">
              <path className={isLit(index) ? "is-lit" : ""} d="M0 12C16 4 34 4 50 12" vectorEffect="non-scaling-stroke" />
              <path className={isLit(index + 1) ? "is-lit" : ""} d="M50 12C66 20 84 20 100 12" vectorEffect="non-scaling-stroke" />
            </svg>}
            <i />
          </span>
          <strong>{phase.title}</strong>
          <small>{phase.period}</small>
        </button>)}
      </div>
      <button type="button" className="history-timeline-nav history-timeline-nav--next" aria-label="选中下一段历史" disabled={focusedIndex === phases.length - 1}
        onClick={() => onFocus(phases[focusedIndex + 1].id)}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
      <div id={panelId}>
        {active && <section className="history-phase-detail" aria-label={`${active.title}的故事`}>
          <div className="history-phase-detail__heading">
            <h3>{active.title}</h3><span className="history-phase-detail__date">{[...new Set(events.map((event) => event.year))].join(" · ")}</span>
            <button type="button" onClick={() => onSelect(null)}>收起 <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 12 5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
          <p className="history-phase-detail__story">{events.map((event) => event.narration).join(" ")}</p>
          {facts.length > 0 && <details key={active.id}>
            <summary><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 5c-2-1.5-4-1.5-7-1v12c3-.5 5-.5 7 1 2-1.5 4-1.5 7-1V4c-3-.5-5-.5-7 1Zm0 0v12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>查看史料依据</summary>
            {facts.map((fact) => <p key={fact.id} className="history-phase-detail__fact">{fact.content}<span>来源：{fact.source}</span></p>)}
          </details>}
        </section>}
      </div>
      <p className="history-timeline-hint"><span className="history-timeline-hint__mobile">左右滑动，</span>点选节点读往事 <span aria-hidden="true">·</span> 配图为氛围示意</p>
    </div>
  </>;
}
