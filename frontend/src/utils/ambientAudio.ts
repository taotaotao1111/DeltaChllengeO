let holds = 0;
const listeners = new Set<(suspended: boolean) => void>();

export function isAmbientAudioSuspended() { return holds > 0; }
export function subscribeAmbientAudio(listener: (suspended: boolean) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** 视频先取得音频焦点，关闭时同步归还，兼容手机的用户手势播放限制。 */
export function suspendAmbientAudio() {
  holds += 1;
  listeners.forEach((listener) => listener(true));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    listeners.forEach((listener) => listener(holds > 0));
  };
}

type AudioPort = Pick<HTMLAudioElement, "play" | "pause" | "paused" | "volume" | "addEventListener" | "removeEventListener">;

/** 用户意愿和临时视频占用分开保存；恢复时不重置播放进度。 */
export function createAmbientAudioController(audio: AudioPort, onPlaying: (playing: boolean) => void, volume = 0.08) {
  let enabled = false;
  let suspended = isAmbientAudioSuspended();
  let generation = 0;
  const sync = () => {
    const request = ++generation;
    if (!enabled || suspended) { audio.pause(); onPlaying(false); return; }
    audio.volume = volume;
    void audio.play().then(() => {
      if (request === generation) onPlaying(!audio.paused);
    }).catch(() => { if (request === generation) onPlaying(false); });
  };
  const onPause = () => onPlaying(false);
  audio.addEventListener("pause", onPause);
  const unsubscribe = subscribeAmbientAudio((value) => { suspended = value; sync(); });
  return {
    setEnabled(value: boolean) { enabled = value; sync(); },
    dispose() {
      generation += 1;
      unsubscribe();
      audio.removeEventListener("pause", onPause);
      audio.pause();
    },
  };
}
