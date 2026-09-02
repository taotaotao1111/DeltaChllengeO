import { Canvas } from "@react-three/fiber";
import type { ArtifactModel } from "../../types/artifact";
import ArtifactModel3D, { ArtifactLights } from "./ArtifactModel3D";

interface ArtifactModelDisplayProps {
  model: ArtifactModel;
  /** 已下载好的模型地址（由 ArtifactModelGate 提供） */
  src: string;
  /** 每秒自转弧度 */
  autoRotateSpeed?: number;
  className?: string;
}

/**
 * 只看不摸的文物 3D 展示：模型缓慢自转，不接任何交互控件。
 *
 * 用在展厅揭幕这类「亮个相」的场合——那里的手势要留给擦雾交互，
 * 所以画布整体屏蔽指针事件。需要旋转缩放的场景请用 <ArtifactViewer3D />。
 */
export default function ArtifactModelDisplay({
  model,
  src,
  autoRotateSpeed = 0.25,
  className = "",
}: ArtifactModelDisplayProps) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <Canvas
        camera={{ fov: 35, position: [0, 0.1, 3.8] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        /*
          外层那个 `pointer-events-none` **拦不住 R3F**：Canvas 会给自己的容器 div
          内联一句 `pointer-events: auto`（源码里 `eventSource ? 'none' : 'auto'`），
          内联样式赢过父层继承来的 none，于是这块画布照样吃掉点击。
          症状很隐蔽：画布是透明的、看着什么都没挡，但它覆盖范围内的按钮全点不动
          （第三章竞猜的「继续 →」就这么失灵过）。这里显式覆盖回 none。
        */
        style={{ pointerEvents: "none" }}
      >
        <ArtifactLights />
        <ArtifactModel3D model={model} src={src} autoRotateSpeed={autoRotateSpeed} />
      </Canvas>
    </div>
  );
}
