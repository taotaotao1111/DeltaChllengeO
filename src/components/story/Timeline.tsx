import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { TimelineEvent } from "../../types/artifact";

interface TimelineProps {
  events: TimelineEvent[];
  onActiveChange?: (event: TimelineEvent, index: number) => void;
}

/**
 * 横向时间轴。使用原生横向滚动 + scroll-snap 实现"拖动"体验，
 * 比自定义拖拽物理更稳健，在移动端也天然可用（触摸滑动）。
 */
export default function Timeline({ events, onActiveChange }: TimelineProps) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    children.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    if (closest !== active) {
      setActive(closest);
      onActiveChange?.(events[closest], closest);
    }
  };

  const scrollTo = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({
      left: child.offsetLeft - el.clientWidth / 2 + child.offsetWidth / 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full">
      {/* 节点导航条 */}
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-center gap-1 sm:gap-2">
        {events.map((e, i) => (
          <button
            key={e.id}
            onClick={() => scrollTo(i)}
            className="group flex flex-1 flex-col items-center gap-2"
          >
            <span
              className={`h-px flex-1 w-full transition-colors ${
                i <= active ? "bg-gilt-light/60" : "bg-rice-100/15"
              }`}
            />
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                i === active ? "bg-cinnabar" : i < active ? "bg-gilt-light/70" : "bg-rice-100/20"
              }`}
            />
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto pb-2"
      >
        {events.map((event, i) => (
          <div
            key={event.id}
            className="flex w-[82vw] shrink-0 snap-center flex-col items-center px-4 text-center sm:w-[440px]"
          >
            <motion.p
              animate={{ opacity: i === active ? 1 : 0.35, scale: i === active ? 1 : 0.94 }}
              transition={{ duration: 0.4 }}
              className="mb-2 text-xs tracking-widest text-gilt-light/70"
            >
              {event.year}
            </motion.p>
            <motion.h3
              animate={{ opacity: i === active ? 1 : 0.35 }}
              transition={{ duration: 0.4 }}
              className="font-title mb-4 text-2xl text-rice-100 sm:text-3xl"
            >
              {event.title}
            </motion.h3>
            <motion.p
              animate={{ opacity: i === active ? 1 : 0.25 }}
              transition={{ duration: 0.4 }}
              className="max-w-xs text-sm leading-7 text-rice-200/80"
            >
              {event.narration}
            </motion.p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] text-rice-200/30">← 左右滑动，慢慢看 →</p>
    </div>
  );
}
