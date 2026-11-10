import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createAmbientAudioController } from "../../utils/ambientAudio";

/**
 * 背景音乐：「宅兹中国」古琴铜铃环境曲（用户 Mureka 生成，3:25 无缝循环）。
 * 替换了初版程序合成底噪（scripts/gen-ambient.mjs 仍保留备用）。
 *
 * 播放纪律：
 * - **首次用户手势后才起播**（浏览器 autoplay 策略——museum 开场「推门进去」
 *   的点击就是天然的手势锚点）；
 * - 音量压到 8%——是氛围铺底，绝不盖过讲述节奏；
 * - 右上角常驻静音开关，使用无外框的金色线框喇叭；
 *   偏好不持久化（每次进站重新按 autoplay 走，别用 localStorage 记忆静音
 *   ——下次进来悄悄没声音会像 bug）。
 */
const BGM_SRC = "audio/bgm.mp3";
const BGM_VOLUME = 0.08;
export default function AmbientSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const controllerRef = useRef<ReturnType<typeof createAmbientAudioController> | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  /** 已成功起播（区分 armed 但被浏览器拒绝的情况） */
  const [playing, setPlaying] = useState(false);

  // 每次手势都可重试被手机系统中断的音频；视频占用期间控制器仍保持暂停。
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const controller = createAmbientAudioController(audio, setPlaying, BGM_VOLUME);
    controllerRef.current = controller;
    const onGesture = () => controller.setEnabled(!mutedRef.current);
    window.addEventListener("pointerdown", onGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  // 静音开关：暂停/恢复（比 volume=0 省电）
  const toggle = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    controllerRef.current?.setEnabled(!mutedRef.current);
  };

  return (
    <>
      <audio ref={audioRef} src={BGM_SRC} loop preload="none" />
      {/* 右上角与导航同排；44px 点击区域，图标本身不加边框。 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: playing ? 0.9 : 0.55 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        onClick={toggle}
        aria-label={muted ? "打开环境声" : "静音"}
        title={muted ? "打开环境声" : "静音"}
        aria-pressed={playing}
        className="fixed right-[calc(0.75rem+var(--safe-right))] top-[calc(0.5rem+var(--safe-top))] z-40 flex h-11 w-11 items-center justify-center rounded-full text-gilt-light transition-colors hover:bg-gilt/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt-light sm:right-[calc(2.5rem+var(--safe-right))] sm:top-[calc(1.5rem+var(--safe-top))]"
      >
        {/* 线框喇叭：播放时带一圈弧线（有声），静音时一道斜线（无声） */}
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m11 5-5 4H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4V5Z" />
          {playing ? (
            <>
              <path d="M15 9a5 5 0 0 1 0 6" />
              <path d="M18 6a9 9 0 0 1 0 12" />
            </>
          ) : (
            <path d="m16 9 6 6m0-6-6 6" />
          )}
        </svg>
      </motion.button>
    </>
  );
}
