import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FogWipeRevealProps {
  children: React.ReactNode;
  /** 擦除比例达到多少后视为"看清了"，0-1 */
  threshold?: number;
  onRevealed?: () => void;
  hint?: string;
  className?: string;
  /**
   * 遮罩质感：
   * - `fog`（默认）水汽玻璃，用于展厅揭幕
   * - `rust` 铜锈，颗粒质感、偏绿，用于第三章"清理除锈"
   */
  tone?: "fog" | "rust";
  /**
   * 跳过按钮文案：传了才渲染（第三章刮卡按用户要求不显示；
   * 展厅雾擦需要兜底入口所以传「直接看看」）。
   */
  skipLabel?: string;
  /**
   * 图片盖层：不传时遮罩是 canvas 程序纹理（雾/锈）；
   * 传入 src 时盖层=这张图（如带锈的器物照片），刮开露出 children。
   * 仍需 canvas 做擦除（destination-out 打洞），只是纹理换成图片本身。
   * 生成纪律：图上再叠极淡的程序锈斑，让照片和颗粒质感接缝不生硬。
   */
  coverImageSrc?: string;
  /** 透传容器 style（边框等视觉定制，如黑金描边） */
  style?: React.CSSProperties;
}

/** 两种遮罩各自的色板与颗粒参数 */
const TONES = {
  fog: {
    // 墨色夜雾，呼应整体墨黑基调
    base: ["rgba(34,36,33,0.74)", "rgba(24,25,23,0.8)", "rgba(16,17,15,0.76)"],
    cloud: "60,68,56",
    cloudAlpha: 0.4,
    // 绝大多数暗调，少数带一点暗金/朱砂微光，像黑暗中雾气偶尔沾上的光
    tints: ["72,78,70", "201,167,106", "156,59,46"],
    grainCount: 420,
    grainMaxR: 16,
    /** 大颗粒是否加暗金高光 —— 水珠有，锈斑没有 */
    glint: true,
    blur: 2.5,
  },
  rust: {
    // 铜锈：偏绿的氧化层，比夜雾更实、更脏
    base: ["rgba(58,74,58,0.92)", "rgba(44,60,46,0.95)", "rgba(34,46,36,0.93)"],
    cloud: "96,124,96",
    cloudAlpha: 0.34,
    // 锈色三档：铜绿、土黄锈、深褐
    tints: ["104,132,102", "138,132,84", "62,52,38"],
    grainCount: 900,
    grainMaxR: 7,
    glint: false,
    blur: 1.2,
  },
} as const;

/**
 * 刮擦揭示效果 —— 不是一块扁平的灰色遮罩，而是有质感的覆盖层：
 * `fog` 模拟哈气玻璃上大小不一的水珠与云雾团块，`rust` 模拟青铜表面的锈壳颗粒。
 *
 * 底层是真实内容（文物插画 / 铭文字影），上层盖一层遮罩，
 * 用户用手指或鼠标划过时逐笔擦掉，露出下面的内容。
 *
 * 实现方式：Canvas + destination-out 合成模式；
 * 用一个降采样的小画布定期估算已擦除面积，超过阈值即视为"看清了"。
 */
