import { Fragment, useEffect, useState } from "react";
import { motion } from "framer-motion";
import FogWipeReveal from "../shared/FogWipeReveal";

interface RustRevealProps {
  /** 引入文案，一句一行 */
  leadLines: string[];
  /** 底部免责说明（说明字影是示意、不是拓片） */
  footnote: string;
  onRevealed: () => void;
  /** 刮开锈层后露出的器物图（除锈后状态，示意素材） */
  underImageSrc?: string;
  /** 盖层（带锈的器物照片）：刮的就是这层锈 */
  coverImageSrc?: string;
}

/** 铭文共122字（含重文），兜底方案的抽象笔画块示意排布，不是字形，也不是拓片 */
const GLYPH_ROWS = 8;
const GLYPH_COLS = 10;

/**
 * 「清理除锈」交互 —— 第三章铭文高潮的第一步。
 *
 * 史实依据：何尊内底的铭文是 1975 年经专家清理除锈后才被发现并释读的
 * （见 fact-inscription-basic）。所以"先除锈、再看清"本身就是真实的发现顺序。
 *
 * 锈层之下：
 * - 有 underImageSrc：放除锈后的器物图——刮掉锈壳就是「除锈」这个动作本身
 *   （示意素材，footnote 如实标注）；
 * - 没有（其它文物未配素材时）：内壁底色 + 模糊字影（原方案），
 *   不画清晰字形、不模仿拓片——「发现有字」与「看清读懂」仍分两步。
 */
export default function RustReveal({
  leadLines,
  footnote,
  onRevealed,
  underImageSrc,
  coverImageSrc,
}: RustRevealProps) {
  /**
   * 盖层图先加载完再挂 FogWipeReveal：图片 onload 是异步的，晚于 canvas
   * 初次铺纹理就会把用户已经刮开的地方覆盖回去（实测竞态）。
   * 加载期间渲染中性占位（加载画面短暂，可接受）。
   */
  const [coverLoaded, setCoverLoaded] = useState(!coverImageSrc);
  useEffect(() => {
    if (!coverImageSrc || coverLoaded) return;
    const img = new Image();
    const done = () => setCoverLoaded(true);
    img.onload = done;
    img.onerror = done; // 加载失败也放行——FogWipeReveal 会退回程序纹理
    img.src = coverImageSrc;
  }, [coverImageSrc, coverLoaded]);

  return (
    // pt 是给章节标题（第三章 / 我身上的秘密）留位置，手机端否则会叠在一起
    <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-[calc(2.5rem+var(--safe-bottom))] pt-[calc(9.5rem+var(--safe-top))] sm:pt-32">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="mb-5 max-w-sm text-center text-sm leading-7 text-rice-200/70"
      >
        {leadLines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </motion.p>

      {coverLoaded ? (
        <FogWipeReveal
          tone="rust"
          threshold={0.45}
          onRevealed={onRevealed}
          hint="用手指刮一刮，看看锈下面有什么"
          skipLabel="直接看看"
          coverImageSrc={coverImageSrc}
          // 用高度驱动尺寸（而不是 w-full），矮屏上会自动缩小而不是被裁掉
          className="mx-auto aspect-[4/5] h-[40vh] max-h-[400px] overflow-hidden rounded-lg border border-bronze-dark/60"
        >
        {/* 锈层之下：除锈后的器身（示意素材，暗化降饱和贴合整体色调） */}
        {underImageSrc ? (
          <img
            src={underImageSrc}
            alt="除锈后的器身（示意）"
            className="h-full w-full object-cover"
            style={{ filter: "brightness(0.92) saturate(0.88) contrast(1.03)" }}
            draggable={false}
          />
        ) : (
          /* 兜底：内壁底色 + 模糊的字影（未配图文物的原方案） */
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-bronze-dark via-ink-700 to-ink-800">
            <div
              className="grid gap-x-3 gap-y-2 opacity-[0.42]"
              style={{
                gridTemplateColumns: `repeat(${GLYPH_COLS}, minmax(0, 1fr))`,
                filter: "blur(2.2px)",
              }}
              aria-hidden
            >
              {Array.from({ length: GLYPH_ROWS * GLYPH_COLS }).map((_, i) => (
                <span
                  key={i}
                  className="block h-2 rounded-[1px] bg-gilt-light/70"
                  // 长短随机，让它像成行的字迹而不是整齐的方块
                  style={{ width: `${55 + ((i * 37) % 45)}%` }}
                />
              ))}
            </div>
          </div>
        )}
        </FogWipeReveal>
      ) : (
        /* 盖层图加载中：中性占位（尺寸与刮卡一致，避免布局跳动） */
        <div className="mx-auto aspect-[4/5] h-[40vh] max-h-[400px] animate-pulse overflow-hidden rounded-lg border border-bronze-dark/60 bg-ink-800/60" />
      )}

      <p className="mt-4 text-center text-[10px] text-rice-200/25">{footnote}</p>
    </div>
  );
}
