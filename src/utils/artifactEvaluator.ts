import type { Artifact, ArtifactViewerMode } from "../types/artifact";

/**
 * 决定文物应该以什么模式展示：3d / 2.5d / image
 *
 * 规则（严格按需求文档）：
 * - 默认 "2.5d"
 * - 只有当文物数据里存在合法 3D 模型资源，且当前环境支持 WebGL 时，才升级为 "3d"
 * - 任何异常（检测失败、WebGL 不可用等）都必须安全回退到 "2.5d"，绝不阻塞产品体验
 */
export function evaluateViewerMode(artifact: Artifact): ArtifactViewerMode {
  try {
    if (artifact.model?.url && artifact.model?.license && isWebglAvailable()) {
      return "3d";
    }
  } catch {
    // 忽略任何检测异常，直接走降级路径
  }
  return "2.5d";
}

function isWebglAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
