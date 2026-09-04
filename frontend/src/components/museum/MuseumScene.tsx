import { motion } from "framer-motion";
import InkBackground from "../shared/InkBackground";
import MuseumIntro from "./MuseumIntro";
import { useGameStore } from "../../store/gameStore";

/**
 * 首屏开场：完全黑暗中的第一句话。
 * 「闭馆以后，它们终于可以说话了。」
 *
 * 结束后进入 gallery 阶段——由 GalleryScene 负责「房间亮起 / 展柜显现」的
 * 视觉过程，这里只负责最开始那句最安静的独白。
 */
export default function MuseumScene() {
  const setStage = useGameStore((s) => s.setStage);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <InkBackground glow={0} />
      <motion.div
        className="absolute inset-0"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <MuseumIntro onComplete={() => setStage("gallery")} />
      </motion.div>
    </div>
  );
}
