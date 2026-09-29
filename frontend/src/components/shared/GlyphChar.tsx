import type { CSSProperties } from "react";
import { HEZUN_GLYPHS, hasGlyph } from "../../data/artifacts/hezun-glyphs";

interface GlyphCharProps {
  char: string;
  className?: string;
  /** 笔画颜色（默认 gilt，走色板变量时由父层 className 控制） */
  stroke?: string;
  /** 笔画粗细（viewBox 100 坐标系下） */
  strokeWidth?: number;
  style?: CSSProperties;
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
}: GlyphCharProps) {
  const glyph = hasGlyph(char) ? HEZUN_GLYPHS[char] : null;
  if (!glyph) return null;

  return (
    <svg
      viewBox={glyph.viewBox}
      className={className}
      style={style}
      role="img"
      aria-label={`金文「${char}」摹写`}
    >
      {glyph.paths.map((d, i) => (
        <path
          key={i}
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
