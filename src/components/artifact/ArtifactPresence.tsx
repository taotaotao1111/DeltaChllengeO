import { lazy, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import type { Artifact, ArtifactModel } from "../../types/artifact";
import { evaluateViewerMode } from "../../utils/artifactEvaluator";
import { useModelFetch } from "./modelSource";

// 与展厅、第一章共用同一个 3D chunk，这里不会引入新的下载
const ArtifactModelDisplay = lazy(() => import("./ArtifactModelDisplay"));

interface ArtifactPresenceProps {
  artifact: Artifact;
  /** 定位与尺寸；默认不给，由调用方决定它站在哪一侧 */
  className?: string;
  /** 融进背景的透明度，别调高——它是"在场感"，不是展示 */
  opacity?: number;
  autoRotateSpeed?: number;
}

interface PresenceCanvasProps {
  model: ArtifactModel;
  className: string;
  opacity: number;
  autoRotateSpeed: number;
}

/**
 * 真正渲染的那一层。拆出来的唯一原因：useModelFetch 是 hook，
 * 不能等"确定用 3D 模式"之后再有条件地调用。
 */
function PresenceCanvas({ model, className, opacity, autoRotateSpeed }: PresenceCanvasProps) {
  const { objectUrl } = useModelFetch(model.url);

  /*
    背景里的讲述者**绝不显示加载态**：没就绪就什么都不画。
    它是氛围而不是内容，摆一个「正在唤醒 42%」的进度圈在背景里只会显得像出了错。
    也正因如此这里不用 ArtifactModelGate（那是给主体展示用的三态闸门）。
  */
  if (!objectUrl) return null;

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 2, ease: "easeOut" }}
      /*
        推到景深里：只降透明度不够——扫描件自带明亮打光和饱和的青铜绿，
        压到 0.2 仍然像贴了一张产品图在正文旁边。加一点虚焦 + 去饱和 + 压暗，
        它才会读成"在远处、在暗处的同一件东西"。
      */
      style={{ filter: "blur(2.5px) saturate(0.6) brightness(0.8)" }}
    >
      <Suspense fallback={null}>
        <ArtifactModelDisplay
          model={model}
          src={objectUrl}
          autoRotateSpeed={autoRotateSpeed}
          className="h-full w-full"
        />
      </Suspense>
    </motion.div>
  );
}

/**
 * 「讲述者在场」——把文物本体压暗、放大、慢慢自转地留在章节背景里。
 *
 * 第一章之后主角就从画面上消失了，只剩它的旁白，观感上是断崖式的落差；
 * 让它继续待在景深里，既补足了背景的信息量，也一直在提示「说话的是谁」。
 *
 * 三条硬约束：
 * 1. 不可交互（`pointer-events-none`），手势要留给正文；
 * 2. 不显示加载态，也不做 2.5D 插画兜底——降级时就干净地消失，绝不抢戏；
 * 3. 复用已缓存的 blob 与 3D chunk，**零新增网络请求**。
 */
export default function ArtifactPresence({
  artifact,
  className = "",
  opacity = 0.3,
  autoRotateSpeed = 0.12,
}: ArtifactPresenceProps) {
  const mode = useMemo(() => evaluateViewerMode(artifact), [artifact]);

  // 没有合法模型或环境不支持 WebGL：安静地不存在
  if (mode !== "3d" || !artifact.model) return null;

  return (
    <PresenceCanvas
      model={artifact.model}
      className={className}
      opacity={opacity}
      autoRotateSpeed={autoRotateSpeed}
    />
  );
}
