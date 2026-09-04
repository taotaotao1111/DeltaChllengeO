import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InkBackground from "../shared/InkBackground";
import DustParticles from "../shared/DustParticles";
import SpeechReveal from "../shared/SpeechReveal";
import FogWipeReveal from "../shared/FogWipeReveal";
import GuessChoice, { type GuessOption } from "../shared/GuessChoice";
import HezunIllustration from "../artifact/HezunIllustration";
import ChangxinLampIllustration from "../artifact/ChangxinLampIllustration";
import ArtifactModelGate from "../artifact/ArtifactModelGate";
import { hezun } from "../../data/artifacts/hezun";
import { evaluateViewerMode } from "../../utils/artifactEvaluator";
import { startModelFetch } from "../artifact/modelSource";
import { useGameStore } from "../../store/gameStore";

interface CaseItem {
  id: string;
  name: string;
  dynasty: string;
  line: string;
  /** 简单占位用 emoji（尚未有插画的文物） */
  icon?: string;
  /** 精细插画组件（优先于 icon 使用） */
  Illustration?: React.ComponentType<{ className?: string }>;
  locked: boolean;
}

const CASES: CaseItem[] = [
  {
    id: "hezun",
    name: "何尊",
    dynasty: "西周",
    line: "我身上的四个字，被你们记了三千年。",
    icon: "🏺",
    locked: false,
  },
  {
    id: "changxin",
    name: "长信宫灯",
    dynasty: "西汉",
    line: "你看到的灯光，其实是我藏起来的烟。",
    Illustration: ChangxinLampIllustration,
    locked: true,
  },
  {
    id: "tongbenma",
    name: "铜奔马",
    dynasty: "东汉",
    line: "他们总说我在奔跑。可你知道我要去哪里吗？",
    icon: "🐎",
    locked: true,
  },
  {
    id: "qingming",
    name: "清明上河图",
    dynasty: "北宋",
    line: "别只看我。走进来看看。",
    icon: "🎨",
    locked: true,
  },
];

const GREETING_LINES = ["你终于来了。", "我已经很久没有和人说过话了。", "他们叫我——何尊。"];

const GUESS_OPTIONS: GuessOption[] = [
  { id: "drink", label: "用来喝酒", response: "我确实是一种盛酒的礌器——但铸造我，不只是为了喝酒这么简单。" },
  { id: "ritual", label: "用来祭祀", response: "礌仪的确重要，我也因此而生——不过还有一个更具体的原因。" },
  { id: "remember", label: "用来纪念一件重要的事情", response: "你猜对了。有一段话，需要被记住，我因此而生。" },
];

type View = "grid" | "reveal";

// three.js 相关代码单独切一个 chunk，不进首屏（ModelBoundary 里的 Suspense 兜底）
const ArtifactModelDisplay = lazy(() => import("../artifact/ArtifactModelDisplay"));

/**
 * 「今夜，你想认识谁？」展厅选择场景。
 *
 * 只有何尊是真正可进入的（本阶段唯一有可靠史料支撑的文物），
 * 其余三件是面向未来扩展的「敬请期待」占位——展示世界观，但不编造事实与体验。
 */
