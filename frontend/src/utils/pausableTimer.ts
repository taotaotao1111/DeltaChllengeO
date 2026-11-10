/** 暂停时保留剩余时长；恢复不会重新开始整段，也不会重复执行。 */
export function createPausableTimer(callback: () => void, delay: number, paused = false) {
  let remaining = delay;
  let started = 0;
  let handle: ReturnType<typeof setTimeout> | null = null;
  let finished = false;
  const timer = {
    pause() {
      if (handle === null) return;
      clearTimeout(handle);
      handle = null;
      remaining = Math.max(0, remaining - (performance.now() - started));
    },
    resume() {
      if (finished || handle !== null) return;
      started = performance.now();
      handle = setTimeout(() => { handle = null; finished = true; callback(); }, remaining);
    },
    cancel() {
      if (handle !== null) clearTimeout(handle);
      handle = null;
      finished = true;
    },
  };
  if (!paused) timer.resume();
  return timer;
}
