export interface UserExpectation {
  id: string;
  artifact_id: string;
  content: string;
  source: string;
  created_at: string;
  updated_at: string;
}
export interface AdminExpectation extends UserExpectation { display_name: string }
export interface ExpectationReport {
  items: AdminExpectation[];
  total: number;
  page: number;
  pageSize: number;
  summary: { total: number; recent: number; participants: number };
}
export class ExpectationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** 显式以文档 base 解析，兼容 /admin/expectations 等嵌套路由。 */
export function expectationApiUrl(path: string): string {
  const prefix = window.location.pathname.match(/^\/s\/[^/]+/)?.[0] ?? "";
  return `${prefix}/api/${path}`;
}
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(expectationApiUrl(path), {
    credentials: "same-origin", cache: "no-store", ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ExpectationError(data?.error ?? "服务暂时不可用，请稍后重试。", response.status);
  return data as T;
}
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 12000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(abort, timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export function getOwnExpectation(artifactId: string, signal?: AbortSignal) {
  return request<{ expectation: UserExpectation | null }>(`expectations?artifactId=${encodeURIComponent(artifactId)}`, { signal }).then((data) => {
    if (data.expectation !== null && !validExpectation(data.expectation, artifactId)) throw new ExpectationError("服务返回的数据不完整。", 502);
    return data;
  });
}
export function submitExpectation(artifactId: string, content: string, signal?: AbortSignal) {
  return request<{ expectation: UserExpectation }>("expectations", { method: "PUT", body: JSON.stringify({ artifactId, content }), signal }).then((data) => {
    if (!validExpectation(data.expectation, artifactId) || data.expectation.content !== content.trim()) {
      throw new ExpectationError("尚未收到保存确认，请重试。", 502);
    }
    return data;
  });
}
function validExpectation(value: UserExpectation | undefined, artifactId: string): value is UserExpectation {
  return Boolean(value && typeof value.id === "string" && value.id && value.artifact_id === artifactId &&
    typeof value.content === "string" && typeof value.updated_at === "string");
}
export function deleteExpectation(artifactId: string) {
  return request<{ ok: boolean }>(`expectations?artifactId=${encodeURIComponent(artifactId)}`, { method: "DELETE" });
}
export function getExpectationReport(filters: URLSearchParams, signal?: AbortSignal) {
  return request<ExpectationReport>(`admin/expectations?${filters}`, { signal });
}
export async function exportExpectations(filters: URLSearchParams) {
  const response = await fetchWithTimeout(expectationApiUrl(`admin/expectations/export?${filters}`), {
    credentials: "same-origin", cache: "no-store",
  }, 15000);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ExpectationError(data?.error ?? "导出失败，请重试。", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "用户期待.csv";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
