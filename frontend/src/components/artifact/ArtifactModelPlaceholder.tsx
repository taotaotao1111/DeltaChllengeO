import { motion } from "framer-motion";

interface ArtifactModelPlaceholderProps {
  /** 0-1 的下载进度；null 表示进度未知（服务端没给 Content-Length，或还在下载 3D 代码） */
  progress: number | null;
  className?: string;
}

/**
 * 模型加载中的中性占位。
 *
 * 刻意不显示那张 2.5D 手绘插画——插画是「WebGL 不可用 / 模型加载失败」时的正式降级形态，
 * 拿它当加载态会让用户先看到一幅画、再突然换成实物，观感是"闪了一下"。
 * 这里只给一圈很克制的暗金微光和一句「正在唤醒」，把注意力留给随后淡入的真模型。
 */
export default function ArtifactModelPlaceholder({
  progress,
  className = "",
}: ArtifactModelPlaceholderProps) {
  const percent = progress === null ? null : Math.round(progress * 100);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* 呼吸的光晕，暗示"里面有东西正在醒过来" */}
        <motion.span
          className="absolute inset-0 rounded-full bg-gilt/10 blur-2xl"
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-3 rounded-full border border-gilt/25"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="h-1.5 w-1.5 rounded-full bg-gilt-light/70" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs tracking-widest text-rice-200/45">正在唤醒…</p>

        <div className="h-[2px] w-28 overflow-hidden rounded-full bg-rice-100/10">
          {percent === null ? (
            // 进度未知时用一段来回游走的微光，避免假装知道百分比
            <motion.div
              className="h-full w-1/3 rounded-full bg-gilt/60"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <motion.div
              className="h-full rounded-full bg-gilt/70"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          )}
        </div>

        {percent !== null && (
          <p className="text-[10px] tabular-nums tracking-wider text-rice-200/30">{percent}%</p>
        )}
      </div>
    </div>
  );
}
