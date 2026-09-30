import { type CSSProperties, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import { track } from "../../../utils/tracking";
import type { Artifact, FlipModuleData } from "../../../types/artifact";

type Phase = "lead-in" | "cards" | "merge" | "closing";

/** 拖拽多远判定为一次「翻面/下一张」（占卡片宽的比例） */
const FLIP_DRAG_RATIO = 0.25;
/** 未翻态下拖拽跟手的旋转预览幅度（px → deg） */
const DRAG_ROTATE_GAIN = 0.33;

/**
 * 做旧纸卡：历史古物纸张的质感（与第四章释文卡同一套纸语言——暖褐纸底 +
 * paper-noise 噪点 + 深色边框，别让第五章长成另一种材质）。
 * 做旧层：陈年水渍、中缝折痕、边缘烧旧晕、纸纤维横纹、零星铜锈斑
 * （和铜器一起埋过的痕迹）。front 纸偏暖偏金（STORY），back 纸偏沉偏铜（FACT）。
 * 用多重 background 而不是子 div：绝对定位子层会盖住非定位的正文文本，
 * 而 -z-10 又会沉到父层背景色后面（背景层老坑，两版都试过）。
 */
const agedPaper = (tone: "front" | "back"): CSSProperties => ({
  background: [
    // 铜绿锈斑：卡角零星两三点（和铜器一起埋过的痕迹）
    "radial-gradient(circle at 84% 14%, rgba(92,124,104,0.28), transparent 9%)",
    "radial-gradient(circle at 12% 80%, rgba(92,124,104,0.20), transparent 8%)",
    // 陈年水渍：一块极淡的深晕
    "radial-gradient(ellipse at 30% 70%, rgba(20,15,6,0.16), transparent 26%)",
    // 中缝折痕：这张卡被对折收进过档案袋
    "linear-gradient(to right, transparent 49.4%, rgba(10,8,4,0.22) 49.9%, rgba(226,205,160,0.06) 50.1%, transparent 50.6%)",
    // 边缘烧旧：纸心最亮、四缘压暗
    "radial-gradient(ellipse at 50% 46%, transparent 54%, rgba(18,13,5,0.32) 86%, rgba(13,9,3,0.5) 100%)",
    // 纸纤维：极淡横纹
    "repeating-linear-gradient(178deg, rgba(226,205,160,0.05) 0px, rgba(226,205,160,0.05) 1px, transparent 1px, transparent 7px)",
    // 纸底（走查反馈：整体偏暗近皮革——纸心提亮一档，更「纸」）
    tone === "front"
      ? "linear-gradient(105deg, #52422a 0%, #423523 45%, #2d2313 100%)"
      : "linear-gradient(105deg, #3e3622 0%, #2f2917 45%, #211c0f 100%)",
  ].join(", "),
  boxShadow: [
    "inset 0 0 42px rgba(14,10,4,0.55)",
    "inset 0 1px 0 rgba(226,205,160,0.10)",
    "0 18px 48px rgba(0,0,0,0.55)",
  ].join(", "),
});

/** 卡片公共类：做旧纸卡的边框与圆角（直角化，纸不是塑料） */
const paperCardClass =
  "paper-noise absolute inset-0 flex flex-col items-center justify-center rounded-sm border-2 border-[#171008] px-6";

/**
 * 翻牌卡片模块：正面 STORY 口白 / 背面 FACT 核实卡。
 *
 * 翻牌这个动作本身就是本项目 FACT/STORY 双层原则的可视化——
 * 正面是感性的「我差点没了」，翻过来是冷色的核实卡（来源 + 置信度），
 * 用户亲手完成一次「情绪 → 求证」。
 *
 * 读完最后一张不直接 closing：档案写了 mergeLine 就先走「合成时刻」——
 * 整摞卡片（六张全收进来）依次落叠，最上面盖半透明 STORY 纸，
 * 压暗后浮现点题句，把双层立意在章尾收束。
 *
 * 翻面手势：横向拖拽（像翻纸牌）——未翻态拖过卡片 1/4 宽自动翻面（带跟手旋转预览），
 * 已翻态左滑下一张。点击翻面与按钮保留为无障碍兜底（FogWipeReveal skip 同款纪律）。
 * 旋转统一由 motionValue 驱动（baseSpring 管翻面动画、dragX 管跟手预览），
 * 不用 animate prop——两者同属性会打架。
 */
export default function FlipCardModule({
  artifact,
  data,
  onNext,
}: {
  artifact: Artifact;
  data: FlipModuleData;
  onNext: () => void;
}) {

  const [phase, setPhase] = useState<Phase>("lead-in");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // —— 拖拽翻牌的 motionValue 链 ——
  // baseRotation：0（正面）/ 180（背面），spring 驱动翻面动画
  const baseRotation = useMotionValue(0);
  const baseSpring = useSpring(baseRotation, { stiffness: 120, damping: 16 });
  // dragX：拖拽跟手位移；未翻态映射为 ±旋转预览，已翻态只保留轻微位移感
  const dragX = useMotionValue(0);
  const rotateY = useTransform([baseSpring, dragX], ([b, x]: number[]) =>
    b < 90 ? b + x * DRAG_ROTATE_GAIN : 180 + x * 0.08,
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  const cards = data.cards;
  const card = cards[cardIndex];
  const isLastCard = cardIndex >= cards.length - 1;

  const nextCard = () => {
    if (isLastCard) {
      // 有 mergeLine 才走「合成时刻」，否则读完直接 closing（框架默认行为）
      if (data.mergeLine) {
        track("flip_merge_view", { artifactId: artifact.id });
        setPhase("merge");
      } else {
        setPhase("closing");
      }
    } else {
      setCardIndex(cardIndex + 1);
      setFlipped(false);
      baseRotation.set(0);
      dragX.set(0);
    }
  };

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    baseRotation.set(180);
    track("flip_card_view", { artifactId: artifact.id, cardId: card?.id ?? "", face: "back" });
  };

  /** 拖拽结束：左滑过阈值 = 翻面（未翻）/ 下一张（已翻） */
  const handleDragEnd = (_e: unknown, info: { offset: { x: number } }) => {
    const width = cardRef.current?.getBoundingClientRect().width ?? 300;
    const threshold = width * FLIP_DRAG_RATIO;
    if (info.offset.x < -threshold) {
      if (!flipped) flip();
      else nextCard();
    }
  };

  /** 点击翻面兜底：拖拽后的 click 不算（framer 拖完会补发 click） */
  const handleCardClick = () => {
    if (draggedRef.current) {
      // 拖拽结束的 click 吞掉后复位，下一次真点击可以翻面
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 100);
      return;
    }
    flip();
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {phase === "lead-in" && (
            <motion.div
              key="lead-in"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md"
            >
              <SpeechReveal
                lines={data.openingLines}
                lineDelay={data.lineDelay}
                onComplete={() => (cards.length > 0 ? setPhase("cards") : setPhase("closing"))}
                textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
              />
            </motion.div>
          )}

          {phase === "cards" && card && (
            <motion.div
              key={`card-${card.id}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              {/* 进度点 */}
              <div className="flex items-center gap-1.5">
                {cards.map((c, i) => (
                  <span
                    key={c.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === cardIndex
                        ? "w-5 bg-gilt-light/70"
                        : i < cardIndex
                          ? "w-1.5 bg-gilt/50"
                          : "w-1.5 bg-rice-200/15"
                    }`}
                  />
                ))}
              </div>

              {/* 卡片（perspective + rotateY 翻面 + 横向拖拽手势） */}
              <div className="touch-none" style={{ perspective: 1200 }}>
                <motion.div
                  ref={cardRef}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragStart={() => {
                    draggedRef.current = true;
                  }}
                  onDragEnd={handleDragEnd}
                  style={{ x: dragX, rotateY, transformStyle: "preserve-3d" }}
                  onClick={handleCardClick}
                  className={`relative aspect-[3/4] h-[46vh] max-h-[420px] w-auto cursor-grab active:cursor-grabbing ${
                    flipped ? "cursor-default" : ""
                  }`}
                  role="button"
                  aria-label={flipped ? "事实核实卡" : "翻开看核实的事实"}
                >
                  {/* 正面：STORY 口白（做旧纸） */}
                  <div
                    className={paperCardClass}
                    style={{ backfaceVisibility: "hidden", ...agedPaper("front") }}
                  >
                    <p className="font-title text-[10px] tracking-[0.4em] text-gilt-light/60">
                      {cardIndex + 1} / {cards.length}
                    </p>
                    <p className="mt-4 text-center font-title text-base leading-8 text-rice-100/95 sm:text-lg">
                      {card.front}
                    </p>
                    <p className="absolute bottom-5 text-[10px] tracking-widest text-rice-200/35">
                      向左拖，翻开看核实的事实
                    </p>
                  </div>

                  {/* 背面：FACT 核实卡（做旧纸偏铜；已核实 = 朱砂印章） */}
                  <div
                    className={paperCardClass}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      ...agedPaper("back"),
                    }}
                  >
                    {/* 印章：方框朱印略歪着盖上去，verified 才有；推测态是墨色铅印 */}
                    <span
                      className={`font-title mb-4 inline-block border-2 px-2 py-0.5 text-[11px] tracking-[0.35em] ${
                        card.back.confidence === "verified"
                          ? "border-cinnabar/70 text-cinnabar-light/90"
                          : "border-rice-200/40 text-rice-200/60"
                      }`}
                      style={{ transform: "rotate(-2.5deg)" }}
                    >
                      {card.back.confidence === "verified" ? "已核实" : "合理推测"}
                    </span>
                    <p className="text-center text-xs leading-6 text-rice-200/80">
                      {card.back.content}
                    </p>
                    {card.hint && (
                      <p className="mt-3 border-l-2 border-gilt/35 pl-2.5 text-left text-[11px] leading-5 text-gilt-light/75">
                        {card.hint}
                      </p>
                    )}
                    <p className="mt-4 max-w-[85%] text-center text-[10px] leading-4 text-rice-200/40">
                      来源：{card.back.source}
                    </p>
                    {!isLastCard && (
                      <p className="absolute bottom-5 text-[10px] tracking-widest text-rice-200/35">
                        向左拖，看下一张
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* 操作：未翻 = 引导翻面；已翻 = 下一张/读完 */}
              <div className="flex h-10 items-center">
                {!flipped ? (
                  <button
                    onClick={flip}
                    className="rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                  >
                    翻面 →
                  </button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={nextCard}
                    className="rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                  >
                    {isLastCard ? "读完了 →" : "下一张 →"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "merge" && cards.length > 0 && (
            /* ===== 合成时刻：整摞卡片收拢 =====
               六张卡（不是只有最后一张）依次落进一摞——每张带着自己的歪斜与偏移，
               像把散落的档案纸一沓收齐；底下几张纸上留着各自口白的残影（极淡）。
               最上面是半透明 STORY 纸盖住整摞（记忆盖在事实堆上，backdrop-blur
               让底下所有纸透出来），压暗浮出 mergeLine 点题。 */
            <motion.div
              key="merge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-7"
            >
              <div
                className="relative aspect-[3/4] h-[46vh] max-h-[420px] w-auto"
                style={{ perspective: 1100 }}
              >
                {/* 六张纸依次落摞：0 在最底、5（末张 FACT 面）在摞顶。
                    偏移/歪斜是确定性数组（别 Math.random——重渲染会抖）。
                    落点散布故意开大（±14px / ±8°）：摞要看得见边，
                    飞入距离也拉开（±56px、上下交替），积累感才拍得出来。 */}
                {cards.map((c, i) => {
                  const rot = [-8, 5.5, -3.5, 8.5, -6, 3][i % 6];
                  const ox = [-14, 12, -7, 14, -10, 7][i % 6];
                  const oy = [8, -7, 5, -5, 7, -3][i % 6];
                  const flyX = i % 2 === 0 ? -56 : 56;
                  const isTop = i === cards.length - 1;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: i % 2 === 0 ? -60 : 48, rotate: rot * 0.4, x: flyX }}
                      animate={{ opacity: 1, y: oy, rotate: rot, x: ox }}
                      transition={{ delay: 0.15 + i * 0.17, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className={paperCardClass}
                      style={{ ...agedPaper("back") }}
                    >
                      {isTop ? (
                        /* 摞顶 = 末张 FACT 面（鬼影） */
                        <>
                          <p className="text-center text-xs leading-6 text-rice-200/45 blur-[0.5px]">
                            {c.back.content}
                          </p>
                          <p className="mt-4 max-w-[85%] text-center text-[10px] leading-4 text-rice-200/25 blur-[0.5px]">
                            来源：{c.back.source}
                          </p>
                        </>
                      ) : (
                        /* 底下的纸：只留口白第一行的残影，叠成一摞才有「整段年月都在这」 */
                        <p className="text-center text-[10px] leading-5 text-rice-200/20 blur-[0.5px]">
                          {c.front.split("\n")[0].slice(0, 10)}
                        </p>
                      )}
                    </motion.div>
                  );
                })}

                {/* STORY 纸（顶盖）：半透明合上来，整摞事实从记忆底下透出。
                    纸渐变本身不透明 → 单独一层 55% 透明度的纸，文字压在其上。 */}
                <motion.div
                  initial={{ opacity: 0, x: -72, rotateY: -26 }}
                  animate={{ opacity: 1, x: -11, rotateY: -6 }}
                  transition={{ delay: 1.15, duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-sm border-2 border-[#171008] backdrop-blur-[1.5px]"
                  style={{ boxShadow: "0 18px 48px rgba(0,0,0,0.55)" }}
                >
                  <div
                    className="paper-noise absolute inset-0 rounded-sm opacity-55"
                    style={agedPaper("front")}
                  />
                  <p className="relative text-center font-title text-base leading-8 text-rice-100/40 blur-[0.5px] sm:text-lg">
                    {cards[cards.length - 1].front}
                  </p>
                </motion.div>

                {/* 压暗 + 点题句：整摞叠稳之后浮现 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5, duration: 0.9 }}
                  className="absolute inset-0 flex items-center justify-center rounded-sm bg-ink-900/40 px-8"
                >
                  <p className="text-center font-title text-base leading-relaxed tracking-wide text-gilt-light drop-shadow-[0_0_16px_rgba(201,167,106,0.35)] sm:text-lg">
                    {data.mergeLine}
                  </p>
                </motion.div>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.4 }}
                onClick={() => setPhase("closing")}
                className="rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
              >
                继续 →
              </motion.button>
            </motion.div>
          )}

          {phase === "closing" && (
            <motion.div
              key="closing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex max-w-md flex-col items-center gap-5"
            >
              <SpeechReveal
                lines={data.closingLines}
                lineDelay={data.lineDelay}
                holdLast
                textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
                reveal={
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onNext}
                      className="rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                    >
                      看看我经历了多久 →
                    </button>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
