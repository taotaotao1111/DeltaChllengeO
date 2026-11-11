import { motion, useReducedMotion } from "framer-motion";
import { getHistorySpan } from "../../utils/historySpan";

interface SpanBarProps { castYear: number; foundYear: number; note: string }

/** 亮色仅填充出土至今的真实比例；不把铸造至出土等同于连续埋藏。 */
export default function SpanBar({ castYear, foundYear, note }: SpanBarProps) {
  const year = new Date().getFullYear();
  const span = getHistorySpan(castYear, foundYear, year);
  const reduceMotion = useReducedMotion();
  return (
    <section className="history-span" aria-label="出土至今的时间比例">
      <div className="history-span__header">
        <strong className="history-span__number">{span.percent.toFixed(1)}<span>%</span></strong>
        <p>被重新看见的时间，只占我全部岁月的一小部分。</p>
        <details className="history-span__note">
          <summary aria-label="查看时间比例计算说明" title="计算说明">ⓘ</summary>
          <p>{note} 截至 {year} 年，比例为年代估算，不代表连续埋藏或无人知晓的时长。</p>
        </details>
      </div>
      <div className="history-span__track" role="progressbar" aria-label={`出土至${year}年的时间比例`}
        aria-valuenow={Number(span.percent.toFixed(1))} aria-valuemin={0} aria-valuemax={100}
        aria-valuetext={`约${span.percent.toFixed(1)}%，出土至今${span.sinceDiscovery}年`}>
        <motion.div initial={{ width: reduceMotion ? `${span.percent}%` : 0 }} whileInView={{ width: `${span.percent}%` }}
          viewport={{ once: true, amount: 0.5 }} transition={{ duration: reduceMotion ? 0 : 1.4, ease: "easeOut" }} className="history-span__fill" />
      </div>
      <div className="history-span__labels"><span>铸造至出土 · 约 {span.approximateBefore} 年</span><span>出土至今 · {span.sinceDiscovery} 年</span></div>
    </section>
  );
}
