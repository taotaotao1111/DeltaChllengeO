import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../shared/SpeechReveal";
import ArtifactCallout from "./ArtifactCallout";

interface MuseumIntroProps {
  onComplete: () => void;
}

/**
 * 开场背景图放在 public/ 而不是 src/ 里 import：
 * 它是首屏第一个要显示的东西，走 public 可以直接被浏览器请求，不必等打包产物解析。
 *
 * 两张图是同一个场景的横竖两版，各自把标题与文案排在了图里：
 * - 横版（1536×1024）：文字分列左右两侧
 * - 竖版（1024×1536）：完整海报，顶部竖排文案 + 底部「物语千年」标题与三行小字
 * 原图分别为 1.7MB / 1.9MB，已压到 323KB / 411KB。
 *
 * FOCUS 是「唤醒光」要对准的位置——中央展柜里的何尊，
 * 用的是图片自身坐标系的百分比（见下面 ASPECT 包裹层的说明）。
 */
const INTRO = {
  landscape: { src: "/images/museum-intro.jpg", aspect: "1536 / 1024", focus: { left: "49.5%", top: "63%" } },
  portrait: { src: "/images/museum-intro-portrait.jpg", aspect: "1024 / 1536", focus: { left: "48%", top: "53%" } },
} as const;

/**
 * 背景图里已经排好了「闭馆以后」「他们终于可以说话了」和标题「物语千年」，
 * 所以这里只补图上没有的那一句——把"接下来要做什么"说清楚，
 * 也正好接上展厅那句「今夜，你想认识谁？」。
 *
 * 仅横版需要这句：竖版海报底部自带三行小字，已经把氛围交代完了，
 * 再叠一句文案就会压住人家排好的标题。
 */
const LINES = ["今夜，选一件，听它讲自己的一生。"];

/** 竖屏没有逐句念白，先给海报一个静场的拍子，再让光亮起来 */
const PORTRAIT_GLOW_DELAY = 2600;

/** 推门动效的时长：走完再真正切场景，让用户看到自己"推进去"了 */
const ENTER_DURATION = 620;

/**
 * 用 JS 判断朝向而不是 CSS 的 portrait/landscape 变体：
 * 两张图加起来 700 多 KB，若靠 CSS 隐藏另一张，浏览器照样会把它下载下来。
 * 开场是首屏，这里必须做到只请求当前朝向真正要用的那一张。
 */
