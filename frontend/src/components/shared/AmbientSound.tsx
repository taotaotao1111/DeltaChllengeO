import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * 背景音乐：「宅兹中国」古琴铜铃环境曲（用户 Mureka 生成，3:25 无缝循环）。
 * 替换了初版程序合成底噪（scripts/gen-ambient.mjs 仍保留备用）。
 *
 * 播放纪律：
 * - **首次用户手势后才起播**（浏览器 autoplay 策略——museum 开场「推门进去」
 *   的点击就是天然的手势锚点）；
 * - 音量压到 8%——是氛围铺底，绝不盖过讲述节奏；
 * - 右下角常驻一个极小的静音开关（线框喇叭，挂「问问我」悬浮钮正上方）；
 *   偏好不持久化（每次进站重新按 autoplay 走，别用 localStorage 记忆静音
 *   ——下次进来悄悄没声音会像 bug）。
 */
const BGM_SRC = "audio/bgm.mp3";
const BGM_VOLUME = 0.08;
export default function AmbientSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 用户是否已给出过手势（起播条件） */
  const [armed, setArmed] = useState(false);
  const [muted, setMuted] = useState(false);
  /** 已成功起播（区分 armed 但被浏览器拒绝的情况） */
  const [playing, setPlaying] = useState(false);

  // 全局一次性手势监听（capture 阶段，任何点击/触摸都算）
  useEffect(() => {
    if (armed) return;
    const onGesture = () => setArmed(true);
    window.addEventListener("pointerdown", onGesture, { capture: true, once: true });
    return () => window.removeEventListener("pointerdown", onGesture, { capture: true });
  }, [armed]);

  // armed 后尝试起播（低音量）；被 autoplay 策略拒绝就静默放弃（画面不受影响）
  useEffect(() => {
    if (!armed || muted || !audioRef.current) return;
    const a = audioRef.current;
    a.volume = BGM_VOLUME;
    a.play()
      .then(() => setPlaying(true))
      .catch(() => {
        /* 手势后的 play 理论上不会被拦；万一被拦（极端浏览器策略）保持静默 */
      });
  }, [armed, muted]);

  // 静音开关：暂停/恢复（比 volume=0 省电）
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (muted) {
      a.volume = BGM_VOLUME;
      a.play()
        .then(() => {
          setMuted(false);
          setPlaying(true);
        })
        .catch(() => {});
    } else {
      a.pause();
      setMuted(true);
      setPlaying(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={BGM_SRC} loop preload="none" />
      {/* 静音开关：右下悬浮钮正上方（z 同层但错位，不遮不叠） */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: playing ? 0.75 : 0.5 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        onClick={toggle}
        aria-label={muted ? "打开环境声" : "静音"}
        title={muted ? "打开环境声" : "静音"}
        className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-40 flex h-8 w-8 items-center justify-center rounded-full border border-rice-100/15 bg-ink-900/60 text-rice-200/60 backdrop-blur-sm transition hover:border-rice-100/35 hover:text-rice-100/90 sm:bottom-[calc(5.75rem)] sm:right-8"
      >
        {/* 线框喇叭：播放时带一圈弧线（有声），静音时一道斜线（无声） */}
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8 L7.5 8 L11 4.5 L11 15.5 L7.5 12 L4 12 Z" />
          {playing ? (
            <>
              <path d="M13.5 7.5 C14.5 8.5, 14.5 11.5, 13.5 12.5" />
              <path d="M15.5 6 C17.2 7.8, 17.2 12.2, 15.5 14" />
            </>
          ) : (
            <path d="M13.5 8 L17 12 M17 8 L13.5 12" />
          )}
        </svg>
      </motion.button>
    </>
  );
}
