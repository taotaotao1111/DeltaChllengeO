import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface RustCompareProps {
  /** 带锈图（除锈前） */
  beforeSrc: string;
  /** 除锈后图 */
  afterSrc: string;
  caption?: string;
  /** 对比完成后进入下一步 */
  onDone: () => void;
  /** 出口按钮文案（无引导性，同 GuessChoice 纪律） */
  nextLabel?: string;
}

/**
 * 除锈前后对比滑杆：第三章刮锈交互之后的「看一眼真实的前后」。
 *
 * 两张同角度示意图叠放，拖动分割线左右对比——纪录片式 before/after。
 * 素材是 AI 示意图（器型非严格何尊）：caption 必须如实标注，
 * 别让用户把它当实物照片（本项目不伪造史料底线）。
 *
 * 交互：拖动分割线（pointer events + pointer capture，同 TraceGlyphs 手感）；
 * 键盘/点击按钮兜底前进。初始 30%——先看到大部分锈，往右拖才见铜色。
 */
export default function RustCompare({
  beforeSrc,
  afterSrc,
  caption,
  onDone,
  nextLabel = "继续 →",
}: RustCompareProps) {
  /** 分割线位置（0=全带锈，1=全除锈后），0..1 */
  const [pos, setPos] = useState(0.3);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const updateFromClientX = (clientX: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-[calc(2.5rem+var(--safe-bottom))] pt-[calc(9.5rem+var(--safe-top))] sm:pt-32">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="mb-5 max-w-sm text-center text-sm leading-7 text-rice-200/70"
      >
        我身上的变化，你拖动看看——
        <br />
        左边是锈盖了三千年的样子，右边是 1975 年清理之后。
      </motion.p>

      {/* 对比框：after 在底、before 在上用 clip-path 裁掉右侧 */}
      <div
        ref={frameRef}
        className="relative mx-auto aspect-[2/3] h-[42vh] max-h-[460px] cursor-ew-resize touch-none select-none overflow-hidden rounded-lg border border-bronze-dark/60"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromClientX(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <img
          src={afterSrc}
          alt="除锈后（示意）"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos * 100}% 0 0)` }}
        >
          <img
            src={beforeSrc}
            alt="带锈（示意）"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* 分割线 + 手柄 */}
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ left: `${pos * 100}%` }}
        >
          <div className="absolute inset-y-0 -left-px w-0.5 bg-gilt-light/80 shadow-[0_0_10px_rgba(201,167,106,0.5)]" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gilt-light/70 bg-ink-900/70 backdrop-blur-sm">
              <span className="text-[10px] text-gilt-light">↔</span>
            </div>
          </div>
        </div>

        {/* 两端标签 */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-ink-900/60 px-2 py-0.5 text-[9px] tracking-widest text-rice-200/60">
          带锈
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-ink-900/60 px-2 py-0.5 text-[9px] tracking-widest text-gilt-light/70">
          除锈后
        </span>
      </div>

      {caption && (
        <p className="mt-3 text-center text-[10px] leading-4 text-rice-200/25">{caption}</p>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={onDone}
        className="mt-6 rounded-full bg-gilt/20 px-6 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
      >
        {nextLabel}
      </motion.button>
    </div>
  );
}
