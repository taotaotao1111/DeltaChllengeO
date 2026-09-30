/**
 * 续读检查点：唯一的跨会话持久化层（localStorage，几十字节）。
 *
 * 纪律（与 store「不持久化」的原设计共存）：
 * - 只存「进度」类小状态：checkpoint（stage/章序号/文物）+ 已读章节标记
 *   + 仪式完成布尔（appraiseDone / 描红跳过态）。**不存**会话纪念品
 *   （chatMessages、artifactSnapshot、tracedGlyphs 的 PNG dataURL——
 *   体积大且语义是「那晚的纪念」，第二天重新生成一次也成立）。
 * - 写入点极克制：setStage / setChapter / markDiscovered(chapter:) /
 *   markAppraiseDone / 描红完成——都是「进度推进」语义的自然钩子。
 * - 解析失败/字段缺失一律视为无进度，静默回全新流程（绝不因坏数据卡开场）。
 */

const KEY = "wuyu-progress-v1";

export interface ProgressSnapshot {
  /** 推门后用户所处的叙事位置 */
  checkpoint: {
    stage: "gallery" | "chapter" | "timeline";
    artifactId: string;
    chapterIndex: number;
  };
  /** 已读章节标记（chapter:<id> 约定，同 ChapterMenu 的已读点） */
  discovered: string[];
  /** 鉴宝做过了（回看章节再走到出口不再重弹） */
  appraiseDone: boolean;
  /** 描红做过了（含「全跳过」；null 区分在 checkpoint 之外，这里只存完成事实） */
  tracedDone: boolean;
  /** 记录时间（毫秒），供入口文案「上次读到」排序/展示用 */
  savedAt: number;
}

function parse(raw: string | null): ProgressSnapshot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ProgressSnapshot>;
    if (!v || typeof v !== "object") return null;
    const cp = v.checkpoint;
    if (
      !cp ||
      (cp.stage !== "gallery" && cp.stage !== "chapter" && cp.stage !== "timeline") ||
      typeof cp.artifactId !== "string" ||
      typeof cp.chapterIndex !== "number"
    ) {
      return null;
    }
    return {
      checkpoint: { stage: cp.stage, artifactId: cp.artifactId, chapterIndex: cp.chapterIndex },
      discovered: Array.isArray(v.discovered) ? v.discovered.filter((x) => typeof x === "string") : [],
      appraiseDone: v.appraiseDone === true,
      tracedDone: v.tracedDone === true,
      savedAt: typeof v.savedAt === "number" ? v.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadProgress(): ProgressSnapshot | null {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveProgress(snapshot: ProgressSnapshot): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* localStorage 满/禁用：续读是增强功能，写不进就放弃 */
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 同上 */
  }
}
