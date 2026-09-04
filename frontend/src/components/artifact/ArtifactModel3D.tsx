import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader, MeshoptDecoder } from "three-stdlib";
import { Box3, Group, Vector3 } from "three";
import type { ArtifactModel } from "../../types/artifact";

/** 归一化后的模型总高度（世界单位）。相机参数与热点 position3d 都以此为基准。 */
const MODEL_HEIGHT = 2;

interface ArtifactModel3DProps {
  model: ArtifactModel;
  /**
   * 模型数据的实际地址。由 ArtifactModelGate 预先下载好后传进来的 blob URL ——
   * 下载和进度统一由它管，这里只负责解析与摆放。
   */
  src: string;
  /** 每秒自转弧度；0 表示不自转 */
  autoRotateSpeed?: number;
}

/**
 * 加载并「摆正」一件文物的 GLTF 模型。
 *
 * 不同来源的模型上轴约定、尺寸、原点位置都不一样，所以这里在运行时统一归一化：
 * 先按 model.rotation 摆正朝向，再把几何中心平移到原点，最后缩放到固定高度 MODEL_HEIGHT。
 * 这样相机参数和热点的 3D 坐标就有了稳定的参考系，换模型也不必重新调一遍魔法数字。
 */
export default function ArtifactModel3D({
  model,
  src,
  autoRotateSpeed = 0,
}: ArtifactModel3DProps) {
  const { scene } = useLoader(GLTFLoader, src, (loader) => {
    // 模型用 EXT_meshopt_compression 压缩，解码器由 three-stdlib 本地提供，不走 CDN。
    // 这里不用 drei 的 useGLTF：它默认会创建 DRACOLoader 并把解码器路径指向 gstatic。
    // 注意 three-stdlib 里 MeshoptDecoder 是个工厂函数，要先调用才拿到真正的解码器。
    loader.setMeshoptDecoder(
      typeof MeshoptDecoder === "function" ? MeshoptDecoder() : MeshoptDecoder,
    );
  });

  const spinRef = useRef<Group>(null);

  // 同一个模型可能被多个场景同时使用，而 useLoader 返回的是共享实例，
  // 直接挂载会互相抢占父节点，所以每处各自克隆一份。
  const object = useMemo(() => scene.clone(true), [scene]);

  // 摆正 + 居中 + 统一尺寸。都作用在克隆体上，不污染 useLoader 的缓存。
  const { scale, offset } = useMemo(() => {
    if (model.rotation) object.rotation.set(...model.rotation);
    object.updateMatrixWorld(true);

    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const height = size.y || 1;
    const s = MODEL_HEIGHT / height;

    return { scale: s, offset: center.multiplyScalar(-s) };
  }, [object, model.rotation]);

  useFrame((_, delta) => {
    if (spinRef.current && autoRotateSpeed) {
      spinRef.current.rotation.y += autoRotateSpeed * delta;
    }
  });

  return (
    <group ref={spinRef}>
      <group scale={scale} position={offset.toArray()}>
        <primitive object={object} />
      </group>
    </group>
  );
}

/**
 * 文物 3D 场景的统一布光。
 *
 * 整体走项目的墨色暗调，靠一盏偏暖的主光把青铜的高光和纹饰的起伏打出来，
 * 再补一盏冷光和一盏背光勾轮廓。不用 HDR 环境贴图，避免额外的资源下载。
 */
export function ArtifactLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fff3d8" />
      <directionalLight position={[-4, 1, -3]} intensity={0.45} color="#9db8e8" />
      <directionalLight position={[0, 2, -5]} intensity={0.35} color="#ffd9a0" />
    </>
  );
}
