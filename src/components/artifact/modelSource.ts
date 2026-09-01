import { useEffect, useState } from "react";

/**
 * 文物 3D 模型的下载与进度管理。
 *
 * 为什么不直接用 drei 的 useProgress：那会把 three.js 拽进首屏包（约 250KB gzip），
 * 而加载占位必须在 3D chunk 到达之前就能渲染。所以这里自己用 fetch 读字节流，
 * 本模块**不依赖 three / drei**，可以安全地留在入口 chunk 里。
 *
 * 顺带解决了另一个问题：下载由本模块独占，拿到的字节做成 blob URL 交给 GLTFLoader，
 * 因此「展厅阶段预热」和「第一章正式加载」共用同一份数据，不会重复下载，
 * 也不依赖 HTTP 缓存策略是否配得对。
 */

export interface ModelFetchState {
  /** 0-1 的下载进度；服务端没给 Content-Length 时为 null（表示无法确定进度） */
  progress: number | null;
  /** 下载完成后可直接交给 GLTFLoader 的 blob URL */
  objectUrl?: string;
  error?: unknown;
}

const states = new Map<string, ModelFetchState>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

function emit(url: string) {
  listeners.get(url)?.forEach((fn) => fn());
}

function update(url: string, patch: Partial<ModelFetchState>) {
  states.set(url, { ...(states.get(url) ?? { progress: 0 }), ...patch });
  emit(url);
}

async function download(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const totalHeader = response.headers.get("content-length");
    const total = totalHeader ? Number(totalHeader) : 0;

    // 没有 body reader（老浏览器）时退化成"整体等待"，只是拿不到进度
    if (!response.body) {
      const blob = await response.blob();
      update(url, { progress: 1, objectUrl: URL.createObjectURL(blob) });
      return;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      update(url, { progress: total ? Math.min(received / total, 1) : null });
    }

    const blob = new Blob(chunks as BlobPart[], { type: "model/gltf-binary" });
    update(url, { progress: 1, objectUrl: URL.createObjectURL(blob) });
  } catch (error) {
    update(url, { error });
    throw error;
  }
}

/**
 * 开始下载模型（幂等）。展厅阶段可以直接调用来预热，
 * 之后任何位置再调用都会复用同一次下载。
 */
export function startModelFetch(url: string) {
  if (!inflight.has(url)) {
    states.set(url, { progress: 0 });
    // 预热场景下没人 await，这里吞掉 rejection，真正的错误由 state.error 传达
    inflight.set(url, download(url).catch(() => {}));
  }
  return inflight.get(url)!;
}

/** 订阅某个模型的下载状态；首次调用会自动开始下载 */
export function useModelFetch(url: string): ModelFetchState {
  const [state, setState] = useState<ModelFetchState>(() => {
    startModelFetch(url);
    return states.get(url) ?? { progress: 0 };
  });

  useEffect(() => {
    startModelFetch(url);

    const sync = () => setState(states.get(url) ?? { progress: 0 });
    let set = listeners.get(url);
    if (!set) {
      set = new Set();
      listeners.set(url, set);
    }
    set.add(sync);
    sync();

    return () => {
      set?.delete(sync);
    };
  }, [url]);

  return state;
}
