import { motion } from "framer-motion";

interface BronzeWaterClockProps {
  /** 总章数（分母） */
  total: number;
  /** 已读章数（分子——水位） */
  read: number;
  /** 尺寸档：nav = 导航胶囊里的小图标；menu = 目录头部的大号 */
  size?: "nav" | "menu";
}

/**
 * 铜漏（西周计时器）：记录「我陪你读了多少」的水位。
 *
 * 语义刻意与章节目录分开（用户定调）：铜漏只记录、不可点、不导航——
 * 读过一章滴一格水，满了金光盈盈。它不是进度条催促（不显示百分比数字），
 * 是「时间在你这边流过」的陪伴感。
 *
 * 造型：青铜器剖面的壶身（宽口收颈垂腹）+ 壶内水位 + 颈口上方一滴
 * 将落未落的水珠（读新的章时滴下）。纯 SVG + framer-motion，零依赖。
 */
export default function BronzeWaterClock({ total, read, size = "nav" }: BronzeWaterClockProps) {
  const ratio = total > 0 ? Math.min(1, read / total) : 0;
  const big = size === "menu";

  // 壶身几何（viewBox 0 0 36 44）：宽口 30、收颈、垂腹高 24
  // 水位从壶底（y=38）随 ratio 涨到 y=18
  const waterTopY = 38 - ratio * 20;
  const isNewDrop = read > 0 && read < total; // 还有没读完的：滴一颗将落的水珠

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${
        big ? "h-11 w-9" : "h-[22px] w-[18px]"
      }`}
      aria-label={`铜漏：已读 ${read} / ${total} 章`}
      title={`陪我读了 ${read} / ${total} 章`}
    >
      <svg viewBox="0 0 36 44" className="h-full w-full" aria-hidden>
        {/* 壶身剖面：宽口 → 收颈 → 垂腹（青铜器剪影） */}
        <path
          d="M8 3 L28 3 L24 10 C30 14, 32 20, 32 27 C32 35, 26 40, 18 40 C10 40, 4 35, 4 27 C4 20, 6 14, 12 10 Z"
          fill="rgba(13,13,15,0.6)"
          stroke={ratio >= 1 ? "rgba(201,167,106,0.75)" : "rgba(201,167,106,0.4)"}
          strokeWidth={big ? 1.4 : 1.8}
        />
        {/* 口沿双线（铜器领口） */}
        <path
          d="M9 6 L27 6"
          stroke={ratio >= 1 ? "rgba(201,167,106,0.55)" : "rgba(201,167,106,0.3)"}
          strokeWidth={big ? 1 : 1.4}
        />
        {/* 水位（水位金色，随读数上涨；满时更亮） */}
        {ratio > 0 && (
          <path
            d={`M8 ${waterTopY} C6 ${waterTopY + 2}, 5 ${waterTopY + 5}, 5 27 C5 34, 10 38.5, 18 38.5 C26 38.5, 31 34, 31 27 C31 ${waterTopY + 5}, 30 ${waterTopY + 2}, 28 ${waterTopY} C24 ${waterTopY - 1}, 12 ${waterTopY - 1}, 8 ${waterTopY} Z`}
            fill={
              ratio >= 1
                ? "rgba(201,167,106,0.5)"
                : ratio >= 0.5
                  ? "rgba(201,167,106,0.38)"
                  : "rgba(201,167,106,0.28)"
            }
          />
        )}
        {/* 水面微光（读得越多越亮） */}
        {ratio > 0 && (
          <ellipse
            cx="18"
            cy={waterTopY}
            rx="10"
            ry="1.6"
            fill={`rgba(201,167,106,${0.25 + ratio * 0.35})`}
          />
        )}
      </svg>

      {/* 颈口上方的水珠：还有未读章节时悬着一颗，呼吸明灭（暗示「下一滴等你」） */}
      {isNewDrop && (
        <motion.span
          className={`absolute rounded-full bg-gilt-light ${
            big ? "h-[5px] w-[5px] -top-0.5" : "h-[3.5px] w-[3.5px] top-0"
          }`}
          style={{
            boxShadow: "0 0 6px rgba(201,167,106,0.7)",
            left: big ? "calc(50% - 2.5px)" : "calc(50% - 1.75px)",
          }}
          animate={{ opacity: [0.4, 0.95, 0.4] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* 满壶金光：全部读完时壶身外泛起微光 */}
      {ratio >= 1 && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(closest-side, rgba(201,167,106,0.25), transparent)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}
