import { motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";

const ITEMS: { key: "chapter1" | "timeline" | "chat"; label: string }[] = [
  { key: "chapter1", label: "认识我" },
  { key: "timeline", label: "探索历史" },
  { key: "chat", label: "问问我" },
];

/**
 * 全局仅有的三个入口，克制地悬浮在屏幕边缘，不做传统导航栏样式。
 */
export default function SectionNav() {
  const stage = useGameStore((s) => s.stage);
  const setStage = useGameStore((s) => s.setStage);
  const toggleChat = useGameStore((s) => s.toggleChat);

  if (stage === "museum" || stage === "gallery") return null;

  const handleClick = (key: "chapter1" | "timeline" | "chat") => {
    if (key === "chat") {
      toggleChat(true);
      return;
    }
    setStage(key);
  };

  const isActive = (key: string) => {
    if (key === "chapter1") return stage === "chapter1" || stage === "chapter2" || stage === "chapter3";
    return stage === key;
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      className="fixed left-1/2 top-[calc(0.75rem+var(--safe-top))] z-40 -translate-x-1/2 sm:top-6"
    >
      <div className="flex items-center gap-0.5 rounded-full border border-gilt/25 bg-ink-900/70 px-1 py-1 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.4)] sm:gap-1 sm:px-1.5 sm:py-1.5">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleClick(item.key)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] tracking-wide transition-colors duration-300 sm:px-4 sm:text-[13px] ${
              isActive(item.key)
                ? "bg-gilt/20 text-gilt-light"
                : "text-rice-200/70 hover:text-rice-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
