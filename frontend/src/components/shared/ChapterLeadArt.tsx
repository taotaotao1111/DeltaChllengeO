import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChapterLeadArtProps {
  src: string;
  caption?: string;
  /** 常亮透明度（默认 0.62）。第二章人像场景用 0.85——62% + 饱和度滤镜会把人压成剪影 */
  peakOpacity?: number;
}

/**
 * 章节开场插画：lead-in 念白期间给「念白空窗」一个视觉锚点。
 *
 * 时间轴自治（不读模块内部 phase——那些状态在模块里，外壳不持有）：
 * 淡入（0.9s）→ 常亮陪念白 → 念白中段起缓缓沉暗 → 交互开始前完全退场。
 * 总时长由父层估（约等于 lead-in 时长），这里只负责渲染与退场动画。
 *
 * 视觉处理：不硬贴图——左右用 mask 渐隐融进墨底、上下压暗，
 * 像展厅射灯下的一幅氛围画，而不是一张插进界面的卡片。
 * 图为 AI 生成氛围示意（caption 如实标注），别当史料用。
 */
export default function ChapterLeadArt({ src, caption, peakOpacity = 0.62 }: ChapterLeadArtProps) {
  /** 讲述推进到该沉暗的时刻 */
  const [dimming, setDimming] = useState(false);
  /** 完全退场（组件仍挂载但不渲染） */
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // 念白中段开始沉暗（约 3 句 × 1.5s 的中点）；10s 兜底全退
    const t1 = window.setTimeout(() => setDimming(true), 3200);
    const t2 = window.setTimeout(() => setGone(true), 9500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lead-art"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: dimming ? 0.12 : peakOpacity, y: 0, scale: dimming ? 0.98 : 1 }}
        transition={{ duration: dimming ? 2.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-x-0 top-[calc(9rem+var(--safe-top))] z-0 flex flex-col items-center"
        aria-hidden
      >
        <div
          className="relative h-[34vh] max-h-[340px] w-[74vw] max-w-[300px] overflow-hidden rounded-md sm:w-[280px]"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <img
            src={src}
            alt={caption ?? "章节开场氛围图"}
            className="h-full w-full object-cover"
            /* 摘掉饱和度滤镜（saturate 0.85 把浇铸图的暖光吃掉了）；
               提亮一档让人物从剪影里出来（走查实测源图人像本清楚） */
            style={{ filter: "brightness(1.14) contrast(1.02)" }}
            draggable={false}
          />
          {/* caption 藏在画内右上角：念白居中带、标题都避开的死角。
              之前放画内底缘/画外下方，均与念白第二句撞字（DOM 实测 409-422 vs 410-434）。 */}
          {caption && (
            <p className="absolute right-2.5 top-2 text-right text-[8px] leading-4 tracking-widest text-rice-200/35">
              {caption}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
