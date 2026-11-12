import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { useStoryTimers } from "../../utils/useStoryTimers";
import { blurFogPixels, getFogClearedRatio, wipeFogStroke, type FogPoint, type FogSceneSnapshot } from "../../utils/fogMask";
import "./GlassFogReveal.css";
import { track } from "../../utils/tracking";
import { setAnalyticsFogVisible } from "../../utils/analyticsSignals";

/** 冷凝玻璃直接在 Canvas 上擦除，避免移动端不断换 CSS 遮罩与实时模糊的合成闪烁。 */
export default function GlassFogReveal({ children, className = "", threshold = 0.27, onRevealed,
  hint = "轻轻拂去雾气，看看谁在等你。", skipLabel = "跳过", snapshot }: {
  children: ReactNode; className?: string; threshold?: number; onRevealed?: () => void; hint?: string; skipLabel?: string;
  snapshot?: FogSceneSnapshot | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<number | null>(null);
  const previousRef = useRef<FogPoint | null>(null);
  const frameRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const lastMeasureRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const completedRef = useRef(false);
  const callbackRef = useRef(onRevealed);
  const [faded, setFaded] = useState(false);
  const [touched, setTouched] = useState(false);
  const reduceMotion = useReducedMotion();
  const { schedule } = useStoryTimers();
  useEffect(() => { callbackRef.current = onRevealed; }, [onRevealed]);
  useEffect(() => { setAnalyticsFogVisible(true); return () => setAnalyticsFogVisible(false); }, []);

  const complete = useCallback((reason: "wipe" | "skip" = "wipe") => {
    if (completedRef.current) return;
    completedRef.current = true;
    track(reason === "skip" ? "fog_skip" : "fog_complete");
    setAnalyticsFogVisible(false);
    pointerRef.current = null;
    previousRef.current = null;
    setFaded(true);
    schedule(() => callbackRef.current?.(), reduceMotion ? 0 : 800);
  }, [reduceMotion, schedule]);

  const redrawSurface = useCallback(() => {
    const root = rootRef.current;
    const texture = textureRef.current;
    const mask = maskRef.current;
    if (!root || !texture || !mask) return;
    const { width, height } = sizeRef.current;
    const ctx = texture.getContext("2d");
    if (!ctx || !width || !height) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, texture.width, texture.height);
    ctx.save();
    ctx.scale(texture.width / width, texture.height / height);
    paintFogScene(ctx, width, height, root, snapshotRef.current);
    paintCondensation(ctx, width, height);
    ctx.restore();
    // 只在初始化、真正改变尺寸或模型就绪时重建，已擦开的区域始终保留。
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0, texture.width, texture.height);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
    redrawSurface();
  }, [snapshot, redrawSurface]);

  useEffect(() => {
    const root = rootRef.current;
    const texture = textureRef.current;
    if (!root || !texture) return;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const width = Math.round(rect.width), height = Math.round(rect.height);
      if (width <= 0 || height <= 0) return;
      if (sizeRef.current.width === width && sizeRef.current.height === height) return;
      sizeRef.current = { width, height };
      const mask = maskRef.current ?? document.createElement("canvas");
      const maskWidth = 192;
      const maskHeight = Math.max(1, Math.round(maskWidth * height / width));
      // 旋转、地址栏伸缩后按比例保留擦痕，不能重新盖回去。
      const old = document.createElement("canvas");
      old.width = mask.width;
      old.height = mask.height;
      if (maskRef.current) old.getContext("2d")?.drawImage(mask, 0, 0);
      const hadMask = !!maskRef.current;
      mask.width = maskWidth;
      mask.height = maskHeight;
      const ctx = mask.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      if (hadMask) ctx.drawImage(old, 0, 0, maskWidth, maskHeight);
      else { ctx.fillStyle = "white"; ctx.fillRect(0, 0, maskWidth, maskHeight); }
      maskRef.current = mask;
      previousRef.current = null;
      pointerRef.current = null;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / Math.max(width, height));
      texture.width = Math.round(width * dpr);
      texture.height = Math.round(height * dpr);
      redrawSurface();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    return () => observer.disconnect();
  }, [redrawSurface]);

  const scheduleUpdate = () => {
    if (frameRef.current !== null) return;
    const tick = (time: number) => {
      frameRef.current = null;
      if (completedRef.current) return;
      if (dirtyRef.current && time - lastMeasureRef.current >= 120) {
        dirtyRef.current = false;
        const mask = maskRef.current;
        if (mask) {
          const ctx = mask.getContext("2d");
          if (ctx && getFogClearedRatio(ctx.getImageData(0, 0, mask.width, mask.height).data) >= threshold) complete();
          lastMeasureRef.current = time;
        }
      }
      if (dirtyRef.current) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const wipe = (event: PointerEvent<HTMLDivElement>) => {
    const mask = maskRef.current;
    const ctx = mask?.getContext("2d");
    if (!mask || !ctx) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = mask.width / rect.width;
    const point = { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
    const radius = Math.min(110, Math.max(42, Math.min(rect.width, rect.height) * 0.14)) * scale;
    wipeFogStroke(ctx, previousRef.current, point, radius);
    const texture = textureRef.current;
    const surface = texture?.getContext("2d");
    if (texture && surface) {
      const ratio = texture.width / mask.width;
      const from = previousRef.current;
      wipeFogStroke(surface, from ? { x: from.x * ratio, y: from.y * ratio } : null,
        { x: point.x * ratio, y: point.y * ratio }, radius * ratio);
    }
    previousRef.current = point;
    dirtyRef.current = true;
    scheduleUpdate();
  };
  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    previousRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // 停手时也检查最后一笔，避免刚好达到阈值却需要再碰一下。
    const mask = maskRef.current;
    const ctx = mask?.getContext("2d");
    if (mask && ctx && getFogClearedRatio(ctx.getImageData(0, 0, mask.width, mask.height).data) >= threshold) complete();
  };

  return <div ref={rootRef} className={`glass-fog ${faded ? "is-revealed" : ""} ${className}`}>
    <div className="glass-fog__ambience" aria-hidden="true" />
    <div className="glass-fog__scene">{children}</div>
    <div className="glass-fog__glass" aria-hidden="true">
      <canvas ref={textureRef} className="glass-fog__texture" />
    </div>
    {!faded && <>
      <div className="glass-fog__input" role="img" aria-label="用手指或鼠标拂去玻璃雾气，显现文物；也可使用跳过按钮"
        onPointerDown={(event) => {
          if (completedRef.current || pointerRef.current !== null || event.button !== 0) return;
          if (event.cancelable) event.preventDefault();
          pointerRef.current = event.pointerId;
          previousRef.current = null;
          setTouched(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          wipe(event);
        }} onPointerMove={(event) => {
          if (pointerRef.current === event.pointerId && !completedRef.current) {
            if (event.cancelable) event.preventDefault();
            wipe(event);
          }
        }} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer} />
      {!touched && <div className="glass-fog__invitation" aria-hidden="true">
        <svg className="glass-fog__gesture" viewBox="0 0 200 100" fill="none">
          <path className="glass-fog__swipe" d="M10 77Q65 14 126 31" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
          <path d="m149 81-14-18c-4-6-1-11 3-9l6 5-12-28c-3-7 3-11 7-5l12 22c0-7 7-7 10-1 1-6 8-5 10 1 4-3 9 0 11 6l6 19-4 17M147 63l-3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>{hint}</p>
        <span className="glass-fog__ornament">◇</span>
      </div>}
      <button type="button" className="glass-fog__skip" onClick={() => complete("skip")}>
        <span>{skipLabel}</span>
        <svg viewBox="0 0 14 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4.5 5 5 5-5 5" />
        </svg>
      </button>
    </>}
  </div>;
}

/** 模型静止时取景一次；移动端不在 WebGL 上叠加实时 backdrop-filter。 */
function paintFogScene(ctx: CanvasRenderingContext2D, width: number, height: number, root: HTMLElement, snapshot?: FogSceneSnapshot | null) {
  const preview = document.createElement("canvas");
  preview.width = Math.min(320, Math.round(width));
  const scale = preview.width / width;
  preview.height = Math.max(1, Math.round(height * scale));
  const paint = preview.getContext("2d", { willReadFrequently: true });
  if (!paint) return;
  paint.scale(scale, scale);
  paint.fillStyle = "#101110";
  paint.fillRect(0, 0, width, height);
  for (const [y, radius, color] of [[0, .65, "#ceaa6f44"], [.47, .6, "#b1996530"], [.78, .45, "#c3ac741a"]] as const) {
    const glow = paint.createRadialGradient(width / 2, height * y, 0, width / 2, height * y, Math.max(width, height) * radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "transparent");
    paint.fillStyle = glow;
    paint.fillRect(0, 0, width, height);
  }
  if (snapshot?.element.isConnected) {
    const bounds = snapshot.element.getBoundingClientRect();
    const origin = root.getBoundingClientRect();
    paint.drawImage(snapshot.image, bounds.left - origin.left, bounds.top - origin.top, bounds.width, bounds.height);
    const pixels = paint.getImageData(0, 0, preview.width, preview.height);
    blurFogPixels(pixels.data, preview.width, preview.height, Math.max(1, Math.round(5 * scale)));
    paint.putImageData(pixels, 0, 0);
  }
  ctx.drawImage(preview, 0, 0, width, height);
}

/** 一次性绘制冷凝纹理：细小水珠、下滑水痕、灰色雾面与顶部暖光，避免逐帧随机闪烁。 */
function paintCondensation(ctx: CanvasRenderingContext2D, width: number, height: number) {
  let seed = 1975;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const base = ctx.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, Math.max(width, height) * 0.78);
  base.addColorStop(0, "rgba(156,158,151,.28)");
  base.addColorStop(0.55, "rgba(116,123,123,.46)");
  base.addColorStop(1, "rgba(51,57,60,.69)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, Math.min(width, height) * 0.75);
  light.addColorStop(0, "rgba(255,215,154,.55)");
  light.addColorStop(0.35, "rgba(221,192,146,.19)");
  light.addColorStop(1, "rgba(214,192,154,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  // 浓淡不匀的水汽与细微磨砂颗粒，避免变成整齐的雨滴图案。
  for (let i = 0; i < 12; i++) {
    const x = random() * width, y = random() * height;
    const radius = Math.min(width, height) * (0.15 + random() * 0.4);
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, `rgba(190,191,182,${0.05 + random() * 0.09})`);
    cloud.addColorStop(1, "rgba(190,191,182,0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const grains = Math.min(18000, Math.round(width * height / 30));
  for (let i = 0; i < grains; i++) {
    const bright = random() > 0.5;
    ctx.fillStyle = bright ? "rgba(235,228,207,.08)" : "rgba(29,34,35,.07)";
    const radius = 0.25 + random() * 0.65;
    ctx.fillRect(random() * width, random() * height, radius, radius);
  }
  const count = Math.min(3600, Math.round(width * height / 240));
  for (let i = 0; i < count; i++) {
    const x = random() * width, y = random() * height;
    const r = 0.3 + random() ** 3 * 2.8;
    const stretch = 1 + random() * 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * stretch, -0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(27,32,33,${0.06 + random() * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(226,218,191,${0.08 + random() * 0.2})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * stretch * 0.38, Math.max(0.2, r * 0.3), Math.max(0.3, r * 0.45), 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,226,180,.27)";
    ctx.fill();
    if (r > 2 && random() > 0.92) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 2, y + 16, x - 2, y + 28, x + 1, y + 32 + random() * 65);
      ctx.strokeStyle = "rgba(221,210,181,.12)";
      ctx.lineWidth = r * 0.6;
      ctx.stroke();
    }
  }
}
