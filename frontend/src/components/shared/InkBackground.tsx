import { motion } from "framer-motion";

interface InkBackgroundProps {
  /** 0(全黑闭馆) -> 1(展柜完全亮起) 的过渡强度 */
  glow?: number;
  tone?: "night" | "bronze";
}

/**
 * 全局氛围背景：墨黑基调 + 水墨晕染 + 宣纸噪点 + 雾气。
 * 纯 CSS / SVG / Framer Motion 实现，不依赖 Canvas，性能开销很低。
 */
export default function InkBackground({ glow = 0, tone = "night" }: InkBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-ink-900 paper-noise">
      {/* 水墨晕染色块 */}
      <motion.div
        className="absolute -left-1/4 -top-1/4 h-[70vh] w-[70vw] rounded-full blur-3xl"
        style={{
          background:
            tone === "bronze"
              ? "radial-gradient(circle, rgba(122,97,31,0.22), transparent 65%)"
              : "radial-gradient(circle, rgba(60,68,56,0.25), transparent 65%)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 20, 40, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(91,100,89,0.18), transparent 70%)" }}
        animate={{ x: [0, -30, 10, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 展柜聚光：随 glow 渐显 */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[55vh] w-[45vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(201,167,106,0.16), rgba(201,167,106,0.03) 60%, transparent 80%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: glow }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />

      {/* 顶部/底部渐暗，制造舞台感 */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/60 via-transparent to-ink-900/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/40 via-transparent to-ink-900/40" />
    </div>
  );
}
