import { lazy, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Artifact, Hotspot, HotspotType } from "../../types/artifact";
import { evaluateViewerMode } from "../../utils/artifactEvaluator";
import HezunIllustration from "./HezunIllustration";
import ArtifactHotspot from "./ArtifactHotspot";
import ArtifactModelGate from "./ArtifactModelGate";

// three.js + drei 有几百 KB，只有真正进入 3D 分支才值得下载。
// ArtifactModelGate 里已经有 Suspense（fallback 是加载占位），懒加载天然接得上。
const ArtifactViewer3D = lazy(() => import("./ArtifactViewer3D"));

interface ArtifactViewerProps {
  artifact: Artifact;
  hotspots?: Hotspot[];
  discoveredIds?: string[];
  onHotspotClick?: (hotspot: Hotspot) => void;
  activeHotspotType?: HotspotType | null;
  interactive?: boolean;
  className?: string;
}

/**
 * 文物展示容器。
 *
 * viewerMode 由 evaluateViewerMode 决定（3d / 2.5d / image）：
 * - 3d：渲染 <ArtifactViewer3D />（R3F + GLTF 真实扫描模型），热点钉在器身表面
 * - 2.5d：SVG 插画 + 鼠标视差倾斜 + 滚轮缩放 + 呼吸浮动，营造"在观察一件立体文物"的感觉
 *
 * 3D 只在文物数据里有合法模型且环境支持 WebGL 时启用；模型下载中或加载失败时，
 * ModelBoundary 会把画面接回同一套 2.5D 插画，热点点击逻辑两条分支完全共用。
 */
export default function ArtifactViewer({
  artifact,
  hotspots = [],
  discoveredIds = [],
  onHotspotClick,
  activeHotspotType = null,
  interactive = true,
  className = "",
}: ArtifactViewerProps) {
  const viewerMode = useMemo(() => evaluateViewerMode(artifact), [artifact]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 60, damping: 14 });
  const springY = useSpring(rotY, { stiffness: 60, damping: 14 });
  const rotateX = useTransform(springX, (v) => `${v}deg`);
  const rotateY = useTransform(springY, (v) => `${v}deg`);

  // 视差倾斜与滚轮缩放只服务于 2.5D 插画；3D 分支的相机交给 OrbitControls
  const parallaxEnabled = interactive && viewerMode === "2.5d";

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotY.set(px * 12);
    rotX.set(-py * 10);
  };

  const handleMouseLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!parallaxEnabled) return;
    e.preventDefault();
    setScale((s) => Math.min(1.7, Math.max(0.85, s - e.deltaY * 0.0012)));
  };

  // 2.5D 插画视图：既是 WebGL 不可用时的正式展示，也是 3D 加载中 / 失败时的兜底画面
  const illustrationView = (
    <motion.div
      className="relative inline-block animate-breathe"
      style={
        viewerMode === "image"
          ? undefined
          : { rotateX, rotateY, scale }
      }
      transition={{ scale: { type: "spring", stiffness: 120, damping: 18 } }}
    >
      <HezunIllustration
        className="h-[52vh] max-h-[460px] w-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)] sm:h-[58vh]"
        activeHotspot={activeHotspotType}
      />

      <div className="absolute inset-0">
        {hotspots.map((h, i) => (
          <ArtifactHotspot
            key={h.id}
            hotspot={h}
            active={activeHotspotType === h.type}
            discovered={discoveredIds.includes(h.id)}
            onClick={(hs) => onHotspotClick?.(hs)}
            delay={0.3 + i * 0.15}
          />
        ))}
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={{ perspective: 1200 }}
    >
      {viewerMode === "3d" && artifact.model ? (
        <ArtifactModelGate
          model={artifact.model}
          fallback={illustrationView}
          placeholderClassName="h-[52vh] max-h-[460px] sm:h-[58vh]"
        >
          {(src) => (
            <div className="h-full w-full animate-breathe">
              <ArtifactViewer3D
                model={artifact.model!}
                src={src}
                hotspots={hotspots}
                discoveredIds={discoveredIds}
                onHotspotClick={onHotspotClick}
                activeHotspotType={activeHotspotType}
                interactive={interactive}
              />
            </div>
          )}
        </ArtifactModelGate>
      ) : (
        illustrationView
      )}
    </div>
  );
}
