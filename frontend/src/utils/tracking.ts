/**
 * 行为埋点：纯发射、绝不抛错、绝不影响 state（gameStore 各 action 一行调用）。
 *
 * - 队列攒批：3s 定时 flush + visibilitychange:hidden 时 flush（移动端切后台主路径）
 * - fetch keepalive：页面关闭前也能把最后一批发出去
 * - 失败静默丢队列不重试：本地开发无后端时不形成无意义循环
 *
 * ⚠️ ENDPOINT 必须是相对路径（不带开头斜杠）：Cowork 部署后页面在 /s/<alias>/
 * 下，平台只注入 <base href>、不改写打包后 JS 字面量。同 aiService 的 CHAT_ENDPOINT。
 */
const ENDPOINT = "api/track";

type TrackProps = Record<string, string | number | boolean>;

interface QueuedEvent {
  name: string;
  props?: TrackProps;
  ts: number;
}

const queue: QueuedEvent[] = [];
let timer: number | undefined;

export function track(name: string, props?: TrackProps): void {
  try {
    queue.push({ name, props, ts: Date.now() });
    if (timer === undefined) {
      timer = window.setTimeout(flush, 3000);
    }
  } catch {
    /* 埋点绝不影响体验 */
  }
}

function flush(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (queue.length === 0) return;
  const events = queue.splice(0, 50);
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {
      /* 失败静默丢弃 */
    });
  } catch {
    /* 同上 */
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
