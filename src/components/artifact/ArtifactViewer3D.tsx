import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Html, OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { ArtifactModel, Hotspot, HotspotType } from "../../types/artifact";
import ArtifactModel3D, { ArtifactLights } from "./ArtifactModel3D";
import ArtifactHotspot from "./ArtifactHotspot";

interface ArtifactViewer3DProps {
  model: ArtifactModel;
  /** 已下载好的模型地址（由 ArtifactModelGate 提供） */
  src: string;
  hotspots?: Hotspot[];
  discoveredIds?: string[];
  onHotspotClick?: (hotspot: Hotspot) => void;
  activeHotspotType?: HotspotType | null;
  interactive?: boolean;
}

/** 用户停止拖拽后，多久恢复自动旋转（毫秒） */
const AUTO_ROTATE_RESUME_DELAY = 3000;

/** 「可以转动」的手势提示最多停留多久（毫秒） */
const HINT_VISIBLE_DURATION = 4500;

/**
 * 挂在模型表面的 3D 热点。
 *
 * 背面剔除没有用 drei 的 occlude —— 那会每帧对 27 万面的网格做射线检测，移动端吃不消。
 * 何尊近似旋转对称，所以直接用一个便宜的判据：把热点位置的水平分量当作它的外法线，
 * 与「热点 → 相机」方向做点积，转到背面（点积为负）时淡出并屏蔽点击。
 */
function Hotspot3D({
  hotspot,
  active,
  discovered,
  onClick,
  delay,
}: {
  hotspot: Hotspot;
  active: boolean;
  discovered: boolean;
  onClick?: (hotspot: Hotspot) => void;
  delay: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const camera = useThree((s) => s.camera);

  const position = hotspot.position3d as [number, number, number];
  const anchor = useRef(new Vector3(...position));
  // 外法线：忽略高度分量，得到器身表面朝外的水平方向
  const normal = useRef(new Vector3(position[0], 0, position[2]).normalize());
  const toCamera = useRef(new Vector3());

  useFrame(() => {
    const el = wrapperRef.current;
    if (!el) return;
    toCamera.current.copy(camera.position).sub(anchor.current).normalize();
    // 留一点余量，避免热点在正侧面边缘反复闪烁
    const facing = normal.current.dot(toCamera.current);
    const visible = facing > 0.15;
    el.style.opacity = visible ? "1" : "0";
    el.style.pointerEvents = visible ? "auto" : "none";
  });

  return (
    // 不用 distanceFactor：热点保持固定的屏幕尺寸，和 2.5D 分支的视觉语言一致，
    // 也避免用户拉近时标记被放大成一大坨
    <Html position={position} center zIndexRange={[20, 0]}>
      <div
        ref={wrapperRef}
        className="transition-opacity duration-300"
        // 青铜扫描件本身偏亮，暗金色的热点圈叠在上面几乎看不见，
        // 加一圈黑色投影把它从器身上"抠"出来
        style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.95)) drop-shadow(0 0 8px rgba(0,0,0,0.7))" }}
      >
        {/* ArtifactHotspot 内部用 left/top 百分比做绝对定位（服务于 2.5D 插画），
            这里给它一个零尺寸的定位父级，百分比归零，只剩自身的居中位移生效。 */}
        <div className="relative h-0 w-0">
          {/* 器身最亮处（中轴扉棱、受光面）会把暗金色的热点圈吃掉，
              垫一层柔和的暗色晕保证任何角度都看得见 */}
          <span className="pointer-events-none absolute left-0 top-0 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-900/55 blur-[5px]" />
          <ArtifactHotspot
            hotspot={hotspot}
            active={active}
            discovered={discovered}
            onClick={(hs) => onClick?.(hs)}
            delay={delay}
          />
        </div>
      </div>
    </Html>
  );
}

/**
 * 第一章的 3D 展示区：真实扫描模型 + 自由旋转缩放 + 钉在器身上的热点。
 *
 * 相机与热点坐标都基于 ArtifactModel3D 归一化后的空间（模型居中、总高 2 个单位）。
 */
export default function ArtifactViewer3D({
  model,
  src,
  hotspots = [],
  discoveredIds = [],
  onHotspotClick,
  activeHotspotType = null,
  interactive = true,
}: ArtifactViewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const resumeTimer = useRef<number>();

  const pauseAutoRotate = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    setAutoRotate(false);
    // 用户已经知道能转了，提示就该消失
    setHintVisible(false);
  }, []);

  const scheduleResume = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setAutoRotate(true), AUTO_ROTATE_RESUME_DELAY);
  }, []);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  // 没人告诉过用户模型可以转，而一半热点又藏在背面，所以给一次很轻的手势提示
  useEffect(() => {
    if (!interactive) return;
    const t = setTimeout(() => setHintVisible(false), HINT_VISIBLE_DURATION);
    return () => clearTimeout(t);
  }, [interactive]);

  const placed = hotspots.filter((h) => h.position3d);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ fov: 35, position: [0, 0.2, 4.2] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ touchAction: "none" }}
      >
        <ArtifactLights />

        {/* 何尊喇叭口的直径和器身高度接近，窄屏下按高度取景会左右出框，
            所以交给 Bounds 按包围球 + 当前画布比例自动取景（observe：窗口变化时重新适配）。
            热点放在 Bounds 之外，避免把浮层也算进包围盒。 */}
        <Bounds fit clip observe margin={1.15}>
          <ArtifactModel3D model={model} src={src} />
        </Bounds>

        {placed.map((h, i) => (
          <Hotspot3D
            key={h.id}
            hotspot={h}
            active={activeHotspotType === h.type}
            discovered={discoveredIds.includes(h.id)}
            onClick={onHotspotClick}
            delay={0.3 + i * 0.15}
          />
        ))}

        <OrbitControls
          makeDefault
          enabled={interactive}
          enablePan={false}
          target={[0, 0, 0]}
          // 取景距离由 Bounds 按屏幕比例决定，这里只给一个宽松的缩放范围
          minDistance={2.2}
          maxDistance={12}
          // 限制俯仰，避免用户转到正底面看到扫描模型的空腔
          minPolarAngle={0.6}
          maxPolarAngle={2.2}
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
          onStart={pauseAutoRotate}
          onEnd={scheduleResume}
        />
      </Canvas>

      <AnimatePresence>
        {interactive && hintVisible && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="pointer-events-none absolute inset-x-0 top-[8%] text-center text-[11px] tracking-widest text-rice-200/40"
          >
            拖动可以转动我 · 双指缩放
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
