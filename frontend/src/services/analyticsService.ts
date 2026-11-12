import { request } from "./expectationService";
export const stepNames: Record<string, string> = {
  opening: "开场", gallery: "展厅", fog: "擦雾", observe: "纹饰与器型", qa: "相遇 · 四段往事", derust: "除锈",
  inscription: "铭文", reunion: "重逢 · 史料卡片", timeline: "探索历史", memory: "记忆卡", ai: "AI 对话", epilogue: "下一次相遇", sources: "数字资料来源",
};
export const eventNames: Record<string, string> = {
  visit: "开始访问", step_enter: "进入环节", heartbeat: "有效停留", pause: "页面隐藏或离开",
  fog_complete: "完成擦雾", fog_skip: "跳过擦雾", chapter_complete: "完成当前章节", hotspot_discover: "发现文物细节",
  flip_card_view: "查看史料卡片", inscription_section_view: "查看铭文选段", appraise_answer: "回答鉴宝问题",
  story_complete: "读完故事", memory_card_open: "打开记忆卡", expectation_submit: "期待提交成功", encounter_finish: "完成这次相遇",
  glyph_trace_done: "完成描红", chat_reply: "收到 AI 回答", session_resume: "恢复阅读进度",
  continue_mainline: "选择继续主线（不展开完整铭文）", deep_dive_open: "选择深入阅读完整铭文", menu_navigation: "从目录切换到此处",
};
export const nodeNames: Record<string, string> = {
  why: "我的诞生", who: "我的使命", carve: "无名的匠人", mind: "那个时代",
  "hotspot-pattern": "兽面纹", "hotspot-banana-leaf": "蕉叶纹", "hotspot-flange": "扉棱", "hotspot-foot": "圈足", "hotspot-form": "器型", "hotspot-inscription": "铭文热点", "hotspot-timeline": "时间线热点",
  "lead-in": "独白引入", derust: "擦除锈迹", compare: "古今对照", focus: "宅兹中国初现", guess: "含义竞猜", closing: "理解与收束",
  "sec-opening": "开篇纪时", "sec-admonition": "训诰场景", "sec-ancestors": "追述先人", "sec-climax": "武王告天 · 宅兹中国", "sec-exhort": "勉励", "sec-reward": "赏赐与作器",
  "card-1963": "1963 年出土", "card-30yuan": "三十元售出", "card-rescue": "征集入藏", "card-dormant": "铭文未被发现", "card-1975": "1975 年发现铭文", "card-revalue": "重新认识何尊",
  casting: "被铸造", quiet: "沉寂", rediscovery: "重逢", today: "今天",
};
export interface AnalyticsSession {
  id: string; display_name: string; device: string; source: string; started_at: string; last_seen: string; active_ms: number;
  last_step?: string; completed: boolean; memory: boolean; expectation: boolean;
}
export interface AnalyticsReport {
  overview: { visits: number; accounts: number; active_ms: number; average_ms: number; mobile: number; first_visit: string | null };
  steps: { step: string; active_ms: number; visits: number; accounts: number }[];
  daily: { day: string; visits: number; accounts: number }[];
  completions: { completed: number; memory: number; expectation: number };
}
export interface SessionReport { items: AnalyticsSession[]; total: number; page: number; pageSize: number }
export interface SessionDetail {
  session: AnalyticsSession;
  events: { seq: number; name: string; step: string; node: string; artifact: string; occurred_at: string; duration: number }[];
  truncated: boolean;
}
export const getAnalyticsReport = (days: string, signal: AbortSignal) => request<AnalyticsReport>(`admin/analytics?days=${days}`, { signal });
export const getAnalyticsSessions = (days: string, page: number, signal: AbortSignal) => request<SessionReport>(`admin/analytics/sessions?days=${days}&page=${page}`, { signal });
export const getSessionDetail = (id: string, signal: AbortSignal) => request<SessionDetail>(`admin/analytics/sessions/${encodeURIComponent(id)}`, { signal });
