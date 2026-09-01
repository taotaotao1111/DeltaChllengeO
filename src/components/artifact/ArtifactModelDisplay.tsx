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
      >
        <ArtifactLights />
        <ArtifactModel3D model={model} src={src} autoRotateSpeed={autoRotateSpeed} />
      </Canvas>
    </div>
  );
}
