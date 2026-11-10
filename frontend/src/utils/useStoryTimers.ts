import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { createPausableTimer } from "./pausableTimer";

type Timer = ReturnType<typeof createPausableTimer>;

export function useStoryTimers() {
  const timers = useRef(new Set<Timer>());
  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = createPausableTimer(() => { timers.current.delete(timer); callback(); }, delay, useGameStore.getState().chatOpen);
    timers.current.add(timer);
    return timer;
  }, []);
  const cancel = useCallback((timer: Timer) => { timer.cancel(); timers.current.delete(timer); }, []);
  useEffect(() => {
    const scheduled = timers.current;
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.chatOpen === previous.chatOpen) return;
      for (const timer of scheduled) { if (state.chatOpen) timer.pause(); else timer.resume(); }
    });
    return () => { unsubscribe(); for (const timer of scheduled) timer.cancel(); scheduled.clear(); };
  }, []);
  return { schedule, cancel };
}
