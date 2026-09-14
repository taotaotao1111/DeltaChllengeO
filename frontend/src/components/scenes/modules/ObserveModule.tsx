import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import ArtifactViewer from "../../artifact/ArtifactViewer";
import ArtifactInfo from "../../artifact/ArtifactInfo";
import { useGameStore } from "../../../store/gameStore";
import type { Artifact, Hotspot, HotspotType, ObserveModuleData } from "../../../types/artifact";

/** 静场多久之后给出「跳过」入口——不打扰，但别让人卡住 */
const SKIP_HINT_DELAY = 7000;

type Phase = "observe" | "transition" | "narrate" | "ready";

interface ObserveModuleProps {
  artifact: Artifact;
  data: ObserveModuleData;
  onNext: () => void;
}

/**
 * 观察模块：先让用户自己看，第一眼落在哪里决定文物怎么开口。
 *
 * phase 状态机与那个 7 秒计时都留在本组件内部，**不要上提到 ChapterHost** ——
 * 一旦上提，依赖数组会随章节切换变化，计时会重复触发或干脆不触发。
 */
export default function ObserveModule({ artifact, data, onNext }: ObserveModuleProps) {
  const discoveredDetails = useGameStore((s) => s.discoveredDetails);
  const markDiscovered = useGameStore((s) => s.markDiscovered);

  const [phase, setPhase] = useState<Phase>("observe");
  const [firstLook, setFirstLook] = useState<string | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [showSkip, setShowSkip] = useState(false);

  /**
   * 本章呈现哪些热点。
   *
   * 没有显式写 hotspotIds 时用排除法：去掉铭文（藏在内壁，留给揭示章的高潮）
   * 和时间线（不是器身部位，走导航进入）。以后在数据里加器身热点不用改这里。
   */
  const hotspots = data.hotspotIds
    ? data.hotspotIds
        .map((id) => artifact.hotspots.find((h) => h.id === id))
        .filter((h): h is Hotspot => !!h)
    : artifact.hotspots.filter((h) => h.type !== "inscription" && h.type !== "timeline");

  // 本章的探索进度：只数本章热点，不受全局的 history / timeline 影响
  const foundCount = hotspots.filter((h) => discoveredDetails.includes(h.id)).length;
  const allFound = foundCount === hotspots.length;

  // 兜底：如果用户迟迟没有互动，给一个不打扰的"跳过"入口，避免卡住核心体验
  useEffect(() => {
    if (phase !== "observe") return;
    const t = setTimeout(() => setShowSkip(true), SKIP_HINT_DELAY);
    return () => clearTimeout(t);
  }, [phase]);

  const handleHotspotClick = (hotspot: Hotspot) => {
    markDiscovered(hotspot.id);
    if (phase === "observe" && data.firstLookResponses[hotspot.type]) {
      setFirstLook(hotspot.type);
      setPhase("transition");
    }
    setActiveHotspot(hotspot);
  };

  const activeType: HotspotType | null = activeHotspot?.type ?? null;
  const activeFacts = activeHotspot
    ? artifact.verifiedFacts.filter((f) => activeHotspot.factIds.includes(f.id))
    : [];

  return (
    <>
      <ArtifactViewer
        artifact={artifact}
        hotspots={hotspots}
        discoveredIds={discoveredDetails}
        onHotspotClick={handleHotspotClick}
        activeHotspotType={activeType}
        className="h-full w-full"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] flex flex-col items-center gap-3 px-4 text-center sm:bottom-10">
        {/* 探索进度：热点从 2 个涨到 5 个，得让用户知道还有没找到的 */}
        {phase !== "narrate" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`text-[11px] tracking-widest ${
              allFound ? "text-gilt-light/70" : "text-rice-200/35"
            }`}
          >
            {allFound ? data.allFoundLine : `你发现了 ${foundCount} / ${hotspots.length} 处`}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {phase === "observe" && (
            <motion.div
              key="observe"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="max-w-xs text-sm leading-6 text-rice-200/75">{data.prompt}</p>
              {showSkip && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setPhase("narrate")}
                  className="pointer-events-auto text-[11px] text-rice-200/35 underline-offset-2 transition hover:text-rice-200/60"
                >
                  跳过，直接听我讲 →
                </motion.button>
              )}
            </motion.div>
          )}

          {phase === "transition" && firstLook && (
            <motion.div
              key="transition"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="max-w-xs text-sm leading-6 text-rice-100/90">
                {data.firstLookResponses[firstLook]}
              </p>
              <button
                onClick={() => setPhase("narrate")}
                className="pointer-events-auto rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
              >
                继续 →
              </button>
            </motion.div>
          )}

          {phase === "narrate" && (
            <motion.div key="narrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpeechReveal
                lines={data.openingLines}
                lineDelay={data.lineDelay}
                onComplete={() => setPhase("ready")}
                className="max-w-md"
                textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
              />
            </motion.div>
          )}

          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3"
            >
              {!allFound && (
                <p className="max-w-xs text-xs leading-6 text-rice-200/45">{data.notAllFoundHint}</p>
              )}
              <button
                onClick={onNext}
                className="pointer-events-auto mt-1 rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
              >
                继续听我说 →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ArtifactInfo
        hotspot={activeHotspot}
        facts={activeFacts}
        onClose={() => setActiveHotspot(null)}
      />
    </>
  );
}
