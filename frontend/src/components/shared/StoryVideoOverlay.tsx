import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { suspendAmbientAudio } from "../../utils/ambientAudio";
import { useScrollLock } from "../../utils/useScrollLock";
import { playStoryVideo } from "../../utils/storyVideo";

/**
 * 自我介绍视频浮层：全屏黑场 + 自定义控件（播放/暂停 + 进度条外置在视频下方）。
 * 视频自带烧录字幕在画面底部，原生 controls 的进度条会和它叠行——所以不用 controls，
 * 播放/暂停点击视频本体切换，进度条独立一条摆在视频外。
 */
export default function StoryVideoOverlay({ src, poster, title, onClose, onComplete }: {
  src: string; poster?: string; title: string; onClose: () => void; onComplete?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useScrollLock(true);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const releaseAudioRef = useRef<(() => void) | null>(null);
  const closingRef = useRef(false);
  const playbackRequestRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  const playWithSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const request = ++playbackRequestRef.current;
    setPlaybackBlocked(false);
    setMuted(false);
    void playStoryVideo(v).catch(() => {
      if (request !== playbackRequestRef.current || closingRef.current) return;
      v.pause();
      setPaused(true);
      setPlaybackBlocked(true);
    });
  }, []);

  // 父层在点击内同步挂载；layout effect 先暂停环境声，再立即带声播放。
  useLayoutEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const release = suspendAmbientAudio();
    closingRef.current = false;
    releaseAudioRef.current = release;
    playWithSound();
    return () => {
      playbackRequestRef.current += 1;
      v.pause();
      release();
      if (releaseAudioRef.current === release) releaseAudioRef.current = null;
    };
  }, [playWithSound]);

  const closeVideo = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    playbackRequestRef.current += 1;
    videoRef.current?.pause();
    // 在关闭按钮的用户手势内恢复音乐，不等卸载后的 effect。
    releaseAudioRef.current?.();
    onClose();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.muted) playWithSound();
    else {
      playbackRequestRef.current += 1;
      v.pause();
    }
  };

  /** 进度条 seek：pointer 事件换算比例跳转（点击 + 按住拖动） */
  const seekToEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = p * v.duration;
    setProgress(p);
  };

  return createPortal(
    <dialog ref={dialogRef} aria-label={`预设剧情：${title}`} onCancel={(event) => { event.preventDefault(); closeVideo(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-ink-900 p-0 text-rice-100 outline-none backdrop:bg-ink-900">
    <motion.div
      key="intro-video"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex touch-none flex-col items-center justify-center bg-ink-900/95 px-4"
    >
      <video
        ref={videoRef}
        src={src}
        aria-label={title}
        poster={poster}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onPlay={() => { setPaused(false); setPlaybackBlocked(false); }}
        onPause={() => setPaused(true)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress(v.currentTime / v.duration);
        }}
        onEnded={() => {
          if (closingRef.current) return;
          onComplete?.();
          closeVideo();
        }}
        className="max-h-[72vh] w-full max-w-4xl cursor-pointer rounded-md border border-gilt/20 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
      />

      {/* 浏览器拦截播放时等待明确点击，避免无声地继续播放。 */}
      {(playbackBlocked || muted) && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={playWithSound}
          className="mt-3 flex items-center gap-2 rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.25)] transition hover:bg-gilt/30"
        >
          <span aria-hidden>▷</span> 点击播放并开启声音
        </motion.button>
      )}

      {/* 外置进度条：支持点击跳转 + 拖拽 seek */}
      <div className="mt-3 w-full max-w-2xl">
        <div
          className="group relative h-4 w-full cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekToEvent(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) seekToEvent(e); // 按住拖动
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-rice-200/15 group-hover:h-1.5 transition-all">
            <div
              className="h-full rounded-full bg-gilt-light/70"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] tracking-widest text-rice-200/40">
          {playbackBlocked ? "播放尚未开始，请点击上方按钮" : muted ? "声音已关闭，可点击开启" : paused ? "已暂停 · 点击画面继续" : "点击画面可暂停"}
        </p>
      </div>

      <button
        onClick={closeVideo}
        type="button"
        className="mt-5 min-h-11 rounded-full border border-gilt/30 px-5 py-2 text-xs tracking-wide text-gilt-light outline-none transition hover:bg-gilt/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt-light"
      >
        返回这段故事 →
      </button>
    </motion.div>
    </dialog>, document.body,
  );
}
