import { motion } from "framer-motion";
import type { Hotspot } from "../../types/artifact";

interface ArtifactHotspotProps {
  hotspot: Hotspot;
  active?: boolean;
  discovered?: boolean;
  onClick: (hotspot: Hotspot) => void;
  delay?: number;
}

/**
 * 一个可点击的呼吸式热点标记，悬浮时展开引导文案（teaser）。
 *
 * 配色按状态分工：**未探索用朱砂红**，因为朱砂与青铜绿是互补色，
 * 叠在受光最亮的器身上也压得住（之前统一用暗金，在亮面几乎看不见）；
 * **已探索退成暗金**——看过的就该让位给还没看的。
 */
export default function ArtifactHotspot({
  hotspot,
  active,
  discovered,
  onClick,
  delay = 0,
}: ArtifactHotspotProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(hotspot)}
      className="group absolute -translate-x-1/2 -translate-y-1/2 p-2.5 outline-none sm:p-1"
      style={{ left: `${hotspot.position.x}%`, top: `${hotspot.position.y}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6 }}
      aria-label={hotspot.label}
    >
      <span className="relative flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9">
        <span
          className={`absolute inset-0 rounded-full transition-colors duration-300 ${
            active
              ? "border-2 border-cinnabar-light"
              : discovered
                ? "border border-gilt/45"
                : "border-2 border-cinnabar-light/85"
          }`}
        />
        <span
          className={`absolute h-full w-full rounded-full animate-ping ${
            discovered && !active ? "bg-gilt/10" : "bg-cinnabar/25"
          }`}
          style={{ animationDuration: "3s" }}
        />
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            discovered && !active ? "bg-gilt/70" : "bg-cinnabar-light"
          }`}
        />
      </span>

      <span className="pointer-events-none absolute left-1/2 top-full mt-2 w-max -translate-x-1/2 whitespace-nowrap rounded-md border border-gilt/20 bg-ink-900/90 px-3 py-1 text-xs text-rice-100/90 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 sm:text-[13px]">
        {hotspot.teaser}
      </span>
    </motion.button>
  );
}
