import { motion } from "framer-motion";
import FogWipeReveal from "../shared/FogWipeReveal";

interface RustRevealProps {
  onRevealed: () => void;
}

/** 铭文共122字（含重文），这里用抽象笔画块示意排布，不是字形，也不是拓片 */
const GLYPH_ROWS = 8;
const GLYPH_COLS = 10;

/**
 * 「清理除锈」交互 —— 第三章铭文高潮的第一步。
 *
 * 史实依据：何尊内底的铭文是 1975 年经专家清理除锈后才被发现并释读的
 * （见 fact-inscription-basic）。所以"先除锈、再看清"本身就是真实的发现顺序。
 *
 * 锈层下面刻意只放**模糊的字影**（低对比 + blur），不画清晰字形、更不模仿拓片：
 * 一是不伪造文物图像，二是让"发现有字"（本组件）和"看清读懂"
 * （随后的 InscriptionFocus）分成递进的两步，不重复。
 */
export default function RustReveal({ onRevealed }: RustRevealProps) {
  return (
    // pt 是给章节标题（第三章 / 我身上的秘密）留位置，手机端否则会叠在一起
    <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-[calc(2.5rem+var(--safe-bottom))] pt-[calc(9.5rem+var(--safe-top))] sm:pt-32">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="mb-5 max-w-sm text-center text-sm leading-7 text-rice-200/70"
      >
        三千年的锈，盖住了我内壁的字。
        <br />
        1975年，有人一点一点把它清理掉。
      </motion.p>

      <FogWipeReveal
        tone="rust"
        threshold={0.45}
        onRevealed={onRevealed}
        hint="用手指刮一刮，看看锈下面有什么"
        skipLabel="直接看看"
        // 用高度驱动尺寸（而不是 w-full），矮屏上会自动缩小而不是被裁掉
        className="mx-auto aspect-[4/5] h-[40vh] max-h-[400px] overflow-hidden rounded-lg border border-bronze-dark/60"
      >
        {/* 锈层之下：内壁底色 + 模糊的字影 */}
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
      </FogWipeReveal>

      <p className="mt-4 text-center text-[10px] text-rice-200/25">
        字影为示意呈现，非拓片实物 · 铭文全文共122字（含重文）
      </p>
    </div>
  );
}
