/**
 * 文物注册表。
 *
 * 新增一件文物的全部工作 = 在本目录下加一个档案文件 + 在这里登记一行。
 * 组件层一行都不用改。
 *
 * 刻意分成两层：
 * - ARTIFACT_REGISTRY 只放**真的有档案**的文物；
 * - GALLERY_MANIFEST 是展厅要显示的全部卡片，包含尚无档案的「敬请期待」占位。
 *
 * 不给占位文物编一份空壳 Artifact —— 空壳会诱使后来的人把占位当真实数据填，
 * 那就违背了本项目「不编造」的底线。
 */
import type { Artifact } from "../../types/artifact";
import { hezun } from "./hezun";
import { changxin } from "./changxin";

export const DEFAULT_ARTIFACT_ID = hezun.id;

export const ARTIFACT_REGISTRY: Record<string, Artifact> = {
  [hezun.id]: hezun,
  [changxin.id]: changxin,
};

/** 按 id 取档案；取不到时回落到默认文物，不让界面崩在半路 */
export function getArtifact(id: string): Artifact {
  return ARTIFACT_REGISTRY[id] ?? ARTIFACT_REGISTRY[DEFAULT_ARTIFACT_ID];
}

export interface GalleryEntry {
  id: string;
  name: string;
  dynasty: string;
  /** 卡片上的一句自述 */
  teaserLine: string;
  /** 简单占位用 emoji */
  icon?: string;
  /** 精细插画标识（优先于 icon） */
  illustrationId?: string;
  locked: boolean;
}

function entryOf(artifact: Artifact, extra: { icon?: string; useIllustration?: boolean }): GalleryEntry {
  return {
    id: artifact.id,
    name: artifact.name,
    dynasty: artifact.dynasty,
    teaserLine: artifact.teaserLine,
    icon: extra.icon,
    illustrationId: extra.useIllustration ? artifact.illustrationId : undefined,
    locked: false,
  };
}

export const GALLERY_MANIFEST: GalleryEntry[] = [
  entryOf(hezun, { icon: "🏺" }),
  entryOf(changxin, { useIllustration: true }),
  {
    id: "tongbenma",
    name: "铜奔马",
    dynasty: "东汉",
    teaserLine: "他们总说我在奔跑。可你知道我要去哪里吗？",
    icon: "🐎",
    locked: true,
  },
  {
    id: "qingming",
    name: "清明上河图",
    dynasty: "北宋",
    teaserLine: "别只看我。走进来看看。",
    icon: "🎨",
    locked: true,
  },
];
