import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExpectationError, exportExpectations, getExpectationReport, type ExpectationReport } from "../services/expectationService";
import "./AdminExpectations.css";
import AdminAnalytics from "./AdminAnalytics";

const names: Record<string, string> = { hezun: "何尊", changxin: "长信宫灯" };
const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });

export default function AdminExpectations() {
  const [tab, setTab] = useState("analytics");
  return <main className="expectations-admin"><div className="expectations-admin__content">
    <header><div><Link to="/">← 回到物语千年</Link><h1>探索数据</h1><p>了解用户如何走近文物，听见下一次相遇的期待</p></div><span className="expectations-admin__badge">管理员专用</span></header>
    <nav className="admin-analytics__main-tabs" aria-label="后台功能"><button aria-pressed={tab === "analytics"} onClick={() => setTab("analytics")}>访问与探索</button><button aria-pressed={tab === "expectations"} onClick={() => setTab("expectations")}>用户期待</button></nav>
    {tab === "analytics" ? <AdminAnalytics /> : <ExpectationFeedback />}
  </div></main>;
}

function ExpectationFeedback() {
  const [report, setReport] = useState<ExpectationReport | null>(null);
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [days, setDays] = useState("0");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null); setDenied(false);
    void getExpectationReport(new URLSearchParams({ q, days, page: String(page) }), controller.signal)
      .then((data) => { if (!controller.signal.aborted) setReport(data); })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const forbidden = reason instanceof ExpectationError && [401, 403].includes(reason.status);
        setDenied(forbidden);
        setError(forbidden ? "此页面仅限管理员访问，请使用已授权的 Cowork 账号。" : "暂时无法读取用户期待，请稍后重试。");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [q, days, page, refresh]);

  const download = async () => {
    setExporting(true); setExportError("");
    try { await exportExpectations(new URLSearchParams({ q, days })); }
    catch (reason) { setExportError(reason instanceof Error ? reason.message : "导出失败，请重试。"); }
    finally { setExporting(false); }
  };

  return <section>
      {report && <section className="expectations-admin__summary" aria-label="期待概览">
        <div><span>当前期待</span><strong>{report.summary.total}</strong></div>
        <div><span>近 7 天新增</span><strong>{report.summary.recent}</strong></div>
        <div><span>提交账号</span><strong>{report.summary.participants}</strong></div>
      </section>}
      {!denied && <form className="expectations-admin__filters" onSubmit={(event) => { event.preventDefault(); setQ(query.trim()); setPage(1); setRefresh((n) => n + 1); }}>
        <input aria-label="搜索期待内容、薯名或原登录名称" value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)} placeholder="搜索期待内容、薯名或原登录名称" />
        <select aria-label="提交时间范围" value={days} onChange={(event) => { setDays(event.target.value); setPage(1); }}><option value="0">全部时间</option><option value="7">近 7 天提交</option><option value="30">近 30 天提交</option></select>
        <button type="submit" disabled={loading}>查询</button>
        <button type="button" disabled={loading || !report?.total || exporting} onClick={() => { void download(); }}>{exporting ? "正在导出…" : "导出 CSV"}</button>
      </form>}
      {loading && <p role="status" className="expectations-admin__message">正在读取期待…</p>}
      {error && <div role="alert" className="expectations-admin__message"><p>{error}</p>{!denied && <button onClick={() => setRefresh((n) => n + 1)}>重试</button>}</div>}
      {exportError && <p role="alert">{exportError}</p>}
      {report && <>
        <p className="expectations-admin__caption">当前筛选 {report.total} 条。同一账号对同一文物修改期待，会更新原记录。时间为北京时间。</p>
        {report.items.length === 0 ? <p className="expectations-admin__message">{q || days !== "0" ? "没有符合筛选条件的期待。" : "还没有云端期待。上线后用户提交的内容会出现在这里。"}</p> : <div className="expectations-admin__table"><table>
          <thead><tr><th>用户期待</th><th>Cowork 薯名</th><th>当前文物</th><th>首次提交</th><th>最近修改</th></tr></thead>
          <tbody>{report.items.map((row) => <tr key={row.id}><td>{row.content}</td><td>{row.display_name || "平台未提供名称"}</td><td>{names[row.artifact_id] ?? row.artifact_id}</td><td>{formatTime(row.created_at)}</td><td>{formatTime(row.updated_at)}</td></tr>)}</tbody>
        </table></div>}
        <nav className="expectations-admin__pagination" aria-label="反馈分页"><button disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>上一页</button><span>{page} / {Math.max(1, Math.ceil(report.total / report.pageSize))}</span><button disabled={page * report.pageSize >= report.total} onClick={() => setPage((n) => n + 1)}>下一页</button></nav>
        <p className="expectations-admin__caption">优先显示官方账号资料中的薯名，暂未匹配时保留原登录名称。薯名不等同于小红书 App 昵称；只收集主动提交的期待，不读取历史本地草稿。</p>
      </>}
  </section>;
}
