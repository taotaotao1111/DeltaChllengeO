import { useEffect, useRef, type CSSProperties } from "react";
import { HEZUN_GLYPHS, hasGlyph } from "../../data/artifacts/hezun-glyphs";
import "./GlyphChar.css";

interface GlyphCharProps {
  char: string;
  className?: string;
  /** 笔画颜色（默认 gilt，走色板变量时由父层 className 控制） */
  stroke?: string;
  /** 笔画粗细（viewBox 100 坐标系下） */
  strokeWidth?: number;
  style?: CSSProperties;
  /**
   * 笔画生长：挂载后每条笔道从起点「写」到终点（stroke-dashoffset 从满偏移回 0），
   * 替代整字淡入——像三千年前有人当面写这个字。
   * 笔画间错峰 ~130ms/笔，整字约 0.5-0.8s（随笔画数）。
   * 多段 M 的 path（如「宀」两侧斜撑）会同时生长——金文分笔本就同锋并出。
   */
  grow?: boolean;
  /** grow 模式下额外延迟（ms）：父层做段内逐字错峰时用 */
  growDelay?: number;
  /** 描金完成后呈现浮雕层次；正交投影，不改变字的大小。 */
  relief?: boolean;
}

/**
 * 单个金文字形的 SVG 渲染：查 hezun-glyphs 表转 <svg><path/></svg>。
 *
 * 只负责「有精摹字」的渲染；未收录字由父层走示意字位（跟 RustReveal
 * 的抽象笔画块同一纪律）——不在这里悄悄兜底，逼调用方明确选择。
 *
 * 注意：这不是拓片。摹写字形、来源见 glyphs 数据模块的文件头注释。
 */
export default function GlyphChar({
  char,
  className = "",
  stroke = "currentColor",
  strokeWidth = 3.2,
  style,
  grow = false,
  growDelay = 0,
  relief = false,
}: GlyphCharProps) {
  const glyph = hasGlyph(char) ? HEZUN_GLYPHS[char] : null;
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);

  // 笔画生长：先量每笔长度 → dash 满偏移（隐藏）→ 下一帧把 offset 拉回 0
  // 触发 CSS transition（挂载后一帧再改值，浏览器才播动画）。
  useEffect(() => {
    if (!glyph || !grow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const paths = pathsRef.current.filter((p): p is SVGPathElement => !!p);
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = "none";
    });
    let drawRaf: number | undefined;
    const raf = requestAnimationFrame(() => {
      drawRaf = requestAnimationFrame(() => {
        paths.forEach((p, i) => {
          p.style.transition = `stroke-dashoffset 0.32s ease-out ${growDelay + i * 130}ms`;
          p.style.strokeDashoffset = "0";
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (drawRaf !== undefined) cancelAnimationFrame(drawRaf);
    };
  }, [glyph, grow, growDelay]);

  if (!glyph) return null;
  // 等最后一笔描完再浮起，额外留两帧给笔画过渡的起始帧。
  const reliefDelay = grow ? growDelay + Math.max(0, glyph.paths.length - 1) * 130 + 320 + 64 : 0;
  const glyphStyle = relief
    ? { ...style, "--glyph-relief-delay": `${reliefDelay}ms` } as CSSProperties
    : style;

  return (
    <svg
      viewBox={glyph.viewBox}
      className={`${className}${relief ? " glyph-char--relief" : ""}`}
      style={glyphStyle}
      role="img"
      aria-label={`金文「${char}」摹写`}
    >
      {glyph.paths.map((d, i) => (
        <path
          key={i}
          ref={(el) => {
            pathsRef.current[i] = el;
          }}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
