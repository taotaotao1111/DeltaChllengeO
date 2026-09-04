import { create } from "zustand";
import type { ChatMessage, Scene } from "../types/artifact";

/**
 * 叙事主线阶段（v2：一件文物 · 一段人生）。
 *
 *   museum   闭馆后的黑暗开场
 *   gallery  「今夜，你想认识谁？」展厅选择场景（何尊可互动，其余为敬请期待占位）
 *   chapter1 第一章 · 我是谁
 *   chapter2 第二章 · 我为什么会被铸造
 *   chapter3 第三章 · 我身上的秘密（铭文高潮）
 *   timeline 我的一生（可选深挖，通过导航随时进入，不属于主线必经节点）
 *
 * AI 对话与记忆卡是贯穿全程的全局能力（悬浮入口 + 弹层），不作为独立 stage。
 */
export type Stage = "museum" | "gallery" | "chapter1" | "chapter2" | "chapter3" | "timeline";

export type DiscoveredId =
  | "hotspot-pattern"
  | "hotspot-inscription"
  | "hotspot-form"
  | "hotspot-timeline"
  | "hotspot-banana-leaf"
  | "hotspot-flange"
  | "hotspot-foot"
  | "history";

const STAGE_TO_SCENE: Record<Stage, Scene> = {
  museum: "museum",
  gallery: "museum",
  chapter1: "artifact-viewer",
  chapter2: "history",
  chapter3: "inscription",
  timeline: "timeline",
};

interface GameState {
  stage: Stage;

  chatOpen: boolean;
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  discoveredDetails: DiscoveredId[];

  memoryCardOpen: boolean;
  selectedMemoryLine: string | null;
  /** 用户留给未来的一句话；null = 还没问过，"" = 问过但跳过了 */
  userLegacyLine: string | null;
  /**
   * 用户在第一章把何尊转到的角度的截图（PNG dataURL，透明背景）。
   *
   * 为什么要提前存下来：记忆卡是从时间轴或对话里打开的，那时第一章的 WebGL
   * canvas 早已卸载，当场截不到。所以在第一章「用户停止旋转」时就抓一帧存着。
   * 每个人留下的角度不同，卡片因此是独一份的。
   */
  artifactSnapshot: string | null;

  setStage: (stage: Stage) => void;
  markDiscovered: (id: DiscoveredId) => void;
  toggleChat: (open?: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  patchLastMessage: (patch: Partial<ChatMessage>) => void;
  setChatLoading: (loading: boolean) => void;
  openMemoryCard: (line?: string) => void;
  closeMemoryCard: () => void;
  setUserLegacyLine: (line: string) => void;
  setArtifactSnapshot: (dataUrl: string) => void;
  currentScene: () => Scene;
  /** 最近一条用户提问，用于记忆卡个性化「我的问题」 */
  lastUserQuestion: () => string | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  stage: "museum",

  chatOpen: false,
  chatMessages: [],
  chatLoading: false,

  discoveredDetails: [],

  memoryCardOpen: false,
  selectedMemoryLine: null,
  userLegacyLine: null,
  artifactSnapshot: null,

  setStage: (stage) => set({ stage }),

  markDiscovered: (id) =>
    set((s) =>
      s.discoveredDetails.includes(id)
        ? s
        : { discoveredDetails: [...s.discoveredDetails, id] },
    ),

  toggleChat: (open) =>
    set((s) => ({ chatOpen: open ?? !s.chatOpen, memoryCardOpen: false })),

  addMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  updateLastMessage: (content) =>
    set((s) => {
      if (s.chatMessages.length === 0) return s;
      const next = [...s.chatMessages];
      next[next.length - 1] = { ...next[next.length - 1], content };
      return { chatMessages: next };
    }),

  patchLastMessage: (patch) =>
    set((s) => {
      if (s.chatMessages.length === 0) return s;
      const next = [...s.chatMessages];
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return { chatMessages: next };
    }),

  setChatLoading: (loading) => set({ chatLoading: loading }),

  openMemoryCard: (line) =>
    set({ memoryCardOpen: true, selectedMemoryLine: line ?? null, chatOpen: false }),
  closeMemoryCard: () => set({ memoryCardOpen: false }),
  setUserLegacyLine: (line) => set({ userLegacyLine: line }),
  setArtifactSnapshot: (dataUrl) => set({ artifactSnapshot: dataUrl }),

  currentScene: () => (get().memoryCardOpen ? "memory" : STAGE_TO_SCENE[get().stage]),

  lastUserQuestion: () => {
    const msgs = get().chatMessages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") return msgs[i].content;
    }
    return null;
  },
}));
