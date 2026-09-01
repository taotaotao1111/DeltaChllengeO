import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InkBackground from "../shared/InkBackground";
import SpeechReveal from "../shared/SpeechReveal";
import ArtifactViewer from "../artifact/ArtifactViewer";
import ArtifactInfo from "../artifact/ArtifactInfo";
import { hezun } from "../../data/artifacts/hezun";
import { useGameStore, type DiscoveredId } from "../../store/gameStore";
import type { Hotspot, HotspotType } from "../../types/artifact";

const OPENING_LINES = [
  "我出生在三千多年前。",
  "那时候，人们用青铜铸造礼器。",
  "我的主人，希望把一件重要的事情留下来。",
];

const OBSERVE_PROMPT = "先别急着听我说。你自己看看我——你的第一眼，最先注意到了哪里？";

/**
 * 第一章呈现所有"看得见的器身细节"热点。
 *
 * 排除两类：铭文（藏在内壁，留给第三章的高潮）、时间线（不是器身部位，走导航进入）。
 * 用排除法而不是白名单，以后在数据里加器身热点就不用再改这里。
 */
const CHAPTER1_HOTSPOTS = hezun.hotspots.filter(
  (h) => h.type !== "inscription" && h.type !== "timeline",
);

const HOTSPOT_TO_DISCOVERED: Record<string, DiscoveredId> = {
  "hotspot-pattern": "hotspot-pattern",
  "hotspot-form": "hotspot-form",
  "hotspot-banana-leaf": "hotspot-banana-leaf",
  "hotspot-flange": "hotspot-flange",
  "hotspot-foot": "hotspot-foot",
};

/**
 * 「你的第一眼落在哪里」的回应。
 *
 * 必须覆盖 CHAPTER1_HOTSPOTS 里出现的每一个 type —— handleHotspotClick 直接拿
 * hotspot.type 查这张表，漏一个就会在界面上显示 undefined。
 */
const FIRST_LOOK_RESPONSE: Record<FirstLookType, string> = {
  pattern: "很多人第一次见我，也会先注意到这里。",
  form: "你先看到的是我的样子。也有人是这样。",
  "banana-leaf": "很少有人先看这里。你看得比大多数人都细。",
  flange: "你注意到的是我的骨架——那几道棱，撑住了我全部的气势。",
  foot: "你从我站着的地方开始看。有意思，很少有人这样。",
};

type FirstLookType = "pattern" | "form" | "banana-leaf" | "flange" | "foot";

const ALL_FOUND_LINE = "你把我身上看得见的地方，都看过了。";

type Phase = "observe" | "transition" | "narrate" | "ready";

export default function ChapterOne() {
  const discoveredDetails = useGameStore((s) => s.discoveredDetails);
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const setStage = useGameStore((s) => s.setStage);

  const [phase, setPhase] = useState<Phase>("observe");
  const [firstLook, setFirstLook] = useState<FirstLookType | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [showSkip, setShowSkip] = useState(false);

  // 本章的探索进度：只数器身热点，不受全局的 history / timeline 影响
  const foundCount = CHAPTER1_HOTSPOTS.filter((h) => {
    const id = HOTSPOT_TO_DISCOVERED[h.id];
    return id && discoveredDetails.includes(id);
  }).length;
  const allFound = foundCount === CHAPTER1_HOTSPOTS.length;

  // 兜底：如果用户迟迟没有互动，给一个不打扰的"跳过"入口，避免卡住核心体验
  useEffect(() => {
    if (phase !== "observe") return;
    const t = setTimeout(() => setShowSkip(true), 7000);
    return () => clearTimeout(t);
  }, [phase]);

  const registerFirstLook = (type: FirstLookType) => {
    if (phase === "observe") {
      setFirstLook(type);
      setPhase("transition");
    }
  };

  const handleHotspotClick = (hotspot: Hotspot) => {
    const id = HOTSPOT_TO_DISCOVERED[hotspot.id];
    if (id) markDiscovered(id);
    if (hotspot.type in FIRST_LOOK_RESPONSE) {
      registerFirstLook(hotspot.type as FirstLookType);
    }
    setActiveHotspot(hotspot);
  };

  const activeType: HotspotType | null = activeHotspot?.type ?? null;
  const activeFacts = activeHotspot
    ? hezun.verifiedFacts.filter((f) => activeHotspot.factIds.includes(f.id))
    : [];

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <InkBackground glow={1} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute left-[calc(1.5rem+var(--safe-left))] top-[calc(5rem+var(--safe-top))] z-10 sm:left-10 sm:top-24"
      >
        <p className="text-xs tracking-widest text-gilt-light/70">第一章</p>
        <h1 className="font-title text-2xl text-rice-100 sm:text-3xl">我是谁</h1>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setStage("gallery")}
        className="fixed left-[calc(1.5rem+var(--safe-left))] top-[calc(1.5rem+var(--safe-top))] z-20 text-xs tracking-wide text-rice-100/60 sm:left-8 sm:top-8"
      >
        ← 回到展厅
      </motion.button>

      <ArtifactViewer
        artifact={hezun}
        hotspots={CHAPTER1_HOTSPOTS}
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
            {allFound ? ALL_FOUND_LINE : `你发现了 ${foundCount} / ${CHAPTER1_HOTSPOTS.length} 处`}
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
              <p className="max-w-xs text-sm leading-6 text-rice-200/75">{OBSERVE_PROMPT}</p>
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
                {FIRST_LOOK_RESPONSE[firstLook]}
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
                lines={OPENING_LINES}
                lineDelay={2400}
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
                <p className="max-w-xs text-xs leading-6 text-rice-200/45">
                  我身上还有你没看过的地方——也可以直接听我讲下去。
                </p>
              )}
              <button
                onClick={() => setStage("chapter2")}
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
    </div>
  );
}
