import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../shared/SpeechReveal";

interface QA {
  id: string;
  question: string;
  answer: string;
}

const OPENING_LINES = [
  "那时候，我还没有名字。",
  "工匠把青铜熔化。",
  "火光照亮了整个作坊。",
];

const QA_LIST: QA[] = [
  {
    id: "why",
    question: "为什么要铸造你？",
    answer:
      "青铜在那个年代，不会被随便浇铸。重要的赏赐、重要的嘱托，常常需要被长久地记住——于是它们被铸进青铜。我，就是因为有一段话需要被记住，才被铸了出来。",
  },
  {
    id: "who",
    question: "谁使用你？",
    answer:
      "铭文里提到一个名字——「何」。他是那时宗室里的一位年轻子弟。后来的人，就用这个名字称呼我：何尊。",
  },
  {
    id: "carve",
    question: "你身上的字是谁刻的？",
    answer:
      "史料没有留下那位刻字工匠的名字。我只知道，在我还很新的时候，那122个字被小心地留在了我的内壁——这是史料没有回答的部分，我也不会替它编一个名字。",
  },
  {
    id: "mind",
    question: "那个时代的人在想什么？",
    answer:
      "从我身上的话来看，那时的人，正在思考「天下的中心应该在哪里」这样的问题——那关系到如何治理，如何让远方也归于秩序。「宅兹中国」，就是那个思考留下的痕迹。",
  },
];

interface HistoricalSceneProps {
  onContinue?: () => void;
  continueLabel?: string;
}

/**
 * 穿越西周——历史场景。
 * 使用 2D 插画 + Parallax 光影模拟"作坊/铸造现场"，而不做复杂 3D 场景。
 */
export default function HistoricalScene({ onContinue, continueLabel = "继续听我说 →" }: HistoricalSceneProps) {
  const [introDone, setIntroDone] = useState(false);
  const [activeQA, setActiveQA] = useState<QA | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  const handleAsk = (qa: QA) => {
    setActiveQA(qa);
    setVisited((v) => (v.includes(qa.id) ? v : [...v, qa.id]));
  };

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-6">
      {/*
        炉火氛围与火星已上移到 <ChapterBackdrop motif="forge" />（由 ChapterTwo 提供），
        这里不能再铺 bg-ink-900 或全屏渐变——否则会把背景母题和背后的文物整层盖掉。
      */}

      {/*
        原来这里有两个工匠剪影 SVG，已删除。
        它们填充与描边都是 #050504、压在 bg-ink-900 上，属于黑压黑等于没画；
        试过改成暖金轮廓光让它显形，结果暴露出形体本身太简陋（读起来是"火柴人线稿"），
        反而比看不见更廉价。作坊的临场感现在交给 <ChapterBackdrop motif="forge" />
        的炉膛光位、上升火星与合范缝，以及背景里在场的文物本体。
      */}

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        {!introDone ? (
          <SpeechReveal
            lines={OPENING_LINES}
            lineDelay={2200}
            onComplete={() => setIntroDone(true)}
            textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl"
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <AnimatePresence mode="wait">
              {activeQA ? (
                <motion.div
                  key={activeQA.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="mb-8 rounded-2xl border border-gilt/15 bg-ink-800/50 p-6 text-left backdrop-blur-sm"
                >
                  <p className="mb-2 text-xs tracking-widest text-cinnabar-light/80">
                    {activeQA.question}
                  </p>
                  <p className="text-sm leading-7 text-rice-100/90">{activeQA.answer}</p>
                </motion.div>
              ) : (
                <p className="mb-8 text-sm text-rice-200/60">你想先听哪一个？</p>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap justify-center gap-2.5">
              {QA_LIST.map((qa) => (
                <button
                  key={qa.id}
                  onClick={() => handleAsk(qa)}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    visited.includes(qa.id)
                      ? "border-gilt/40 text-gilt-light/70"
                      : "border-rice-100/20 text-rice-100/80 hover:border-gilt/40 hover:text-gilt-light"
                  }`}
                >
                  {qa.question}
                </button>
              ))}
            </div>

            {onContinue && (
              <AnimatePresence>
                {visited.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={onContinue}
                    className="mt-7 rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                  >
                    {continueLabel}
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
