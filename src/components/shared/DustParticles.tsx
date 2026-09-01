import { useMemo } from "react";

interface DustParticlesProps {
  count?: number;
  className?: string;
  /** 粒子颜色的 tailwind 背景类，默认暗金，可传入例如 "bg-cinnabar-light" 模拟火星 */
  colorClassName?: string;
}

/**
 * 光束中漂浮的尘埃颗粒。数量克制（默认 14 个），使用 CSS animation，
 * 避免逐帧 JS 计算，性能友好。
 */
export default function DustParticles({
  count = 14,
  className = "",
  colorClassName = "bg-gilt-light",
}: DustParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 35 + Math.random() * 30,
        top: 20 + Math.random() * 55,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute rounded-full ${colorClassName} animate-drift`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
