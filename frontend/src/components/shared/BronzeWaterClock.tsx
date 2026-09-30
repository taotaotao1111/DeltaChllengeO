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
 * 铜漏（漏刻）：记录「我陪你读了多少」的水位。
 *
 * 语义刻意与章节目录分开（用户定调）：铜漏只记录、不可点、不导航——
 * 读过一章滴一格水，满了金光盈盈。不是进度条催促，是陪伴感。
 *
 * 造型（v2，用户嫌 v1 简陋后重画）：**双层漏刻**才是铜漏本来的样子——
 * 上层贮水壶（漏滴）+ 下层受水壶（水位在这里涨）。方形 viewBox 器形
 * 居中，letterbox 消失（v1 36×44 长方形 viewBox 在方形容器里被缩放错位
 * 且壶顶 3 底 40 重心偏下——怎么调 margin 都是补救）。加口沿、圈足、
 * 竖向刻箭（漏刻的「刻」——受水壶侧的刻度线），水珠下滴动画。
 */
export default function BronzeWaterClock({ total, read, size = "nav" }: BronzeWaterClockProps) {
  const ratio = total > 0 ? Math.min(1, read / total) : 0;
  const big = size === "menu";

  // viewBox 0 0 24 24，器形整体居中：
  // 上壶：口 y=2、腹 y=7..12；滴嘴 y=13；下壶：y=14..21、圈足 y=21.5
  // 下壶水位从 y=20.3 涨到 y=15.2
  const waterTopY = 20.3 - ratio * 5.1;
  const stroke = ratio >= 1 ? "rgba(201,167,106,0.85)" : "rgba(201,167,106,0.55)";
  const waterFill =
    ratio >= 1 ? "rgba(201,167,106,0.55)" : ratio > 0 ? "rgba(201,167,106,0.35)" : "transparent";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${
        big ? "h-11 w-11" : "h-[24px] w-[24px]"
      }`}
      aria-label={`铜漏：已读 ${read} / ${total} 章`}
      title={`陪我读了 ${read} / ${total} 章`}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        {/* ── 上壶（贮水壶，铜漏的水从这里滴下）── */}
        {/* 口沿：外撇的宽口 */}
        <path
          d="M7.2 2.2 H16.8 M8 3.4 L16 3.4"
          stroke={stroke}
          strokeWidth={big ? 0.9 : 1.2}
          strokeLinecap="round"
          fill="none"
        />
        {/* 上壶身：收颈垂腹 */}
        <path
          d="M8.6 3.4 C9.4 5.2, 10 6.8, 10 8.2 C10 10.2, 8.8 11.4, 8.8 12.2 C8.8 12.9, 9.6 13.4, 12 13.4 C14.4 13.4, 15.2 12.9, 15.2 12.2 C15.2 11.4, 14 10.2, 14 8.2 C14 6.8, 14.6 5.2, 15.4 3.4"
          stroke={stroke}
          strokeWidth={big ? 1.1 : 1.5}
          strokeLinejoin="round"
          fill="rgba(13,13,15,0.5)"
        />
        {/* ── 下壶（受水壶：水位在这里涨）── */}
        <path
          d="M5.5 14.4 C5.5 13.8, 6 13.5, 7 13.5 H17 C18 13.5, 18.5 13.8, 18.5 14.4 C18.5 17.5, 17 20.8, 12 20.8 C7 20.8, 5.5 17.5, 5.5 14.4 Z"
          stroke={stroke}
          strokeWidth={big ? 1.1 : 1.5}
          strokeLinejoin="round"
          fill="rgba(13,13,15,0.5)"
        />
        {/* 受水壶的水位（读一章涨一格） */}
        {ratio > 0 && (
          <path
            d={`M6.1 ${waterTopY + 1.2} C6.1 17.5, 7.4 20.2, 12 20.2 C16.6 20.2, 17.9 17.5, 17.9 ${waterTopY + 1.2} C17.9 ${waterTopY + 0.4}, 17.3 ${waterTopY}, 16.5 ${waterTopY} C14.5 ${waterTopY - 0.3}, 9.5 ${waterTopY - 0.3}, 7.5 ${waterTopY} C6.7 ${waterTopY}, 6.1 ${waterTopY + 0.4}, 6.1 ${waterTopY + 1.2} Z`}
            fill={waterFill}
          />
        )}
        {/* 水面微光 */}
        {ratio > 0 && (
          <ellipse
            cx="12"
            cy={waterTopY + 0.2}
            rx="5.6"
            ry="0.9"
            fill={`rgba(201,167,106,${0.3 + ratio * 0.4})`}
          />
        )}
        {/* 竖向刻箭（漏刻的「刻」）：受水壶右侧的刻度 */}
        <path
          d="M19.6 15.2 L20.4 15.2 M19.3 16.6 L20.4 16.6 M19 18 L20.4 18 M18.7 19.4 L20.4 19.4"
          stroke="rgba(201,167,106,0.35)"
          strokeWidth={big ? 0.7 : 0.9}
          strokeLinecap="round"
          fill="none"
        />
        {/* 圈足 */}
        <path
          d="M9 20.8 H15 L15.4 22 H8.6 Z"
          stroke={stroke}
          strokeWidth={big ? 1 : 1.3}
          strokeLinejoin="round"
          fill="rgba(13,13,15,0.5)"
        />
      </svg>

      {/* 壶嘴水珠：还有未读章节时一颗水珠正从上壶滴向下壶，
          缓慢下落循环——漏刻在走，下一滴等你 */}
      {read > 0 && ratio < 1 && (
        <motion.span
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-gilt-light ${
            big ? "h-[4.5px] w-[4.5px]" : "h-[3px] w-[3px]"
          }`}
          style={{ boxShadow: "0 0 5px rgba(201,167,106,0.8)" }}
          animate={{ top: [big ? "34%" : "34%", big ? "56%" : "56%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeIn", times: [0, 0.15, 0.85, 1] }}
        />
      )}

      {/* 满壶金光：全部读完时壶身外泛起微光 */}
      {ratio >= 1 && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(closest-side, rgba(201,167,106,0.3), transparent)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}
