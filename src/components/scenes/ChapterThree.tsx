import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InkBackground from "../shared/InkBackground";
import SpeechReveal from "../shared/SpeechReveal";
import InscriptionFocus from "../artifact/InscriptionFocus";
import RustReveal from "../artifact/RustReveal";
import GuessChoice, { type GuessOption } from "../shared/GuessChoice";
import { hezun } from "../../data/artifacts/hezun";
import { useGameStore } from "../../store/gameStore";

const LEAD_IN_LINES = ["你还记得，我说过我身上刻着字吗？", "现在，我想让你看看。"];
/**
 * 收尾不去解释「中国」一词后来如何演变 —— verifiedFacts 里没有这条，
 * 编一段词义演变史就越界了。所以这里明说"我身上没有记载"，
 * 只把有据可查的那一点讲死：它是目前所见最早的连用记录之一。
 */
const CLOSING_LINES = [
  "至于它后来怎么变成你们今天说的意思——我身上没有记载，我也不替史料编。",
  "我只知道：这两个字连在一起被写下来，目前所见最早的一次，就在我的内壁上。",
];

/**
 * 「中国」古今义竞猜。
 *
 * 这是全站立意最核心、也最容易被误读的一点：铭文里的「中国」意指
 * 「天下之中的都邑/区域」，与今天「中国」一词的含义**并不完全相同**
 * （见 fact-inscription-zhongguo）。与其把这句话念给用户听，不如让他先猜一次。
 */
const ZHONGGUO_OPTIONS: GuessOption[] = [
  {
    id: "same",
    label: "就是今天说的中国",
    response:
      "不完全是。那时候它还不是一个国家的名字——它说的是一个更具体的位置。",
  },
  {
    id: "center",
    label: "天下的中心、可以建都的地方",
    response:
      "你说到了。铭文里的「中国」，指的是天下之中的都邑——那个可以从中心去治理四方的地方。",
  },
  {
    id: "country-name",
    label: "一个国家的名字",
    response:
      "还不是。三千年前它更像是对一个位置的称呼，「国」在当时指的是城邑。",
  },
];

type Phase = "lead-in" | "derust" | "focus" | "guess" | "closing";

export default function ChapterThree() {
  const [phase, setPhase] = useState<Phase>("lead-in");
  const setStage = useGameStore((s) => s.setStage);
  const toggleChat = useGameStore((s) => s.toggleChat);
  const markDiscovered = useGameStore((s) => s.markDiscovered);

  // 铭文特写看完（进入竞猜）就算探索过了，不必等到收尾
  useEffect(() => {
    if (phase === "guess" || phase === "closing") markDiscovered("hotspot-inscription");
  }, [phase, markDiscovered]);

  const inscriptionFacts = hezun.verifiedFacts.filter((f) =>
    ["fact-inscription-zhongguo", "fact-inscription-content"].includes(f.id),
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <InkBackground glow={0.7} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute left-[calc(1.5rem+var(--safe-left))] top-[calc(5rem+var(--safe-top))] z-10 sm:left-10 sm:top-24"
      >
        <p className="text-xs tracking-widest text-gilt-light/70">第三章</p>
        <h1 className="font-title text-2xl text-rice-100 sm:text-3xl">我身上的秘密</h1>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setStage("chapter2")}
        className="fixed left-[calc(1.5rem+var(--safe-left))] top-[calc(1.5rem+var(--safe-top))] z-20 text-xs tracking-wide text-rice-100/60 sm:left-8 sm:top-8"
      >
        ← 上一章
      </motion.button>

      {phase === "lead-in" && (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <SpeechReveal
            lines={LEAD_IN_LINES}
            lineDelay={2400}
            onComplete={() => setPhase("derust")}
            className="max-w-md"
            textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl"
          />
        </div>
      )}

      {/* 听说有字 → 亲手擦出字影 → 看清并读懂，三步递进 */}
      {phase === "derust" && <RustReveal onRevealed={() => setPhase("focus")} />}

      <InscriptionFocus
        open={phase === "focus"}
        facts={inscriptionFacts}
        onClose={() => setPhase("guess")}
      />

      {phase === "guess" && (
        <div className="flex h-full w-full items-center justify-center px-6">
          <GuessChoice
            question="三千年前，我身上的「中国」是什么意思？"
            options={ZHONGGUO_OPTIONS}
            onDone={() => setPhase("closing")}
          />
        </div>
      )}

      {phase === "closing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
        >
          <SpeechReveal
            lines={CLOSING_LINES}
            lineDelay={2400}
            className="mb-10 max-w-lg"
            textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
            onComplete={() => {}}
          />

          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.7 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <button
                onClick={() => toggleChat(true)}
                className="rounded-full bg-gilt/25 px-6 py-2.5 text-sm tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.15)] transition hover:bg-gilt/35"
              >
                问问我
              </button>
              <button
                onClick={() => setStage("timeline")}
                className="rounded-full border border-rice-100/20 px-6 py-2.5 text-sm tracking-wide text-rice-100/80 transition hover:border-rice-100/40 hover:text-rice-100"
              >
                看看我经历了多久 →
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
