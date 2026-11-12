import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { subscribeTracking } from "../../utils/tracking";
import { isAnalyticsFogVisible, subscribeAnalyticsSignals } from "../../utils/analyticsSignals";
import { createExplorationAnalytics, type AnalyticsContext } from "../../utils/explorationAnalytics";
import { nodeNames } from "../../services/analyticsService";

let tracker: ReturnType<typeof createExplorationAnalytics> | undefined;
function context(path: string): AnalyticsContext {
  const state = useGameStore.getState();
  const artifact = state.currentArtifactId;
  if (path === "/sources") return { step: "sources", artifact };
  if (state.memoryCardOpen) return { step: "memory", artifact };
  if (state.chatOpen) return { step: "ai", artifact };
  if (isAnalyticsFogVisible()) return { step: "fog", artifact };
  const parts = state.storyMoment?.id.split(":") ?? [];
  const node = [...parts].reverse().find((part) => Object.prototype.hasOwnProperty.call(nodeNames, part));
  if (state.stage !== "chapter") return { step: state.stage === "museum" ? "opening" : state.stage, artifact, node };
  const kind = getArtifact(artifact).chapters[state.chapterIndex]?.module.kind;
  const step = kind === "reveal" ? state.storyMoment?.id.includes(":reveal:derust") ? "derust" : "inscription" :
    kind === "flip" ? "reunion" : kind === "inscription" ? "inscription" : kind === "qa" ? "qa" : "observe";
  return { step, artifact, node };
}
/** 只接入后台记录，不增加任何用户端界面。管理员自身查报表不计访问。 */
export default function ExplorationAnalytics() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let dispose: (() => void) | undefined;
    // 跳过 StrictMode 的预挂载；等本轮场景效果设置完再读取初始环节。
    const timer = window.setTimeout(() => {
      tracker ??= createExplorationAnalytics();
      const disconnect = tracker.connect(() => context(pathname));
      let scheduled = false, alive = true;
      const sync = () => {
        if (scheduled) return; scheduled = true;
        queueMicrotask(() => { scheduled = false; if (alive) tracker?.sync(); });
      };
      const unsubscribe = useGameStore.subscribe(sync);
      const signals = subscribeAnalyticsSignals(sync);
      const events = subscribeTracking((name) => tracker?.record(name));
      dispose = () => { alive = false; unsubscribe(); signals(); events(); disconnect(); };
    }, 0);
    return () => { window.clearTimeout(timer); dispose?.(); };
  }, [pathname]);
  return null;
}
