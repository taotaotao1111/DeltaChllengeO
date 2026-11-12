import { useEffect, useState } from "react";
import { ExpectationError } from "../services/expectationService";
import { eventNames, stepNames, nodeNames, getAnalyticsReport, getAnalyticsSessions, getSessionDetail, type AnalyticsReport, type SessionReport, type SessionDetail } from "../services/analyticsService";

const time = (value: string) => new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
const duration = (ms: number) => ms < 60000 ? `${Math.round(ms / 1000)} 秒` : `${Math.floor(ms / 60000)} 分 ${Math.round(ms % 60000 / 1000)} 秒`;
const rate = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : "—";
const errorText = (reason: unknown) => reason instanceof ExpectationError && [401, 403].includes(reason.status) ?
  "仅管理员可查看，请使用已授权的 Cowork 账号。" : "暂时无法读取统计，请稍后重试。";

export default function AdminAnalytics() {
  const [tab, setTab] = useState("overview");
  const [days, setDays] = useState("7"), [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [sessions, setSessions] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null), [detailError, setDetailError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setReport(null); setSessions(null);
    void Promise.all([getAnalyticsReport(days, controller.signal), getAnalyticsSessions(days, page, controller.signal)])
      .then(([stats, visits]) => { if (!controller.signal.aborted) { setReport(stats); setSessions(visits); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(errorText(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, page, refresh]);
  useEffect(() => {
    setDetail(null); setDetailError("");
    if (!selected) return;
    const controller = new AbortController();
    void getSessionDetail(selected, controller.signal).then((data) => { if (!controller.signal.aborted) setDetail(data); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setDetailError(errorText(reason)); });
    return () => controller.abort();
  }, [selected, refresh]);
  const tabs = [["overview", "访问概览"], ["steps", "环节时长"], ["paths", "探索路径"], ["completion", "完成情况"]];
  return <section className="admin-analytics">
    <div className="admin-analytics__toolbar"><nav aria-label="统计维度">{tabs.map(([id, name]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}</nav>
      <div><select aria-label="统计时间范围" value={days} onChange={(e) => { setDays(e.target.value); setPage(1); setSelected(null); }}>
        <option value="1">近 24 小时</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="0">全部时间</option>
      </select><button disabled={loading} onClick={() => setRefresh((n) => n + 1)}>刷新</button></div>
    </div>
    {loading && <p role="status" className="expectations-admin__message">正在读取探索数据…</p>}
    {error && <p role="alert" className="expectations-admin__message">{error}</p>}
    {report && <>
      <div className="expectations-admin__summary admin-analytics__metrics">
        {[["访问账号数", report.overview.accounts], ["访问次数", report.overview.visits], ["平均有效停留", duration(report.overview.average_ms)], ["手机访问占比", rate(report.overview.mobile, report.overview.visits)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      {!report.overview.visits && <p className="expectations-admin__message">还没有访问记录。更新上线后，新访问和操作会陆续出现在这里。</p>}
      {tab === "overview" && <>
        <h2>访问趋势</h2><div className="expectations-admin__table"><table><thead><tr><th>日期（北京时间）</th><th>访问账号数</th><th>访问次数</th><th>访问分布</th></tr></thead><tbody>{report.daily.map((day) => <tr key={day.day}><td>{day.day}</td><td>{day.accounts}</td><td>{day.visits}</td><td><span className="admin-analytics__bar"><i style={{ width: `${day.visits / Math.max(...report.daily.map((d) => d.visits), 1) * 100}%` }} /></span></td></tr>)}</tbody></table></div>
        {days === "0" && report.daily.length === 30 && <p className="expectations-admin__caption">趋势最多展示最近 30 个有访问的日期；上方指标包含全部时间。</p>}
      </>}
      {tab === "steps" && <>
        <h2>用户把时间花在哪里</h2><p className="expectations-admin__caption">按平均有效停留排序。同一次访问反复进入某环节，时间累加，访问次数只计一次。</p>
        <div className="expectations-admin__table"><table><thead><tr><th>环节</th><th>访问次数</th><th>访问账号数</th><th>累计有效时长</th><th>平均有效时长</th></tr></thead><tbody>{[...report.steps].sort((a, b) => b.active_ms / b.visits - a.active_ms / a.visits).map((step) => <tr key={step.step}><td>{stepNames[step.step] ?? step.step}</td><td>{step.visits}</td><td>{step.accounts}</td><td>{duration(step.active_ms)}</td><td>{duration(step.active_ms / step.visits)}</td></tr>)}</tbody></table></div>
      </>}
      {tab === "completion" && <>
        <h2>本次访问完成了什么</h2><p className="expectations-admin__caption">按访问去重，分母为当前范围的访问次数；各项独立统计，不要求用户按固定顺序体验。</p>
        <div className="admin-analytics__completion">{([["读完故事", report.completions.completed], ["打开记忆卡", report.completions.memory], ["成功留下期待", report.completions.expectation]] as const).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}<small> 次访问 · {rate(count, report.overview.visits)}</small></strong><progress max={Math.max(report.overview.visits, 1)} value={count} /></div>)}</div>
        <p className="expectations-admin__caption">恢复过去的已完成进度不会被计为本次读完。期待仅在服务器确认成功后计入；原有期待内容仍在「用户期待」中查看。</p>
      </>}
      {tab === "paths" && sessions && <>
        <h2>每次访问的探索路径</h2><p className="expectations-admin__caption">最近停留不等于确定退出；离开事件可能因浏览器关闭或断网未送达。点击「查看路径」可看实际操作顺序。</p>
        <div className="expectations-admin__table"><table><thead><tr><th>Cowork 薯名</th><th>开始访问</th><th>最近活动</th><th>设备 / 时长</th><th>最近停留</th><th>完成情况</th><th>操作</th></tr></thead>
          <tbody>{sessions.items.map((row) => <tr key={row.id}><td>{row.display_name || "平台未提供名称"}</td><td>{time(row.started_at)}</td><td>{time(row.last_seen)}</td><td>{row.device === "mobile" ? "手机" : "电脑"}<br />{duration(row.active_ms)}</td><td>{stepNames[row.last_step ?? ""] ?? "—"}</td><td>{[row.completed && "读完", row.memory && "记忆卡", row.expectation && "留期待"].filter(Boolean).join(" · ") || "探索中"}</td><td><button aria-expanded={selected === row.id} onClick={() => setSelected(selected === row.id ? null : row.id)}>查看路径</button></td></tr>)}</tbody>
        </table></div>
        <nav className="expectations-admin__pagination" aria-label="访问记录分页"><button disabled={page <= 1} onClick={() => { setPage((n) => n - 1); setSelected(null); }}>上一页</button><span>{page} / {Math.max(1, Math.ceil(sessions.total / sessions.pageSize))}</span><button disabled={page * sessions.pageSize >= sessions.total} onClick={() => { setPage((n) => n + 1); setSelected(null); }}>下一页</button></nav>
        {selected && <section className="admin-analytics__detail" aria-label="访问路径详情"><header><h3>{detail?.session.display_name || "访问"} · 路径详情</h3><button onClick={() => setSelected(null)}>关闭详情</button></header>
          {detailError ? <p role="alert">{detailError}</p> : !detail ? <p role="status">正在读取路径…</p> : <>
            <p className="expectations-admin__caption">{time(detail.session.started_at)} 开始 · 有效停留 {duration(detail.session.active_ms)} · {detail.session.source === "card" ? "从分享卡进入" : "直接进入"}</p>
            <div className="admin-analytics__path-times">{Object.entries(detail.events.reduce<Record<string, number>>((sum, event) => {
              if (event.duration) sum[event.step] = (sum[event.step] ?? 0) + event.duration;
              return sum;
            }, {})).map(([step, ms]) => <span key={step}>{stepNames[step]} {duration(ms)}</span>)}</div>
            <ol>{detail.events.filter((e) => e.name !== "heartbeat").map((event) => <li key={event.seq} className={event.name === "fog_skip" ? "is-skipped" : ""}><time>{new Date(event.occurred_at).toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</time><span>{stepNames[event.step]}{nodeNames[event.node] ? ` · ${nodeNames[event.node]}` : ""} · {eventNames[event.name] ?? event.name}</span></li>)}</ol>
            {detail.truncated && <p>此记录很长，仅展示前 10000 条事件。</p>}
          </>}
        </section>}
      </>}
      <aside className="admin-analytics__notes"><h3>统计口径</h3><p>每次打开页面计一次访问；连续 30 分钟无操作后再次交互，计为新访问。账号按 Cowork 登录身份去重，优先显示官方薯名，暂未匹配时保留原登录名称；此名称不等同于小红书 App 昵称。有效时长排除切后台时间，连续 60 秒无操作后暂停计时，视频播放期间继续计时。</p><p>只记录成功上报的访问与操作，不采集输入正文。历史数据无法补回，网络中断可能造成缺失；管理员浏览此后台不计入访问。</p></aside>
    </>}
  </section>;
}
