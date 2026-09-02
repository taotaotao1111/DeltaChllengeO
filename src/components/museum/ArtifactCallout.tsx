import { motion } from "framer-motion";

interface ArtifactCalloutProps {
  /** 焦点在图片坐标系里的位置（百分比字符串，如 "48%"） */
  left: string;
  top: string;
  /** 是否正在进场——进场时环停下来、光晕炸开 */
  entering?: boolean;
}

/** 两圈脉冲环的起始时间差，让它们一前一后荡出去而不是叠在一起 */
const RING_DELAYS = [0, 1.6];

/**
 * 「唤醒光」——叠在展柜上的呼吸光晕 + 脉冲环。
 *
 * 放在文物身上而不是屏幕底部：用户的视线本来就在展柜上，
 * 引导和注视点合一才有钩子的作用。
 *
 * 环的视觉刻意和 ArtifactHotspot 保持一致（暗金细环 + 中心点 + 荡开的涟漪），
 * 这样用户在开场就先学会「环 = 可以点」，进第一章遇到真热点时不用再教一遍。
 */
export default function ArtifactCallout({ left, top, entering = false }: ArtifactCalloutProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
    >
      {/* 暖光晕：像展柜里的灯被拨亮了一点。进场时迅速扩张并提亮 */}
      <motion.span
        animate={
          entering
            ? { opacity: 0.85, scale: 2.6 }
            : { opacity: [0.2, 0.55, 0.2], scale: [1, 1.1, 1] }
        }
        transition={
          entering
            ? { duration: 0.6, ease: "easeOut" }
            : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }
        /*
          居中必须交给 framer 的 x/y，不能用 Tailwind 的 -translate-*：
          framer 会用自己算出的 transform 覆盖 class 里的 translate，光晕会偏出去半个身位。
        */
        style={{ x: "-50%", y: "-50%" }}
        className="absolute left-1/2 top-1/2 h-44 w-44 rounded-full bg-gilt/40 blur-3xl sm:h-60 sm:w-60"
      />

      {/* 脉冲环：一前一后荡出去。进场后不再继续，避免和推门动效打架 */}
      {!entering &&
        RING_DELAYS.map((delay) => (
          <motion.span
            key={delay}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.55, 1.7, 2.1] }}
            transition={{ duration: 3.2, repeat: Infinity, delay, ease: "easeOut" }}
            /*
              drop-shadow 是为了在明亮的青铜纹饰上也能看清环线；
              x/y 负责居中——同上，framer 的 transform 会盖掉 Tailwind 的 -translate-*。
            */
            style={{ x: "-50%", y: "-50%", filter: "drop-shadow(0 0 4px rgba(0,0,0,0.9))" }}
            /*
              环的最大直径刻意压到略小于展柜宽度：再大就会越到两侧边柜上，
              看起来像贴了个 loading 圈，而不是这件器物自己在发光。
            */
            className="absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-gilt-light/80 sm:h-24 sm:w-24"
          />
        ))}

      {/* 中心点：环荡开时它一直亮着，是"这里有东西"的锚 */}
      <motion.span
        animate={entering ? { opacity: 0, scale: 1.8 } : { opacity: [0.6, 1, 0.6] }}
        transition={
          entering
            ? { duration: 0.45, ease: "easeOut" }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative block"
      >
        {/* 先垫一小片暗底：青铜纹饰本身很亮，纯亮点会被吃掉 */}
        <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-900/60 blur-[5px]" />
        <span className="relative block h-2 w-2 rounded-full bg-gilt-light shadow-[0_0_16px_rgba(201,167,106,1)] sm:h-2.5 sm:w-2.5" />
      </motion.span>
    </div>
  );
}
