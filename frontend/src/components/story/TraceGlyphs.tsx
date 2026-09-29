import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlyphChar from "../shared/GlyphChar";
import { HEZUN_GLYPHS } from "../../data/artifacts/hezun-glyphs";
import { track } from "../../utils/tracking";

/** canvas 内部分辨率：固定像素，retina 导出仍清晰 */
const CANVAS_PX = 600;
/** 字模从 viewBox 100 映射到 600 的缩放与内边距 */
const SCALE = 5.4;
const OFFSET = (CANVAS_PX - 100 * SCALE) / 2;

interface TraceGlyphsProps {
  /** 要描的字（须在 glyphs 表有精摹字形） */
  chars: string[];
  onComplete: (dataUrls: (string | null)[]) => void;
  onSkip: () => void;
}

/**
 * 金文描红：时间线终点、记忆卡之前的仪式。
 *
 * 不判对错、不打分——写歪了就歪着，那就是你的字。
 * 笔画用 pointer events 画在 canvas 上，底层是 glyphs 表的淡色字模。
 * 每字「下一个」时当场 toDataURL（canvas 随即被下一字清空重画）。
 */
export default function TraceGlyphs({ chars, onComplete, onSkip }: TraceGlyphsProps) {
  const [index, setIndex] = useState(0);
  const resultsRef = useRef<(string | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const char = chars[index];

  /** 画底层字模（淡轮廓 + gilt 外框）并清掉上一字的笔迹 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !char) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_PX * dpr;
    canvas.height = CANVAS_PX * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    hasInkRef.current = false;

    // 外框（描红簿的边框，不画十字米字格——会干扰字形）
    ctx.strokeStyle = "rgba(201,167,106,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, CANVAS_PX - 48, CANVAS_PX - 48);

    // 淡字模：glyphs 表的 paths 转 Path2D，从 viewBox 100 映射到 600
    const glyph = HEZUN_GLYPHS[char];
    if (glyph) {
      ctx.save();
      ctx.translate(OFFSET, OFFSET);
      ctx.scale(SCALE, SCALE);
      ctx.strokeStyle = "rgba(242,234,217,0.16)";
      ctx.lineWidth = 0.7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const d of glyph.paths) {
        const path = new Path2D(d);
        ctx.stroke(path);
      }
      ctx.restore();
    }
  }, [char]);

  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_PX,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_PX,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = posFromEvent(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // 落笔先点一个点（单点点击也有痕迹）
    ctx.strokeStyle = "#b8503f";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    hasInkRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const { x, y } = posFromEvent(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  /** 收字：有笔迹导出 dataURL，没笔迹记 null（跳过）；末字后回调 */
  const next = () => {
    const canvas = canvasRef.current;
    if (canvas && hasInkRef.current) {
      resultsRef.current[index] = canvas.toDataURL("image/png");
    } else {
      resultsRef.current[index] = null;
    }
    if (index + 1 < chars.length) {
      setIndex(index + 1);
    } else {
      track("glyph_trace_done", { artifactId: "hezun" });
      onComplete(resultsRef.current.slice(0, chars.length));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-ink-900/95 px-6"
    >
      <p className="text-xs tracking-widest text-gilt-light/70">
        把这几个字，亲手描一遍
      </p>
      <p className="mt-1 text-[10px] tracking-widest text-rice-200/30">
        {index + 1} / {chars.length} · {char}
      </p>

      {/* 参考字形（当前字的高亮小样） */}
      <div className="mt-4 h-8 w-8 text-gilt-light/70">
        <GlyphChar char={char} className="h-full w-full" strokeWidth={4} />
      </div>

      <div className="mt-6 aspect-square h-[52vh] max-h-[440px] max-w-[86vw]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="h-full w-full touch-none rounded-lg"
          style={{
            width: "100%",
            height: "100%",
            aspectRatio: "1 / 1",
            display: "block",
          }}
        />
      </div>

      <div className="mt-7 flex items-center gap-4">
        <button
          onClick={onSkip}
          className="text-[11px] text-rice-200/35 underline-offset-2 transition hover:text-rice-200/60"
        >
          跳过，直接看卡片
        </button>
        <button
          onClick={next}
          className="rounded-full bg-gilt/20 px-6 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
        >
          {hasInkRef.current ? "描好了，下一个 →" : "随手写写也行，下一个 →"}
        </button>
      </div>

      <AnimatePresence>
        {index === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-4 text-[10px] leading-5 text-rice-200/25"
          >
            三千年前的笔画，你补一笔。不判对错——写歪了，那就是你的字。
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
