import { AnalyticsClock } from "./analyticsClock";
import { expectationApiUrl } from "../services/expectationService";

export interface AnalyticsContext { step: string; artifact: string; node?: string }
interface AnalyticsEvent extends AnalyticsContext { id: string; seq: number; name: string; at: number; duration: number }
interface Pending { sessionId: string; event: AnalyticsEvent }
const recordedEvents = new Set(["fog_complete", "fog_skip", "chapter_complete", "hotspot_discover", "flip_card_view", "inscription_section_view", "appraise_answer", "story_complete", "memory_card_open", "expectation_submit", "encounter_finish", "glyph_trace_done", "chat_reply", "session_resume", "continue_mainline", "deep_dive_open", "menu_navigation"]);
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 每个页面实例一次访问；连续 30 分钟无操作后再交互计新访问。不落盘，不上传输入正文。 */
export function createExplorationAnalytics() {
  let sessionId = uuid(), seq = 0, context: AnalyticsContext | null = null;
  const clock = new AnalyticsClock(performance.now());
  let lastActivity = performance.now(), connected = false, sending = false, blocked = false;
  let visited = false, retryAfter = 0, failures = 0;
  let readContext: () => AnalyticsContext = () => ({ step: "opening", artifact: "hezun" });
  const pending: Pending[] = [];
  const device = window.matchMedia("(max-width:767px)").matches ? "mobile" : "desktop";
  const source = new URLSearchParams(window.location.search).get("from") === "card" ? "card" : "direct";
  function emit(name: string, duration = 0) {
    if (!context || blocked) return;
    pending.push({ sessionId, event: { ...context, id: uuid(), seq: ++seq, name, at: Date.now(), duration } });
    if (pending.length > 180) pending.splice(0, pending.length - 180);
  }
  function settle() { const duration = clock.take(performance.now()); if (duration) emit("heartbeat", duration); }
  function sync() {
    if (!connected) return;
    const next = readContext();
    if (context?.step === next.step && context?.artifact === next.artifact && context?.node === next.node) return;
    settle(); context = next; emit("step_enter");
  }
  async function flush() {
    if (sending || blocked || !pending.length || Date.now() < retryAfter) return;
    const first = pending[0].sessionId;
    const batch = pending.filter((item) => item.sessionId === first).slice(0, 30);
    sending = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(expectationApiUrl("analytics/events"), { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, keepalive: true, signal: controller.signal,
        body: JSON.stringify({ sessionId: first, device, source, events: batch.map((item) => item.event) }) });
      if (response.status === 401 || response.status === 403) { blocked = true; pending.length = 0; return; }
      if (response.status === 409) { pending.length = 0; sessionId = uuid(); seq = 0; emit("visit"); emit("step_enter"); return; }
      if (!response.ok) throw new Error("analytics unavailable");
      const ids = new Set(batch.map((item) => item.event.id));
      for (let i = pending.length - 1; i >= 0; i--) if (ids.has(pending[i].event.id)) pending.splice(i, 1);
      failures = 0; retryAfter = 0;
    } catch { retryAfter = Date.now() + Math.min(60000, 5000 * 2 ** Math.min(++failures, 4)); }
    finally { window.clearTimeout(timeout); sending = false; }
    if (pending.length && connected && Date.now() >= retryAfter) void flush();
  }
  function activity() {
    const now = performance.now();
    if (now - lastActivity >= 30 * 60000) {
      settle(); sessionId = uuid(); seq = 0; emit("visit"); emit("step_enter");
    }
    lastActivity = now; clock.activity(now);
  }
  function pause() { settle(); emit("pause"); void flush(); }
  function pageHide() { pause(); clock.visibility(performance.now(), false); }
  function pageShow() { activity(); clock.visibility(performance.now(), document.visibilityState !== "hidden"); sync(); }
  function visibility() {
    if (document.visibilityState === "hidden") { pause(); clock.visibility(performance.now(), false); }
    else { activity(); clock.visibility(performance.now(), true); sync(); }
  }
  return {
    connect(reader: () => AnalyticsContext) {
      readContext = reader; connected = true;
      clock.visibility(performance.now(), document.visibilityState !== "hidden");
      context = readContext();
      if (!visited) { visited = true; emit("visit"); }
      emit("step_enter");
      const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
      for (const event of events) window.addEventListener(event, activity, { passive: true, capture: true });
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", pageHide);
      window.addEventListener("pageshow", pageShow);
      const interval = window.setInterval(() => {
        // 观看正在播放的视频算有效停留；背景音频不计入。
        if (document.visibilityState === "visible" && [...document.querySelectorAll("video")].some((v) => !v.paused && !v.ended && v.readyState >= 2)) activity();
        sync(); settle(); void flush();
      }, 5000);
      void flush();
      return () => {
        pause(); connected = false; clock.visibility(performance.now(), false);
        window.clearInterval(interval);
        for (const event of events) window.removeEventListener(event, activity, true);
        document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow);
      };
    },
    sync,
    record(name: string) { if (connected && recordedEvents.has(name)) { sync(); emit(name); } },
  };
}
