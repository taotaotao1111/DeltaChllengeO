import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Sources from "./pages/Sources";

/**
 * 部署到 Cowork 后访问路径是 `/s/<alias>/`，而 react-router 的 history 只认自己的
 * basename（默认 `/`），不认平台注入到响应体里的前缀 —— 不设 basename 的话，
 * 点「参考资料来源」跳 `/sources` 会丢掉 `/s/<alias>`，刷新即 404。
 *
 * 本地开发时路径是 `/` 或 `/sources`，正则不命中、退化为 `/`，行为与改动前一致。
 */
function detectBasename(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname.match(/^\/s\/[^/]+/)?.[0] ?? "/";
}

export default function App() {
  return (
    <BrowserRouter basename={detectBasename()}>
      <div className="noise-overlay" aria-hidden />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sources" element={<Sources />} />
      </Routes>
    </BrowserRouter>
  );
}
