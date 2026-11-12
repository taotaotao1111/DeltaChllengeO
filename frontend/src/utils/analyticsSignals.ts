// 仅暴露擦雾是否在展示，不读取 Canvas、文本框或用户输入。
let fog = false;
const listeners = new Set<() => void>();
export function isAnalyticsFogVisible() { return fog; }
export function setAnalyticsFogVisible(value: boolean) { fog = value; for (const listener of listeners) listener(); }
export function subscribeAnalyticsSignals(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
