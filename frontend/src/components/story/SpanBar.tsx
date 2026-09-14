import { motion } from "framer-motion";

interface SpanBarProps {
  /** 铸造年代（负数 = 公元前），仅用于画比例 */
  castYear: number;
  /** 出土年份 */
  foundYear: number;
  /** 底部的算法与来源说明 */
  note: string;
}

/**
 * 「三千年比例条」：把文物「无人知晓的时间」与「被人看见的时间」按真实比例并排画出来。
 *
 * 刻意只画这两段。时间线里「沉睡」那一节只写了「西周之后」，没有确切年份，
 * 硬给它分一段比例就是编数据 —— 而「铸造 → 被发现 → 今天」这两段完全可以直接相减，
 * 结论已经足够有冲击力。
 */
export default function SpanBar({ castYear, foundYear, note }: SpanBarProps) {
  const thisYear = new Date().getFullYear();

  const unseenYears = foundYear - castYear; // 何尊约 3000 年
  const seenYears = thisYear - foundYear; // 何尊约 60 余年
  const totalYears = unseenYears + seenYears;
  const seenPercent = (seenYears / totalYears) * 100;

  return (
    <div className="mx-auto w-full max-w-xl px-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-700">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - seenPercent}%` }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-ink-600 to-bronze-dark"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${seenPercent}%` }}
          transition={{ duration: 1.6, delay: 0.3, ease: "easeOut" }}
          // 这一小截刻意用最亮的暗金，让人一眼看到它有多窄
          className="h-full bg-gilt-light"
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] tracking-wider text-rice-200/40">
        <span>没有人知道我 · 约 {Math.round(unseenYears / 100) * 100} 年</span>
        <span className="text-gilt-light/70">被看见 · {seenYears} 年</span>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="mt-4 text-center text-sm leading-7 text-rice-200/70"
      >
        我被人看见的时间，只占我全部时间的
        <span className="mx-1 text-gilt-light">{seenPercent.toFixed(1)}%</span>。
      </motion.p>

      <p className="mt-2 text-center text-[10px] text-rice-200/25">{note}</p>
    </div>
  );
}
