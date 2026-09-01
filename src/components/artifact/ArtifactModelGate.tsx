import { Component, Suspense, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { ArtifactModel } from "../../types/artifact";
import { useModelFetch } from "./modelSource";
import ArtifactModelPlaceholder from "./ArtifactModelPlaceholder";

interface ArtifactModelGateProps {
  model: ArtifactModel;
  /** 真正降级时展示的内容（通常是 2.5D 手绘插画） */
  fallback: ReactNode;
  /** 传给加载占位的样式，用来对齐各场景的尺寸 */
  placeholderClassName?: string;
  children: (src: string) => ReactNode;
}

interface ErrorCatcherProps {
  fallback: ReactNode;
  children: ReactNode;
}

class ErrorCatcher extends Component<ErrorCatcherProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // 模型解析失败不该影响主线体验，记录一下就降级
    console.warn("[ArtifactModel] 3D 模型加载失败，已降级为 2.5D 展示", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * 3D 模型的加载闸门：把「下载中」「加载失败」「就绪」三种状态收在一处。
 *
 * - 下载中（含 3D 代码 chunk 还在路上）→ 中性占位 + 真实进度，**不显示手绘插画**，
 *   避免用户先看到一幅画再被换成实物
 * - 下载或解析失败 → 回落到 fallback（手绘插画），主线不中断
 * - 就绪 → 把 blob URL 交给 children，并做一次淡入
 *
 * 下载与进度由 modelSource 负责（不依赖 three，可留在首屏包）；
 * react-three-fiber 的 Canvas 会把内部的挂起与异常重新抛到外层，
 * 所以这里的 Suspense / ErrorBoundary 能同时接住 3D 代码与模型解析两个阶段。
 */
export default function ArtifactModelGate({
  model,
  fallback,
  placeholderClassName = "",
  children,
}: ArtifactModelGateProps) {
  const { progress, objectUrl, error } = useModelFetch(model.url);

  useEffect(() => {
    if (error) console.warn("[ArtifactModel] 模型下载失败，已降级为 2.5D 展示", error);
  }, [error]);

  if (error) return <>{fallback}</>;

  if (!objectUrl) {
    return <ArtifactModelPlaceholder progress={progress} className={placeholderClassName} />;
  }

  return (
    <ErrorCatcher fallback={fallback}>
      {/* chunk 与解析阶段拿不到字节进度，用不确定态的占位顶住 */}
      <Suspense
        fallback={<ArtifactModelPlaceholder progress={null} className={placeholderClassName} />}
      >
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {children(objectUrl)}
        </motion.div>
      </Suspense>
    </ErrorCatcher>
  );
}
