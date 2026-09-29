import { useEffect, useRef, useState } from "react";
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
  /** 自我介绍视频播放浮层 */
  const [videoOpen, setVideoOpen] = useState(false);

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
        /* 桌面端画布收窄居中：全屏画布会让 Bounds 按整屏高度取景、模型大得压住标题
           和底部文案（手机竖屏没这个问题）。600px 画布 + observe 自适应取景即可。 */
        className="h-full w-full sm:mx-auto sm:max-w-[600px]"
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
              className="flex flex-col items-center gap-4"
            >
              {/* 视频入口：横排小组件（左小缩略图 + 右两行文案 + 播放钮）——
                  是「一条邀请」而不是「一张海报」：不再和上方 3D 尊正面对撞，
                  视觉权重低于主出口。 */}
              {data.introVideo && data.introVideo.poster && (
                <button
                  onClick={() => setVideoOpen(true)}
                  className="group pointer-events-auto flex items-center gap-3 rounded-xl border border-gilt/20 bg-ink-800/60 py-2 pl-2 pr-4 backdrop-blur-sm transition hover:border-gilt/45 hover:bg-ink-800/90"
                >
                  <span className="relative block h-[52px] w-[84px] shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={data.introVideo.poster}
                      alt="何尊的自我介绍"
                      className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-900/25">
                      <span
                        className="animate-breathe ml-0.5 inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-gilt-light drop-shadow-[0_0_8px_rgba(201,167,106,0.5)]"
                        aria-hidden
                      />
                    </span>
                  </span>
                  <span className="flex flex-col items-start text-left">
                    <span className="font-title text-sm text-rice-100/90">
                      听我讲讲我自己
                    </span>
                    <span className="mt-0.5 text-[10px] tracking-wide text-rice-200/40">
                      {data.introVideo.durationSec} 秒 · 看看三千岁的我怎么介绍自己
                    </span>
                  </span>
                </button>
              )}
              <button
                onClick={onNext}
                className="pointer-events-auto rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light shadow-[0_0_20px_rgba(201,167,106,0.15)] transition hover:bg-gilt/30"
              >
                继续听我说 →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 自我介绍视频浮层：全屏黑场 + 自定义控件（视频烧录字幕在底部，
          原生控件条会和它叠行——所以控件外置到视频下方的独立条）。 */}
      <AnimatePresence>
        {videoOpen && data.introVideo && (
          <IntroVideoOverlay
            src={data.introVideo.src}
            poster={data.introVideo.poster}
            onClose={() => setVideoOpen(false)}
          />
        )}
      </AnimatePresence>

      <ArtifactInfo
        hotspot={activeHotspot}
        facts={activeFacts}
        onClose={() => setActiveHotspot(null)}
      />
    </>
  );
}

/**
 * 自我介绍视频浮层：全屏黑场 + 自定义控件（播放/暂停 + 进度条外置在视频下方）。
 * 视频自带烧录字幕在画面底部，原生 controls 的进度条会和它叠行——所以不用 controls，
 * 播放/暂停点击视频本体切换，进度条独立一条摆在视频外。
 */
function IntroVideoOverlay({ src, poster, onClose }: { src: string; poster?: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  /** 静音状态：浏览器自动播放策略只放行静音起播，被拦时降级 + 给醒目的开声音按钮 */
  const [muted, setMuted] = useState(false);

  // 挂载即尝试带声播放；被自动播放策略拦下（play() reject）就静音起播
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPaused(true));
    });
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  /** 开声音：点击时是用户手势，浏览器允许出声 */
  const unmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    if (v.paused) v.play();
  };

  /** 进度条 seek：pointer 事件换算比例跳转（点击 + 按住拖动） */
  const seekToEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = p * v.duration;
    setProgress(p);
  };

  return (
    <motion.div
      key="intro-video"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex touch-none flex-col items-center justify-center bg-ink-900/95 px-4"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress(v.currentTime / v.duration);
        }}
        onEnded={onClose}
        className="max-h-[72vh] w-full cursor-pointer rounded-md border border-gilt/20 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
      />

      {/* 被静音起播时：醒目的开声音按钮（呼吸提示，点击即出声） */}
      {muted && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={unmute}
          className="mt-3 flex items-center gap-2 rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.25)] transition hover:bg-gilt/30"
        >
          <span aria-hidden>🔇</span> 点击打开声音
        </motion.button>
      )}

      {/* 外置进度条：支持点击跳转 + 拖拽 seek */}
      <div className="mt-3 w-full max-w-2xl">
        <div
          className="group relative h-4 w-full cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekToEvent(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) seekToEvent(e); // 按住拖动
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-rice-200/15 group-hover:h-1.5 transition-all">
            <div
              className="h-full rounded-full bg-gilt-light/70"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] tracking-widest text-rice-200/40">
          {muted ? "静音播放中" : paused ? "已暂停 · 点击画面继续" : "点击画面可暂停"}
        </p>
      </div>

      <button
        onClick={onClose}
        className="mt-5 rounded-full border border-rice-100/20 px-5 py-2 text-[11px] tracking-wide text-rice-100/70 transition hover:border-rice-100/40 hover:text-rice-100"
      >
        先不看，继续 →
      </button>
    </motion.div>
  );
}