export default function GalleryScene() {
  const setStage = useGameStore((s) => s.setStage);
  const [view, setView] = useState<View>("grid");
  const [litIn, setLitIn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showGuess, setShowGuess] = useState(false);
  const [wiped, setWiped] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 展厅是入口，这里就把 3D chunk 与模型文件一起预热掉，
  // 用户看完开场文案、擦完雾时基本已经就绪
  const hezunViewerMode = useMemo(() => evaluateViewerMode(hezun), []);

  useEffect(() => {
    if (hezunViewerMode !== "3d" || !hezun.model) return;
    const { url } = hezun.model;
    // 模型字节流和 3D 代码 chunk 并行预热，两边都不阻塞展厅的选择流程
    startModelFetch(url);
    import("../artifact/ArtifactModelDisplay");
  }, [hezunViewerMode]);

  const hezunIllustration = (
    <HezunIllustration className="h-[30vh] max-h-[260px] w-auto animate-breathe drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
  );

  useEffect(() => {
    const t = setTimeout(() => setLitIn(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleCaseClick = (item: CaseItem) => {
    if (item.locked) {
      setToast(`「${item.name}」敬请期待`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1800);
      return;
    }
    setWiped(false);
    setShowGuess(false);
    setView("reveal");
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <InkBackground glow={litIn ? 0.5 : 0} />
      <DustParticles count={12} />

      <AnimatePresence mode="wait">
        {view === "grid" && (
          <motion.div
            key="grid"
            className="relative flex h-full w-full flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: litIn ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="font-title mb-10 text-xl text-rice-100 sm:mb-14 sm:text-2xl"
            >
              今夜，你想认识谁？
            </motion.p>

            <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
              {CASES.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.6 }}
                  onClick={() => handleCaseClick(item)}
                  className={`group relative flex flex-col items-center rounded-xl border px-3 py-6 text-center transition-all duration-300 ${
                    item.locked
                      ? "border-rice-100/8 bg-ink-800/30 hover:border-rice-100/15"
                      : "border-gilt/30 bg-gilt/5 shadow-[0_0_30px_rgba(201,167,106,0.12)] hover:border-gilt/50 hover:bg-gilt/10"
                  }`}
                >
                  {item.Illustration ? (
                    <item.Illustration
                      className={`mb-3 h-12 w-auto transition-all sm:h-14 ${
                        item.locked ? "opacity-40 grayscale" : "animate-breathe"
                      }`}
                    />
                  ) : (
                    <span
                      className={`mb-3 text-3xl transition-all sm:text-4xl ${
                        item.locked ? "opacity-30 grayscale" : "animate-breathe"
                      }`}
                    >
                      {item.icon}
                    </span>
                  )}
                  <p
                    className={`font-title mb-1 text-sm sm:text-base ${
                      item.locked ? "text-rice-200/40" : "text-rice-100"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p
                    className={`mb-3 text-[10px] tracking-widest ${
                      item.locked ? "text-rice-200/25" : "text-gilt-light/70"
                    }`}
                  >
                    {item.dynasty}
                  </p>
                  <p
                    className={`text-[11px] leading-5 ${
                      item.locked ? "text-rice-200/25" : "text-rice-200/60"
                    }`}
                  >
                    {item.line}
                  </p>

                  {item.locked && (
                    <span className="mt-3 rounded-full border border-rice-100/10 px-2.5 py-0.5 text-[10px] text-rice-200/35">
                      敬请期待
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="fixed bottom-[calc(2rem+var(--safe-bottom))] left-1/2 -translate-x-1/2 rounded-full border border-rice-100/15 bg-ink-900/90 px-4 py-2 text-xs text-rice-200/70"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {view === "reveal" && (
          <motion.div
            key="reveal"
            className="relative h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          >
            <FogWipeReveal
              className="flex h-full w-full flex-col items-center justify-center px-6"
              onRevealed={() => setWiped(true)}
              hint="在雾气上划一划，看看是谁"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="mb-8"
              >
                {hezunViewerMode === "3d" && hezun.model ? (
                  <ArtifactModelGate
                    model={hezun.model}
                    fallback={hezunIllustration}
                    placeholderClassName="h-[30vh] max-h-[260px] w-[30vh] max-w-[260px]"
                  >
                    {(src) => (
                      <ArtifactModelDisplay
                        model={hezun.model!}
                        src={src}
                        className="h-[30vh] max-h-[260px] w-[30vh] max-w-[260px] animate-breathe drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                      />
                    )}
                  </ArtifactModelGate>
                ) : (
                  hezunIllustration
                )}
              </motion.div>

              {wiped && !showGuess && (
                <SpeechReveal
                  lines={GREETING_LINES}
                  lineDelay={2000}
                  onComplete={() => setShowGuess(true)}
                  className="max-w-lg text-center"
                  textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-2xl"
                />
              )}

              <AnimatePresence>
                {showGuess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                  >
                    <GuessChoice
                      question="你觉得，我为什么会被铸造成这个样子？"
                      options={GUESS_OPTIONS}
                      onDone={() => setStage("chapter1")}
                      continueLabel="听它讲下去 →"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </FogWipeReveal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
