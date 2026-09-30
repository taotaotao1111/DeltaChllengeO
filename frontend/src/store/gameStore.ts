import { create } from "zustand";
import type { ChapterModule, ChatMessage, Scene } from "../types/artifact";
import { DEFAULT_ARTIFACT_ID, getArtifact } from "../data/artifacts";
import { track } from "../utils/tracking";
import { loadProgress, saveProgress, type ProgressSnapshot } from "../utils/progressStorage";

/**
 * 行为埋点说明：各 action 内的 track() 是纯发射（见 utils/tracking.ts）——
 * 绝不抛错、不 await、不影响返回的 state。store 仍是「无 middleware 单一文件」。
 */

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
  inscription: "inscription",
  flip: "history",
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
  /**
   * 时间线终点「金文描红」的笔迹（每字一张 PNG dataURL，跳过的字为 null）。
   * null = 还没描过（描红入口据此判断是否要先走描红仪式）。
   * 与 artifactSnapshot 同模式：提前存，记忆卡打开时 canvas 已卸载截不到。
   */
  tracedGlyphs: (string | null)[] | null;
  /**
   * 当前文物是否已通过章末「鉴宝」。做过了就不重弹（回看章节再走到出口
   * 直接放行，同 tracedGlyphs === null 的门控语义）；换文物时重置。
   */
  appraiseDone: boolean;

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
  setTracedGlyphs: (dataUrls: (string | null)[] | null) => void;
  markAppraiseDone: () => void;
  /** 续读：按上次检查点恢复（museum 开场页的「回到上次」入口调用） */
  resumeSession: () => void;
  /** 上次会话是否留有可恢复的进度（museum 入口展示条件；模块加载时读一次） */
  resumable: ProgressSnapshot | null;
  /** 进度落盘（内部钩子用，不对外） */
  persistCheckpoint: () => void;
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
  tracedGlyphs: null,
  appraiseDone: false,
  // 模块加载时读一次（SSR 安全：浏览器外为 null）
  resumable: loadProgress(),

  setStage: (stage) => {
    track("stage_reach", { stage });
    set({ stage });
    get().persistCheckpoint();
  },

  /** 选定一件文物：换文物 = 换一段相遇，上一段的对话、探索痕迹与纪念品都不许跟过来 */
  selectArtifact: (id) => {
    const revisit = get().currentArtifactId === id;
    track("artifact_select", { artifactId: id, revisit });
    set((s) =>
      s.currentArtifactId === id
        ? { chapterIndex: 0 }
        : {
            currentArtifactId: id,
            chapterIndex: 0,
            // 跨文物残留会污染 AI 上下文（新文物吃到旧文物的对话历史）
            // 与记忆卡（旧文物的视角截图、留给未来的一句话），多展品后必踩
            chatMessages: [],
            discoveredDetails: [],
            artifactSnapshot: null,
            userLegacyLine: null,
            tracedGlyphs: null,
            appraiseDone: false,
          },
    );
  },

  setChapter: (index) => {
    track("chapter_view", { artifactId: get().currentArtifactId, chapterIndex: index });
    set({ chapterIndex: index });
    get().persistCheckpoint();
  },

  markDiscovered: (id) =>
    set((s) => {
      if (s.discoveredDetails.includes(id)) return s;
      // 埋点放在非幂等分支内：每个热点天然只计一次
      const artifact = getArtifact(s.currentArtifactId);
      const hotspotType = artifact.hotspots.find((h) => h.id === id)?.type ?? id;
      track("hotspot_discover", {
        artifactId: s.currentArtifactId,
        hotspotId: id,
        hotspotType: String(hotspotType),
      });
      return { discoveredDetails: [...s.discoveredDetails, id] };
    }),
  // markDiscovered 自身不落盘：已读标记总伴随章节完成/场景切换写入，
  // 那些钩子（setChapter/setStage/仪式完成）的 persistCheckpoint 会带上最新列表。

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

  openMemoryCard: (line) => {
    track("memory_card_open", {
      artifactId: get().currentArtifactId,
      discoveredCount: get().discoveredDetails.length,
    });
    set({ memoryCardOpen: true, selectedMemoryLine: line ?? null, chatOpen: false });
  },
  closeMemoryCard: () => set({ memoryCardOpen: false }),
  setUserLegacyLine: (line) => set({ userLegacyLine: line }),
  setArtifactSnapshot: (dataUrl) => set({ artifactSnapshot: dataUrl }),
  setTracedGlyphs: (dataUrls) => {
    set({ tracedGlyphs: dataUrls });
    if (dataUrls !== null) get().persistCheckpoint();
  },
  markAppraiseDone: () => {
    set({ appraiseDone: true });
    get().persistCheckpoint();
  },

  /**
   * 检查点写入：进度推进的自然钩子（setStage/setChapter/章已读/仪式完成）统一走这里。
   * museum 阶段不写（开场推门本身不是进度）。
   */
  persistCheckpoint: () => {
    const s = get();
    if (s.stage === "museum") return;
    saveProgress({
      checkpoint: { stage: s.stage, artifactId: s.currentArtifactId, chapterIndex: s.chapterIndex },
      discovered: s.discoveredDetails,
      appraiseDone: s.appraiseDone,
      tracedDone: s.tracedGlyphs !== null,
      savedAt: Date.now(),
    });
  },

  resumeSession: () => {
    const snap = get().resumable;
    if (!snap) return;
    track("session_resume", { stage: snap.checkpoint.stage });
    // 恢复的骨架状态只有进度类：位置/已读标记/仪式完成布尔。
    // 会话纪念品（对话历史、视角截图）不恢复——那属于上一个会话。
    // 章内 phase 不恢复：一律回该章开头重放（章节是完整叙事单元）。
    set({
      currentArtifactId: snap.checkpoint.artifactId,
      chapterIndex: snap.checkpoint.chapterIndex,
      discoveredDetails: snap.discovered,
      appraiseDone: snap.appraiseDone,
      // 描红做过（含跳过）就不再弹仪式：置「全跳过」占位，出口直开记忆卡
      tracedGlyphs: snap.tracedDone
        ? getArtifact(snap.checkpoint.artifactId).traceGlyphs?.chars.map(() => null) ?? null
        : null,
      stage: snap.checkpoint.stage,
    });
  },

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
