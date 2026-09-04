/**
 * 《物语千年》核心数据类型
 *
 * 设计原则（重要）：
 * - FACT 层：可验证的历史事实，附带来源与置信度，AI 与文案只能基于它展开。
 * - STORY 层：为了让年轻用户更容易理解而做的文学化表达，可以感性、可以有画面感，
 *   但不能与其关联的 FACT 相矛盾。
 *
 * 所有与「何尊」相关的具体文本内容见 src/data/artifacts/hezun.ts，
 * 其中会明确标注哪些是 DEMO 占位素材。
 */

/** 事实置信度：
 * - verified  已被考古 / 学术资料明确记录的事实
 * - inferred  基于史料做出的合理推测，不是确定结论
 */
export type FactConfidence = "verified" | "inferred";

export interface Fact {
  id: string;
  /** 事实内容，尽量客观、简洁 */
  content: string;
  /** 来源说明，例如「宝鸡青铜器博物院公开资料」 */
  source: string;
  confidence: FactConfidence;
  tags: string[];
}

/** 时间轴上的一个节点 */
export interface TimelineEvent {
  id: string;
  /** 展示用的时间标签，例如「约公元前11世纪」 */
  year: string;
  title: string;
  /** STORY 层文案，第一人称，何尊自己讲述 */
  narration: string;
  /** 该节点关联的 FACT id，用于 AI 引用与溯源 */
  factIds: string[];
  /** 用于该时间节点的场景关键词，供背景插画/氛围选择使用 */
  sceneMood?: "furnace" | "court" | "burial" | "excavation" | "museum" | "today";
}

export type HotspotType =
  | "pattern"
  | "inscription"
  | "form"
  | "timeline"
  /** 颈部蕉叶纹 */
  | "banana-leaf"
  /** 纵贯器身的扉棱（棱脊） */
  | "flange"
  /** 圈足，兼带器物的尺寸与重量 */
  | "foot";

export interface Hotspot {
  id: string;
  type: HotspotType;
  /** 在展示图上的相对位置（百分比，0-100），用于 2.5D 插画上定位热点 */
  position: { x: number; y: number };
  /**
   * 3D 模式下热点在模型空间中的位置 [x, y, z]。
   *
   * 坐标系是 ArtifactModel3D 归一化之后的空间：模型几何中心位于原点、
   * 总高度固定为 2（即 y ∈ [-1, 1]，口沿在上、圈足在下），+z 为默认朝向观众的一面。
   * 缺省时该热点在 3D 模式下不显示。
   */
  position3d?: [number, number, number];
  label: string;
  /** 点击后出现的引导句 */
  teaser: string;
  title: string;
  /** STORY 层正文，可以有情绪、有画面 */
  story: string;
  factIds: string[];
}

export interface ArtifactImages {
  hero: string;
  detail: string[];
}

export interface ArtifactModel {
  url: string;
  license: string;
  source: string;
  /**
   * 载入后需要施加的欧拉旋转 [x, y, z]（弧度），用于把不同来源、不同上轴约定的
   * 模型摆正。扫描件常见是 Blender 的 Z-up，需要绕 X 轴转 90° 才能在 three.js
   * 的 Y-up 世界里正立。
   */
  rotation?: [number, number, number];
}

/** 文物的人格化设定，供 AI Persona 与 UI 文案使用 */
export interface Artifact {
  id: string;
  name: string;
  nameEn?: string;
  dynasty: string;
  period: string;
  museum: string;
  /** 一句话概述，克制、不做百科体 */
  summary: string;
  /** 人格关键词，例如 ["沉稳", "温和", "见证者"] */
  personality: string[];
  images: ArtifactImages;
  model?: ArtifactModel;
  verifiedFacts: Fact[];
  timeline: TimelineEvent[];
  hotspots: Hotspot[];
  suggestedQuestions: string[];
  /** 记忆卡上「一句话记住我」候选文案 */
  memoryLines: string[];
}

/** 3D / 2.5D / 纯图片 三档降级展示模式 */
export type ArtifactViewerMode = "3d" | "2.5d" | "image";

/** 当前叙事所处的场景，供 AI 感知上下文 */
export type Scene =
  | "museum"
  | "artifact-viewer"
  | "inscription"
  | "timeline"
  | "history"
  | "chat"
  | "memory";

export interface ChatMessage {
  id: string;
  role: "user" | "artifact" | "system";
  content: string;
  /** AI 回答中引用的事实类型标记，用于前端展示「已知 / 推测 / 未知」小标签 */
  factBasis?: FactConfidence | "unknown";
  createdAt: number;
}

/** 每次向 AI 发起对话时携带的上下文 */
export interface ArtifactContext {
  artifact: Artifact;
  verifiedFacts: Fact[];
  timeline: TimelineEvent[];
  currentScene: Scene;
  discoveredDetails: string[];
  conversationHistory: ChatMessage[];
}
