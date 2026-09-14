import HezunIllustration from "./HezunIllustration";
import ChangxinLampIllustration from "./ChangxinLampIllustration";
import type { HotspotType } from "../../types/artifact";

interface ArtifactIllustrationProps {
  /** 对应 Artifact.illustrationId */
  id: string;
  className?: string;
  activeHotspot?: HotspotType | null;
}

/**
 * 按文物档案里的 illustrationId 分发到具体的 2.5D 插画。
 *
 * 这一层的存在是为了让**数据层不引用 React 组件** —— 档案里只写一个字符串，
 * 组件映射留在组件层。插画都是纯 SVG、体积很小，所以全部静态 import，
 * 不做 lazy 切 chunk（那是 three.js 才需要的策略）。
 */
export default function ArtifactIllustration({
  id,
  className,
  activeHotspot,
}: ArtifactIllustrationProps) {
  if (id === "changxin") return <ChangxinLampIllustration className={className} />;
  return <HezunIllustration className={className} activeHotspot={activeHotspot} />;
}
