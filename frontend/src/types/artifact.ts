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

/**
 * 热点类型。
 *
 * 前四个是跨文物通用的，后三个是青铜器器型专属命名——新增文物（宫灯、字画……）
 * 会有自己的部位词，所以这里用 `(string & {})` 收尾允许任意字符串：
 * 直接写 `| string` 会让整个联合坍缩成 string，丢掉已知值的自动补全。
 */
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
  | "foot"
  | (string & {});

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

/** 章节背景母题，对应 ChapterBackdrop 的三种视觉 */
export type ChapterBackdropMotif = "forge" | "patina" | "strata";

/** 猜一猜的一个选项（展厅揭幕与章节内竞猜共用） */
export interface GuessOptionData {
  id: string;
  label: string;
  /** 选中后文物的回应；不判对错，只把认知纠正说清楚 */
  response: string;
}

export interface GuessBlock {
  question: string;
  options: GuessOptionData[];
}

/**
 * 观察模块：让用户先自己看，第一眼落在哪里决定文物怎么回应。
 */
export interface ObserveModuleData {
  kind: "observe";
  /** 「先别急着听我说……」 */
  prompt: string;
  /** 参与本章的热点 id（不写则取该文物除 inscription/timeline 外的全部热点） */
  hotspotIds?: string[];
  /**
   * 按热点 type 查表的「第一眼」回应。
   *
   * 必须覆盖本章热点涉及的每一个 type —— 漏一个界面上会直接显示 undefined。
   * scripts/check-artifacts.mjs 负责在构建前守住这条。
   */
  firstLookResponses: Record<string, string>;
  /** 全部热点都看过之后，把进度文案换成这句 */
  allFoundLine: string;
  openingLines: string[];
  lineDelay: number;
  /** 还没看完就要往下走时的提示 */
  notAllFoundHint: string;
}

/** 问答模块：一组「你想先听哪一个」 */
export interface QaModuleData {
  kind: "qa";
  openingLines: string[];
  lineDelay: number;
  /** 问答列表上方的引导句 */
  prompt: string;
  items: { id: string; question: string; answer: string }[];
}

/**
 * 揭示模块：引入念白 → 除锈 → 关键字特写 → 竞猜 → 收尾。
 * 中间三段都是可选的，没有对应素材的文物会直接跳过。
 */
export interface RevealModuleData {
  kind: "reveal";
  leadInLines: string[];
  lineDelay: number;
  /** 亲手擦掉覆盖物才看得见字的那一步。leadLines 一句一行（原样保留换行） */
  derust?: { leadLines: string[]; footnote: string };
  /** 关键字逐字浮现的特写。explainLines 一句一行 */
  focus?: { characters: string[]; explainLines: string[]; factIds: string[] };
  guess?: GuessBlock;
  closingLines: string[];
  /** 看完特写就算探索过的热点 id */
  marksDiscovered?: string;
}

/**
 * 一章的内容。
 *
 * 新增一种叙事玩法 = 加一个 kind + 一个模块组件，已有 kind 一行都不用动。
 * （长信宫灯的「光点聚形」开场就会走这个口子进来。）
 */
export type ChapterModule = ObserveModuleData | QaModuleData | RevealModuleData;

export interface ArtifactChapter {
  id: string;
  /** 「第一章」 */
  label: string;
  /** 「我是谁」 */
  title: string;
  backdrop?: ChapterBackdropMotif;
  /** patina 母题背景里那层巨大字影用哪几个字（必须是这件文物身上有据可查的字） */
  backdropGlyphs?: string[];
  /**
   * 背景里常驻的讲述者。
   * 第一章不写——那时主角就在主视图中央，再放一尊会打架。
   */
  presence?: { opacity: number; className: string };
  /** 覆盖由 module.kind 推导出的 Scene（一般不需要） */
  scene?: Scene;
  module: ChapterModule;
}

/**
 * 记忆卡上那句「我告诉过你」。
 *
 * 有序匹配：从上往下取第一条 requires 全部命中的，都没命中用 defaultInsight。
 */
export interface MemoryInsight {
  requires: string[];
  text: string;
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

  // ↓↓↓ 以下字段让「新增一件文物」只需要写数据、不改组件 ↓↓↓

  /** 展厅卡片上的一句自述 */
  teaserLine: string;
  /**
   * 年代简写，如「西周早期」。
   * 记忆卡落款用它：period 太长（带括号注解）、dynasty 太粗（只有「西周」）。
   */
  shortPeriod: string;
  /** 2.5D 插画组件的标识，由 ArtifactIllustration 按它分发 */
  illustrationId: string;
  /**
   * 记忆卡落款印章的两个字。
   * 显式写，不从 name 截前两字——「长信宫灯」截出来是「长信」，读着像人名不像印章款。
   */
  sealChars: [string, string];
  /** 展厅里被选中后的揭幕流程；竞猜可选 */
  galleryReveal?: {
    greetingLines: string[];
    lineDelay: number;
    guess?: GuessBlock;
  };
  /** 主线章节。长度即章数——只做一章也成立，不必凑三章 */
  chapters: ArtifactChapter[];
  /**
   * 「有多久没人看见我」比例条所需的两个年份（负数 = 公元前）与来源说明。
   *
   * 不从 timeline 的 year 里解析——那是「约公元前11世纪」这样的展示文案，
   * 解析字符串等于替史料猜数字。没有确切年份的文物就不写，这一段留白比编数字好。
   */
  span?: { castYear: number; foundYear: number; note: string };
  /** 记忆卡洞察（有序匹配） */
  insights: MemoryInsight[];
  /** 一处都没探索时的兜底洞察 */
  defaultInsight: string;
  /**
   * Mock 降级路径的补充配置。
   *
   * 全局兜底已覆盖「你有意识吗」这类通用拟人化边界；这里只放**该文物叙事专属**的
   * 答不了的问题（何尊的「谁埋的你」预设了入土情节，对别的文物并不成立）。
   */
  mock?: { extraUnknownTriggers?: string[] };
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