function usePortrait() {
  const [portrait, setPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return portrait;
}

/**
 * 开场：一张闭馆后的展厅照片，从黑暗里缓慢浮现。
 *
 * 念完不自动跳走，而是等用户主动推门——把"开始"这个动作交回给用户，
 * 免得一段独白刚读到一半场景就换了。
 */
export default function MuseumIntro({ onComplete }: MuseumIntroProps) {
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const portrait = usePortrait();
  const { src, aspect, focus } = portrait ? INTRO.portrait : INTRO.landscape;

  useEffect(() => {
    // 横屏由 SpeechReveal 念完后触发；竖屏没有念白，用定时器代替
    if (!portrait) return;
    const timer = setTimeout(() => setReady(true), PORTRAIT_GLOW_DELAY);
    return () => clearTimeout(timer);
  }, [portrait]);

  useEffect(() => {
    if (!entering) return;
    const timer = setTimeout(onComplete, ENTER_DURATION);
    return () => clearTimeout(timer);
  }, [entering, onComplete]);

  const enter = () => setEntering(true);

  return (
    <div
      /* 整屏可点，没有任何文字提示；重复点击不再叠加动效 */
      onClick={entering ? undefined : enter}
      className={`relative h-full w-full overflow-hidden bg-ink-900 ${entering ? "" : "cursor-pointer"}`}
    >
      {/* 横屏留边处会露出底色，垫一层模糊的同图当底噪，避免看着像没加载完 */}
      {!portrait && (
        <motion.img
          src={src}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 2.6, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover blur-2xl"
        />
      )}

      {/*
        这一层的尺寸要和图片"实际渲染出来的框"完全一致，
        这样里面的百分比就等于图片自身坐标，唤醒光才能准确落在展柜上。
        - 竖屏（cover）：min-w + min-h + 固定宽高比 —— 盒子同时不小于容器两边，等价于 cover
        - 横屏（contain）：max-w + max-h + 固定宽高比 —— 盒子同时不超出容器两边，等价于 contain
        横屏额外用 items-start 贴顶，把留白集中到下方让给念白和按钮。
      */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.6, ease: "easeOut" }}
        className={`absolute inset-0 flex justify-center overflow-hidden ${
          portrait ? "items-center" : "items-start"
        }`}
      >
        <motion.div
          /* 推门进场：以展柜为原点微微推近，像人往门里走了一步 */
          animate={entering ? { scale: 1.14 } : { scale: 1 }}
          transition={{ duration: ENTER_DURATION / 1000, ease: [0.4, 0, 0.2, 1] }}
          style={{ aspectRatio: aspect, transformOrigin: `${focus.left} ${focus.top}` }}
          className={`relative ${portrait ? "min-h-full min-w-full" : "max-h-full max-w-full"}`}
        >
          {/* 极缓慢的呼吸缩放：不加任何叠加物，只让静态图"活着" */}
          <motion.img
            src={src}
            alt="闭馆之后的青铜器展厅，中央展柜里立着何尊，墙上写着「闭馆以后，他们终于可以说话了」"
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none h-full w-full select-none object-cover"
          />

          {/* 唤醒光跟着图片走，所以放在同一个盒子里 */}
          {ready && <ArtifactCallout left={focus.left} top={focus.top} entering={entering} />}
        </motion.div>
      </motion.div>

      {portrait ? (
        /*
          竖屏底部这层渐变不是用来压暗的，而是给海报下缘一点呼吸感。
          钩子已经移到展柜上，所以这里比之前更淡，不跟中央的光抢注意力。
        */
        <AnimatePresence>
          {ready && !entering && (
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gilt/25 via-gilt/6 to-transparent"
            />
          )}
        </AnimatePresence>
      ) : (
        /* 横屏底部有念白和按钮，这里仍是常规的压暗，保证文字对比度 */
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900 via-ink-900/85 to-transparent" />
      )}

      {!portrait && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: entering ? 0 : 1 }}
          transition={{ delay: entering ? 0 : 1.3, duration: entering ? 0.3 : 1.2 }}
          className="absolute inset-x-0 bottom-[calc(2rem+var(--safe-bottom))] flex flex-col items-center px-6 text-center sm:bottom-[calc(3rem+var(--safe-bottom))]"
        >
          <SpeechReveal
            lines={LINES}
            lineDelay={2200}
            onComplete={() => setReady(true)}
            className="max-w-md"
            textClassName="font-title text-lg leading-relaxed text-rice-100/90 sm:text-2xl"
          />

          <AnimatePresence>
            {ready && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  enter();
                }}
                className="mt-8 rounded-full border border-gilt/40 bg-ink-900/40 px-7 py-3 text-sm tracking-wide text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.12)] backdrop-blur-sm transition hover:bg-gilt/10"
              >
                推门进去 →
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 竖屏整屏都能点，再放一个「跳过」是重复的，还会挤在海报顶部的竖排字旁边 */}
      {!portrait && !entering && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          whileHover={{ opacity: 0.8 }}
          transition={{ delay: 1.2 }}
          onClick={(e) => {
            e.stopPropagation();
            enter();
          }}
          className="fixed right-[calc(1.5rem+var(--safe-right))] top-[calc(1.5rem+var(--safe-top))] text-xs tracking-wide text-rice-100/60"
        >
          跳过 →
        </motion.button>
      )}
    </div>
  );
}
