import { motion, useReducedMotion } from "framer-motion";
import type { FlipModuleData } from "../../../types/artifact";
import ArchiveCardFace from "./ArchiveCardFace";

/** 读完后才收拢六张实际纸卡；与逐张阅读共用图片、比例和内容。 */
export default function ArchiveCardStack({ artifactName, artwork, cards, message }: {
  artifactName: string;
  artwork: NonNullable<FlipModuleData["cardArtwork"]>;
  cards: FlipModuleData["cards"];
  message: string;
}) {
  const reduceMotion = useReducedMotion();
  return <div className="archive-card-stack" aria-label={`${cards.length} 张故事与史实卡收拢`}>
    {cards.map((card, index) => {
      const top = index === cards.length - 1;
      const rotation = [-5, 3.5, -2.5, 4, -3, 0][index % 6];
      const x = [-8, 7, -5, 8, -6, 0][index % 6];
      const y = [6, -4, 4, -3, 5, 0][index % 6];
      return <motion.div key={card.id} data-card-id={card.id}
        className={`archive-card-stack__sheet${top ? " is-top" : ""}`}
        initial={reduceMotion ? false : { opacity: 0, x: index % 2 ? 40 : -40, y: -30, rotate: rotation * .5 }}
        animate={{ opacity: 1, x, y, rotate: rotation }}
        transition={{ delay: reduceMotion ? 0 : index * .14, duration: reduceMotion ? 0 : .45, ease: [.22, 1, .36, 1] }}
        style={{ zIndex: index }}>
        <ArchiveCardFace face={top ? "front" : "back"} artwork={artwork} artifactName={artifactName}
          card={card} hidden={false} decorative onReadScroll={() => {}} />
      </motion.div>;
    })}
    <motion.div className="archive-card-stack__message" style={{ zIndex: cards.length }}
      initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay: reduceMotion ? 0 : (cards.length - 1) * .14 + .6, duration: reduceMotion ? 0 : .6 }}>
      <p>{message}</p>
    </motion.div>
  </div>;
}
