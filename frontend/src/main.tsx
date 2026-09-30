import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { track } from "./utils/tracking.ts";

/**
 * 进站来源埋点：记忆卡二维码带着 ?from=card 回流，这里记一笔访问来源
 * （/api/stats 的 visitSources 维度），页面行为不受参数影响。
 * 模块顶层只执行一次，StrictMode 双渲染不会重复上报。
 */
try {
  const from = new URLSearchParams(window.location.search).get("from");
  if (from === "card") track("visit_source", { source: "card" });
} catch {
  /* 埋点绝不影响进站 */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
