import { useEffect, useState } from "react";
import Timeline from "../story/Timeline";
import SpanBar from "../story/SpanBar";
import AppraiseGate from "../story/AppraiseGate";
import ExtraDialog from "../shared/ExtraDialog";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { track } from "../../utils/tracking";

export default function TimelineScene() {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const openMemoryCard = useGameStore((s) => s.openMemoryCard);
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const appraiseDone = useGameStore((s) => s.appraiseDone);
  const markAppraiseDone = useGameStore((s) => s.markAppraiseDone);
  const [appraiseOpen, setAppraiseOpen] = useState(false);
  const artifact = getArtifact(artifactId);
  const appraise = artifact.chapters.flatMap((c) => c.module.kind === "flip" && c.module.appraise ? [c.module.appraise] : [])[0];
  const finished = artifact.chapters.every((c) =>
    artifact.narrative?.optionalChapterIds.includes(c.id) || discovered.includes(`chapter:${c.id}`),
  );

  useEffect(() => {
    const id = artifact.hotspots.find((h) => h.type === "timeline")?.id;
    if (id) markDiscovered(id);
  }, [artifact, markDiscovered]);

  return (
    <div className="relative h-dvh overflow-y-auto overscroll-contain px-5 pb-28 pt-[calc(5rem+var(--safe-top))] sm:px-10 sm:pt-24">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-xs tracking-[0.3em] text-gilt-light/70">{finished ? "故事之后 · 留下这次相遇" : "我的一生 · 随时可以继续探索"}</p>
        <h1 className="font-title mb-3 mt-4 text-2xl text-rice-100 sm:text-3xl">{finished ? "谢谢你，听见了我。" : "三千年，走到你面前。"}</h1>
        <p className="mb-7 text-sm leading-7 text-rice-200/65">你看过的细节、读过的故事与问过的问题，都可以留在记忆卡里。</p>
        <button onClick={() => openMemoryCard()} className="mb-10 min-h-12 rounded-full border border-gilt/45 bg-gilt/20 px-8 py-3 text-sm text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.12)] transition hover:bg-gilt/30">生成我的探索记忆卡 →</button>
        <div className="w-full"><Timeline events={artifact.timeline} /></div>
        {artifact.span && <div className="mt-6 w-full"><SpanBar castYear={artifact.span.castYear} foundYear={artifact.span.foundYear} note={artifact.span.note} /></div>}
        {appraise && (
          <div className="mt-9 w-full rounded-xl border border-gilt/20 bg-ink-800/50 px-6 py-5 text-left">
            <p className="text-[11px] tracking-widest text-gilt-light/65">结尾彩蛋 · 自愿挑战</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div><p className="font-title text-lg text-rice-100">轮到你来掌眼</p><p className="mt-1 text-xs leading-6 text-rice-200/60">三道鉴宝题，看看这次相遇留下了什么。</p></div>
              <button onClick={() => { track("appraise_open", { artifactId }); setAppraiseOpen(true); }} className="min-h-11 rounded-full border border-gilt/35 px-5 text-sm text-gilt-light">{appraiseDone ? "再挑战一次" : "试试鉴宝 →"}</button>
            </div>
          </div>
        )}
      </div>
      {appraiseOpen && appraise && <ExtraDialog title="结尾彩蛋 · 鉴宝" onClose={() => setAppraiseOpen(false)}><div className="h-[max(680px,calc(100dvh-5rem))]"><AppraiseGate artifactId={artifactId} data={appraise} onDone={() => { markAppraiseDone(); setAppraiseOpen(false); }} /></div></ExtraDialog>}
    </div>
  );
}