export default function FogWipeReveal({
  children,
  threshold = 0.5,
  onRevealed,
  hint = "在雾气上划一划，看看是谁",
  className = "",
  tone = "fog",
  skipLabel,
  coverImageSrc,
  style,
}: FogWipeRevealProps) {
  const palette = TONES[tone];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isWipingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const revealedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [hintVisible, setHintVisible] = useState(true);
  const [faded, setFaded] = useState(false);
  /** 图片盖层加载完成后重画（没加载完之前用程序纹理顶着，不空白） */
  const [coverReady, setCoverReady] = useState(false);
  /** 已刮开百分比（进度角标用） */
  const [progress, setProgress] = useState(0);
  const coverImgRef = useRef<HTMLImageElement | null>(null);

  // 图片盖层：预加载，onload 后触发一次重绘（此时 canvas 尺寸已就绪）
  useEffect(() => {
    if (!coverImageSrc) return;
    const img = new Image();
    img.onload = () => {
      coverImgRef.current = img;
      setCoverReady(true);
    };
    img.src = coverImageSrc;
    return () => {
      img.onload = null;
    };
  }, [coverImageSrc]);

  const paintFog = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width, height } = canvas;
      const scale = width / 400; // 让颗粒尺寸在不同屏幕上保持相近的视觉比例

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);

      // 图片盖层：先铺照片（cover 满版，同 <img object-cover> 的裁法），再叠程序锈斑接缝
      const cover = coverImgRef.current;
      if (coverImageSrc && cover) {
        const scaleC = Math.max(width / cover.width, height / cover.height);
        const dw = cover.width * scaleC;
        const dh = cover.height * scaleC;
        ctx.drawImage(cover, (width - dw) / 2, (height - dh) / 2, dw, dh);
        // 极淡的程序锈斑覆在照片上：刮痕边缘的颗粒感和照片质感不脱节
        const veils = Math.round((90 * (width * height)) / (400 * 700));
        for (let i = 0; i < veils; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const r = (2 + Math.random() * 7) * scale;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${palette.tints[0]},${0.05 + Math.random() * 0.08})`);
          g.addColorStop(1, `rgba(${palette.tints[0]},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      // 基底渐变（程序纹理方案）
      const base = ctx.createLinearGradient(0, 0, width * 0.3, height);
      base.addColorStop(0, palette.base[0]);
      base.addColorStop(0.5, palette.base[1]);
      base.addColorStop(1, palette.base[2]);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      // 大块朦胧团块，营造不均匀的浓淡
      const CLOUDS = Math.round((14 * (width * height)) / (400 * 700));
      for (let i = 0; i < CLOUDS; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = (60 + Math.random() * 140) * scale;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${palette.cloud},${palette.cloudAlpha})`);
        g.addColorStop(1, `rgba(${palette.cloud},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 细密颗粒 —— fog 是大小不一的水珠，rust 是更密更小的锈斑
      const tints = palette.tints;
      const GRAINS = Math.round((palette.grainCount * (width * height)) / (400 * 700));
      for (let i = 0; i < GRAINS; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = (1.2 + Math.random() * Math.random() * palette.grainMaxR) * scale;
        const roll = Math.random();
        const tint = roll < 0.08 ? tints[1] : roll < 0.11 ? tints[2] : tints[0];
        const isAccent = tint !== tints[0];
        const alpha = isAccent ? 0.16 + Math.random() * 0.22 : 0.22 + Math.random() * 0.32;

        const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
        g.addColorStop(0, `rgba(${tint},${alpha + 0.12})`);
        g.addColorStop(0.6, `rgba(${tint},${alpha})`);
        g.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 较大的水珠加一点暗金高光，更有"水滴"的立体感；锈斑不需要（锈是哑光的）
        if (palette.glint && r > 5 * scale) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(201,167,106,${0.18 + Math.random() * 0.18})`;
          ctx.arc(x - r * 0.35, y - r * 0.4, Math.max(0.6, r * 0.18), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [palette, coverImageSrc],
  );

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    paintFog(canvas);
  }, [paintFog]);

  // 图片盖层加载完成后重画一次（此时 canvas 尺寸已由 resize 就绪）
  useEffect(() => {
    if (coverReady && canvasRef.current) paintFog(canvasRef.current);
  }, [coverReady, paintFog]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(() => resize());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resize]);

  const wipeAt = (x: number, y: number, prev: { x: number; y: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const brushR = canvas.width / 400 * 64;

    const draw = (px: number, py: number) => {
      const brush = ctx.createRadialGradient(px, py, 0, px, py, brushR);
      brush.addColorStop(0, "rgba(0,0,0,1)");
      brush.addColorStop(0.65, "rgba(0,0,0,0.95)");
      brush.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = brush;
      ctx.beginPath();
      ctx.arc(px, py, brushR, 0, Math.PI * 2);
      ctx.fill();
    };

    if (prev) {
      const dist = Math.hypot(x - prev.x, y - prev.y);
      const steps = Math.max(1, Math.ceil(dist / (brushR * 0.35)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        draw(prev.x + (x - prev.x) * t, prev.y + (y - prev.y) * t);
      }
    } else {
      draw(x, y);
    }
  };

  const checkCleared = useCallback(() => {
    if (revealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = document.createElement("canvas");
    }
    const sample = sampleCanvasRef.current;
    const SZ = 32;
    sample.width = SZ;
    sample.height = SZ;
    const sctx = sample.getContext("2d");
    if (!sctx) return;
    sctx.clearRect(0, 0, SZ, SZ);
    sctx.drawImage(canvas, 0, 0, SZ, SZ);
    const data = sctx.getImageData(0, 0, SZ, SZ).data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 80) cleared++;
    }
    const ratio = cleared / (SZ * SZ);
    // 进度角标实时更新（四舍五入到整数，避免每帧 setState 的渲染抖动）
    setProgress(Math.round(ratio * 100));
    if (ratio >= threshold) {
      revealedRef.current = true;
      setFaded(true);
      setProgress(100);
      onRevealed?.();
    }
  }, [threshold, onRevealed]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (faded) return;
    isWipingRef.current = true;
    setHintVisible(false);
    const pos = getPos(e);
    wipeAt(pos.x, pos.y, null);
    lastPointRef.current = pos;
    (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
    scheduleCheck();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isWipingRef.current || faded) return;
    const pos = getPos(e);
    wipeAt(pos.x, pos.y, lastPointRef.current);
    lastPointRef.current = pos;
    scheduleCheck();
  };

  const handlePointerUp = () => {
    isWipingRef.current = false;
    lastPointRef.current = null;
  };

  const scheduleCheck = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      checkCleared();
    });
  };

  const forceReveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setFaded(true);
    onRevealed?.();
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} style={style}>
      {children}

      <AnimatePresence>
        {!faded && (
          <motion.canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-grab touch-none"
            style={{ filter: `blur(${palette.blur}px)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>

      {/* 提示呼吸文案：不用 AnimatePresence exit——keyframes + repeat: Infinity
          会吃掉 exit transition（framer-motion 坑，线上实测 hint 残留在竞猜页），
          改为条件渲染：faded（揭示完成）一票否决，立即卸载。 */}
      {!faded && hintVisible && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ delay: 0.6, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-[16%] z-10 text-center text-sm tracking-wide text-rice-100"
        >
          {hint}
        </motion.p>
      )}

      {/* 右上角进度角标（金色胶囊） */}
      {!faded && (
        <span
          className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border px-2.5 py-1 text-[11px] tracking-wide text-gilt-light"
          style={{
            borderColor: "rgba(201,167,106,0.45)",
            background: "rgba(10,10,12,0.6)",
            backdropFilter: "blur(2px)",
          }}
        >
          除锈 {progress}%
        </span>
      )}

      {/* 跳过兜底（可选）：传 skipLabel 才渲染（第三章刮卡不传，按用户要求去掉） */}
      {!faded && skipLabel && (
        <button
          onClick={forceReveal}
          className="absolute right-4 top-4 z-10 rounded-full px-2.5 py-1.5 text-[11px] text-rice-200/40 transition hover:text-rice-200/70"
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
