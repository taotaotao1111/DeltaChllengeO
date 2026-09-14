import { create } from "zustand";
import type { ChapterModule, ChatMessage, Scene } from "../types/artifact";
import { DEFAULT_ARTIFACT_ID, getArtifact } from "../data/artifacts";

/**
 * 叙事主线阶段（v3：多件文物 · 章数可变）。
 *
 *   museum   闭馆后的黑暗开场
 *   gallery  「今夜，你想认识谁？」展厅选择场景
 *   chapter  当前文物的第 chapterIndex 章（章数由该文物的档案决定，不再写死三章）
 *   timeline 我的一生（可选深挖，通过导航随时进入，不属于主线必经节点）
 *
 * AI 对话与记忆卡是贯穿全程的全局能力（悬浮入口 + 弹层），不作为独立 stage。
 */
export type Stage = "museum" | "gallery" | "chapter" | "timeline";

/**
 * 已探索标记。
 *
 * 取值是热点 id（因文物而异，所以不能再用字面量联合枚举）或 "history" 这类固有标记。
 */
export type DiscoveredId = string;

/** 章节内容类型 → AI 感知的场景。写在这里而不是档案里，省得每件文物重复写、还可能写错 */
const MODULE_KIND_TO_SCENE: Record<ChapterModule["kind"], Scene> = {
  observe: "artifact-viewer",
  qa: "history",
  reveal: "inscription",
};

interface GameState {
  stage: Stage;
  /** 当前正在讲述的文物 */
  currentArtifactId: string;
  /** 当前章序号（0 起） */
  chapterIndex: number;

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
  /** 选定一件文物（重置章序号，换文物就从第一章开始） */
  selectArtifact: (id: string) => void;
  /** 跳到第几章（不改 stage，供导航与「上一章/下一章」使用） */
  setChapter: (index: number) => void;
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
  currentArtifactId: DEFAULT_ARTIFACT_ID,
  chapterIndex: 0,

  chatOpen: false,
  chatMessages: [],
  chatLoading: false,

  discoveredDetails: [],

  memoryCardOpen: false,
  selectedMemoryLine: null,
  userLegacyLine: null,
  artifactSnapshot: null,

  setStage: (stage) => set({ stage }),

  selectArtifact: (id) => set({ currentArtifactId: id, chapterIndex: 0 }),

  setChapter: (index) => set({ chapterIndex: index }),

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

  currentScene: () => {
    const s = get();
    if (s.memoryCardOpen) return "memory";
    if (s.stage === "timeline") return "timeline";
    if (s.stage !== "chapter") return "museum";
    // 章节的场景由「这一章是什么内容」决定，不是由第几章决定
    const chapter = getArtifact(s.currentArtifactId).chapters[s.chapterIndex];
    if (!chapter) return "museum";
    return chapter.scene ?? MODULE_KIND_TO_SCENE[chapter.module.kind];
  },

  lastUserQuestion: () => {
    const msgs = get().chatMessages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") return msgs[i].content;
    }
    return null;
  },
}));
