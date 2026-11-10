import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import type { StoryMoment } from "../types/artifact";

/** 按内容值更新，避免模块重新渲染时丢失剧情停顿与聊天上下文。 */
export function useStoryMoment(moment: StoryMoment) {
  const setMoment = useGameStore((s) => s.setStoryMoment);
  const clearMoment = useGameStore((s) => s.clearStoryMoment);
  const serialized = JSON.stringify(moment);
  useEffect(() => {
    const value: StoryMoment = JSON.parse(serialized);
    setMoment(value);
    return () => clearMoment(value.id);
  }, [serialized, setMoment, clearMoment]);
}
