import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import GlyphChar from "../../shared/GlyphChar";
import { hasGlyph } from "../../../data/artifacts/hezun-glyphs";
import { useGameStore } from "../../../store/gameStore";
import { track } from "../../../utils/tracking";
import type { Artifact, InscriptionModuleData, InscriptionSection } from "../../../types/artifact";

type Phase = "lead-in" | "scroll" | "climax" | "closing";
type View = "overview" | "section";

/** climax 四字多久没全部点亮就自动点亮剩余的（无障碍兜底，同 FogWipeReveal skip 纪律） */
const CLIMAX_AUTO_LIGHT_MS = 8000;
const CLIMAX_CHARS = ["宅", "兹", "中", "国"];
/** 进入一段后讲述自动开始的延迟 */
const NARRATION_DELAY_MS = 700;

/** —— 卷面几何（固定像素，镜头数学依赖它，别改成响应式单位）—— */
/** 读态字形边长 */
const GLYPH = 52;
/** 列间距 */
const GAP = 32;
/** 列步进 */
const COL_STEP = GLYPH + GAP;
/** 每列字数 */
/** 竖排列每列字数。8：122 字排 16 列（4 字列在全览态只占纸带一小截，太空） */
const PER_COL = 8;
/** 读态镜头缩放上限（纸面高度足够时字不再放大） */
const READ_SCALE = 0.85;
/** 裁剪层比视口上下各多出的像素（RollerMount 外扩同款 14px） */
const CROP = 28;
/** 纸带左右留白（纸面坐标）：最外列不贴纸边 */
const SIDE_PAD = 20;
/** 读态纸面上下留白（视觉像素）：字区到纸缘的距离——纸高由它显式决定，不再撑满视口 */
const PAD_READ = 18;
/** 全览态纸面上下留白上限（视觉像素）：整卷字区上下最多各留这么宽 */
const PAD_OV = 56;

/**
 * 铭文解读模块：一卷到底。
 *
 * 与第三章 RustReveal「不画清晰字形」的关系：那条底线的语境是除锈场景——
 * 「发现有字」与「看清读懂」必须分成两步，且不伪造文物图像。本章是
 * 除锈之后的「读铭文」场景，摹写字形正是本章的目的；字形为手工 SVG
 * 摹写（非拓片），footnote 常驻声明。两处不矛盾，别合并。
 *
 * 卷面一次性铺开全部 122 字（fullText，右起竖排；精摹字走 GlyphChar，
 * 未摹字以示意字位呈现——不伪装）。交互是「镜头」：
 * - overview：整卷缩到屏宽铺满，给「一整卷」的量感；
 * - section：镜头推近到当前段（range），该段字依次点亮；横滑整卷跟手平移、
 *   松手吸附最近的段（沿卷走），按钮「下一段」同效；
 * - 末段讲完拉回全览（走过的段保持点亮），接 closing。
 * 历史包袱：连续拖拽展开（v1）被用户否掉——动作成本高反馈弱；横滑切段+
 * 每段单独一块纸（v2）也被否——用户要整卷全展示。别回退。
 *
 * 文字分层（可读性硬要求）：释文 = 史料译文，整段全亮常驻；讲述 = 何尊
 * 第一人称，SpeechReveal 逐句；sceneNote 做标签不混正文；debateNote 弱化
 * 为讲述下方小字。状态全部留在本组件内部（不上提 ChapterHost）。
 */
export default function InscriptionModule({
  artifact,
  data,
  onNext,
}: {
  artifact: Artifact;
  data: InscriptionModuleData;
  onNext: () => void;
}) {
  const markDiscovered = useGameStore((s) => s.markDiscovered);

  const sections = data.sections;
  const fullText = data.fullText;
  const [phase, setPhase] = useState<Phase>("lead-in");
  const [view, setView] = useState<View>("overview");
  const [activeIndex, setActiveIndex] = useState(0);
  /** 讲述状态：narrating 本段讲述中 */
  const [narrating, setNarrating] = useState(false);
  /** 全章已读完（末段讲述完成）：全览的出口从「从头读」换成「继续听我说」 */
  const [readComplete, setReadComplete] = useState(false);
  /** 考据角标展开态 */
  const [noteOpen, setNoteOpen] = useState(false);
  /** 脚注 ⓘ 展开态（与考据互斥） */
  const [infoOpen, setInfoOpen] = useState(false);
  const climaxDoneRef = useRef(false);
  const trackedRef = useRef(-1);
  const autoNarrateRef = useRef<number | null>(null);
  /** 入场铺开动画只播一次（末段读完拉回全览不重播） */
  const introPlayedRef = useRef(false);

  // —— climax 四字划过点亮：litChars 是已点亮的字下标集合，rect 缓存做碰撞检测 ——
  const [litChars, setLitChars] = useState<number[]>([]);
  const climaxRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const climaxGlyphRefs = useRef<(HTMLDivElement | null)[]>([]);

  // —— 卷面镜头：x 平移 + 缩放，命令式 animate 驱动（drag 直接写 x）——
  const cameraX = useMotionValue(0);
  const cameraScale = useMotionValue(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const section: InscriptionSection | undefined = sections[activeIndex];
  const allLit = litChars.length >= CLIMAX_CHARS.length;

  const COLS = Math.ceil(fullText.length / PER_COL);
  /** 轴头宽 */
  const ROLLER_W = 24;
  /** 纸缘到第一列的距离：左右留白 + 轴头 + 列间距 */
  const EDGE = SIDE_PAD + ROLLER_W + GAP;
  /** 纸条总宽（字列区 + 两端留白与轴头）。轴头在 flex 首尾，卷首 Roller 在视觉最右 */
  const stripW = 2 * EDGE + COLS * COL_STEP - GAP;
  /** 竖列总高（8 字 + 7 间距），镜头纵向适配的基准 */
  const COLUMN_H = PER_COL * GLYPH + (PER_COL - 1) * 8;
  /** 全览缩放：整卷正好铺满视口宽 */
  const fitScale = vp.w > 0 ? Math.min(1, vp.w / stripW) : 1;
  /**
   * 读态缩放：字区 + 上下留白（PAD_READ）恰好填满可用纸高（视口 + 裁剪层外扩）。
   * 旧公式 0.85×(h-20)/列高会让纸面上下各悬 ~10% 空白（用户反馈「文字上下留着间距」）——
   * 改成显式留白后纸变矮、字反而更大。
   */
  const readScaleFor = (vh: number) =>
    vh > 0 ? Math.min(READ_SCALE, (vh + CROP - 2 * PAD_READ) / COLUMN_H) : 1;
  const readScale = readScaleFor(vp.h);

  /** 列中心在纸条坐标系里的 x（右起：纸缘留白 + 轴头 + 列间距 + 半个字宽；col 0 最右） */
  const colCenterX = (col: number) => stripW - EDGE - col * COL_STEP - GLYPH / 2;
  /** 段 k 覆盖的列范围中心 */
  const sectionCenterCol = (k: number) => {
    const [s, e] = sections[k].range;
    return (Math.floor(s / PER_COL) + Math.floor((e - 1) / PER_COL)) / 2;
  };
  /**
   * 读态镜头 x：让段 k 的中心列尽量落在视口中央，再钳制到 [视口-纸宽, 0]——
   * 保证纸面永远铺满视口（读卷首时当前段靠右、读卷尾时靠左，纸不出画）。
   */
  const clampFocus = (k: number, w: number, rs: number) =>
    Math.min(0, Math.max(w - stripW * rs, w / 2 - colCenterX(sectionCenterCol(k)) * rs));
  /** 读态拖拽边界：同钳制——纸面填满视口，拖不出黑边 */
  const dragBounds =
    view === "section" && vp.w > 0
      ? { left: vp.w - stripW * readScale, right: 0 }
      : undefined;

  /** —— 纸带高度：字区 + 上下留白，封顶裁剪层高 ——
   * 旧实现纸带永远反向缩放撑满裁剪层（100/scale%），而字区只填得下其中一部分，
   * 上下各悬一大截空白（读态 ~10%、全览更多）——用户反馈的「文字上下留着间距」。
   * 现在留白是显式常量（PAD_READ / PAD_OV），纸面贴合内容。 */
  const camScale = view === "overview" ? Math.max(fitScale, 0.05) : readScale;
  const cropH = vp.h + CROP;
  const paperPad = view === "overview" ? PAD_OV : PAD_READ;
  const paperVisualH =
    vp.h > 0 ? Math.min(cropH, COLUMN_H * camScale + 2 * paperPad) : cropH;
  /** 纸带布局高（自身坐标）与视觉顶端偏移：缩放后垂直居中于裁剪层 */
  const paperLayoutH = paperVisualH / camScale;
  const paperTop = (cropH - paperVisualH) / 2 - (paperLayoutH * (1 - camScale)) / 2;
  /** 固定轴座与纸带上下对齐（不再钉死裁剪层两缘，纸矮了轴座跟着矮） */
  const paperInset = vp.h > 0 ? (cropH - paperVisualH) / 2 : 0;

  /**
   * 视口测量用回调 ref 而不是 useLayoutEffect：viewport 随 phase 条件渲染，
   * 而 AnimatePresence mode="wait" 会等上一个子树退场完才挂载新的——
   * effect 跑的时候 ref 还是 null（deps 又不会再变），永远测不到。
   * 回调 ref 在 DOM 真正插进来那一刻触发，与挂载时机解耦。
   * 顺带过滤挂载过渡期的瞬态尺寸（宽或高 <50px 的测量不采信）。
   */
  const roRef = useRef<ResizeObserver | null>(null);
  // useCallback 固定身份：内联函数每渲染一个新 ref 会让 React 反复重调 → 死循环
  const attachViewport = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const take = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 50 || r.height <= 50) return;
      // 值没变就不换 state 对象（同值 set 新对象也会触发渲染）
      setVp((prev) =>
        Math.abs(prev.w - r.width) > 0.5 || Math.abs(prev.h - r.height) > 0.5
          ? { w: r.width, h: r.height }
          : prev,
      );
    };
    take();
    const ro = new ResizeObserver(take);
    ro.observe(el);
    roRef.current = ro;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);

  // 尺寸就绪后：首次进卷做「缓缓铺开」——镜头从卷首（读态位）拉回到全览，
  // 像手卷被展开铺平。此后回全览（末段读完）直接摆位即可。
  useEffect(() => {
    if (vp.w > 0 && view === "overview" && phase === "scroll") {
      if (!introPlayedRef.current) {
        introPlayedRef.current = true;
        const lv = { w: vp.w, h: vp.h };
        const rs = readScaleFor(lv.h);
        cameraScale.set(rs);
        cameraX.set(clampFocus(0, lv.w, rs));
        animate(cameraScale, fitScale, { duration: 1.9, ease: [0.22, 1, 0.36, 1] });
        animate(cameraX, 0, { duration: 1.9, ease: [0.22, 1, 0.36, 1] });
      } else {
        cameraScale.set(fitScale);
        cameraX.set(0);
      }
    }
    // COLUMN_H / clampFocus 都是纯派生值（随 vp/sections 变），只在此一次性使用，
    // 入场动画播过即不再依赖——不进 deps，避免重复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h, fitScale, view, phase, cameraScale, cameraX]);

  /** 卷面每一列的字（含行内序号，供点亮判定） */
  const cols = useMemo(() => {
    const out: { c: string; j: number }[][] = [];
    for (let j = 0; j < fullText.length; j += PER_COL) {
      out.push(fullText.slice(j, j + PER_COL).map((c, k) => ({ c, j: j + k })));
    }
    return out;
  }, [fullText]);

  // 看完即算探索过铭文热点
  useEffect(() => {
    if (phase === "closing" && data.marksDiscovered) {
      markDiscovered(data.marksDiscovered);
    }
  }, [phase, data.marksDiscovered, markDiscovered]);

  // 段落曝光埋点（沿用原事件名）
  useEffect(() => {
    if (phase !== "scroll" || trackedRef.current === activeIndex) return;
    trackedRef.current = activeIndex;
    track("inscription_section_view", { artifactId: artifact.id, sectionIndex: activeIndex });
  }, [phase, activeIndex, artifact.id]);

  /** 讲述自动开始的统一入口（切段/推近共用，先清旧计时） */
  const scheduleNarration = (idx: number, delay: number) => {
    if (autoNarrateRef.current !== null) window.clearTimeout(autoNarrateRef.current);
    const target = sections[idx];
    if (target?.isClimax && !climaxDoneRef.current) {
      autoNarrateRef.current = window.setTimeout(() => setPhase("climax"), delay + 900);
    } else {
      autoNarrateRef.current = window.setTimeout(() => setNarrating(true), delay);
    }
  };

  /** 交互时刻的视口实测（比 state 更可靠——点按钮的瞬间 DOM 一定在） */
  const liveVp = () => {
    const r = viewportRef.current?.getBoundingClientRect();
    if (r && r.width > 50) return { w: r.width, h: r.height };
    return vp;
  };

  /** 全览 → 读态：镜头推近段 idx */
  const startReading = (idx: number) => {
    setView("section");
    setPhase("scroll");
    setActiveIndex(idx);
    setNarrating(false);
    setNoteOpen(false);
    const lv = liveVp();
    const rs = readScaleFor(lv.h);
    animate(cameraScale, rs, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    animate(cameraX, clampFocus(idx, lv.w, rs), {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    scheduleNarration(idx, 1400);
  };

  /** 读态内切段：镜头平移吸附段 idx（拖卷松手/点条共用；点当前段 = 重播讲述） */
  const goToSection = (idx: number) => {
    const clamped = Math.min(sections.length - 1, Math.max(0, idx));
    if (clamped === activeIndex && narrating) return;
    setActiveIndex(clamped);
    setNarrating(false);
    setNoteOpen(false);
    setInfoOpen(false);
    const lv = liveVp();
    animate(cameraX, clampFocus(clamped, lv.w, readScale), {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    });
    scheduleNarration(clamped, NARRATION_DELAY_MS + 400);
  };

  /** 松手吸附：由当前镜头位置反算最近的段 */
  const snapToNearestSection = () => {
    const lv = liveVp();
    if (lv.w <= 0) return;
    const visibleCenterCol = (lv.w / 2 - cameraX.get()) / readScale;
    let best = 0;
    let bestDist = Infinity;
    sections.forEach((_s, k) => {
      const d = Math.abs(colCenterX(sectionCenterCol(k)) - visibleCenterCol);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    });
    goToSection(best);
  };

  /** 末段讲完：直接进 closing。不再折回全览停留——「全览一句 122 字」+ closing
   *  「一百二十二个字读完了」两屏同义（用户反馈的重复感），全览只留给「再读一遍」。 */
  const handleNarrationComplete = () => {
    if (activeIndex >= sections.length - 1) {
      setReadComplete(true);
      window.setTimeout(() => setPhase("closing"), 400);
    }
  };

  /** 再读一遍：复位完成标记与 climax（重看时四字重新划亮） */
  const restartReading = () => {
    setReadComplete(false);
    climaxDoneRef.current = false;
    startReading(0);
  };

  // 卸载清理
  useEffect(
    () => () => {
      if (autoNarrateRef.current !== null) window.clearTimeout(autoNarrateRef.current);
    },
    [],
  );

  // climax 兜底：8s 未全亮则点亮剩余
  useEffect(() => {
    if (phase !== "climax") return;
    const t = window.setTimeout(() => setLitChars([0, 1, 2, 3]), CLIMAX_AUTO_LIGHT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // climax 重入（重看该节）时重置点亮态
  useEffect(() => {
    if (phase === "climax") {
      setLitChars([]);
      climaxRectsRef.current = [];
    }
  }, [phase]);

  /** climax 全屏层上的划过点亮：rect 碰撞检测（全屏层无滚动，rect 可缓存） */
  const handleClimaxSweep = (e: React.PointerEvent<HTMLDivElement>) => {
    if (climaxRectsRef.current.length === 0) {
      climaxRectsRef.current = climaxGlyphRefs.current
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          // 命中区放大 40%：手指粗、目标是大字，宁松勿严
          const pad = r.width * 0.4;
          return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
        })
        .filter((r): r is { x: number; y: number; w: number; h: number } => !!r);
    }
    const { clientX, clientY } = e;
    const hits = climaxRectsRef.current
      .map((r, i) =>
        clientX >= r.x && clientX <= r.x + r.w && clientY >= r.y && clientY <= r.y + r.h ? i : -1,
      )
      .filter((i) => i >= 0);
    if (hits.length > 0) {
      setLitChars((prev) => (hits.every((h) => prev.includes(h)) ? prev : [...prev, ...hits]));
    }
  };

  /** climax 收束：回卷轴，稍候自动开讲这一段 */
  const finishClimax = () => {
    climaxDoneRef.current = true;
    setPhase("scroll");
    window.setTimeout(() => setNarrating(true), 500);
  };

  /** 字 j 的点亮态：已读 1 / 当前段依次亮 / 未读暗 */
  const litOpacity = (j: number, inCurrentSection: boolean) => {
    const readStart = section?.range[0] ?? 0;
    if (j < readStart) return 1; // 已读过的段保持点亮
    if (inCurrentSection) return 1; // 当前段（带逐字 delay）
    return view === "overview" ? 0.38 : 0.3;
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 正文层：各相位 my-auto——放得下就居中，放不下自动顶对齐（auto margin 无剩余空间时归零）。
          之前 justify-center 在矮屏内容超高时上下同时溢出，纸带上缘顶进章节标题（390×700 实测 -17px）。 */}
      <div className="absolute inset-0 flex flex-col items-center px-6">
        <AnimatePresence mode="wait">
          {phase === "lead-in" && (
            <motion.div
              key="lead-in"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="my-auto max-w-md"
            >
              <SpeechReveal
                lines={data.openingLines}
                lineDelay={data.lineDelay}
                onComplete={() => setPhase("scroll")}
                textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
              />
            </motion.div>
          )}

          {phase === "scroll" && (
            <motion.div
              key="scroll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="my-auto flex w-full flex-col items-center pt-[calc(9.5rem+var(--safe-top))]"
            >
              {/* 卷面：手机占满视口宽；桌面限宽居中（全屏宽的纸带在 27 列面前太稀，且与下方窄文字卡断裂）。
                  高度 30vh：纸带实际高度由字区+留白决定（见 paperVisualH），这里只定镜头可用空间。
                  pt 9.5rem = 标题底(~128) + 纸带 14px 上外扩 + 净空：顶对齐兜底时纸缘也压不到标题 */}
              <div
                ref={attachViewport}
                className="relative h-[30vh] max-h-[400px] min-h-[220px] w-full max-w-md sm:max-w-2xl"
              >
                {/* 裁剪层：与固定轴座同高（视口 ±14px）。纸带在此层内被裁，出界不露 */}
                <div className="absolute -inset-y-[14px] left-0 right-0 overflow-hidden">
                  <div className="relative h-full w-full">
                {/* 纸条：右起竖排列；镜头（x 平移 + 缩放）由 motionValue 驱动。
                    高度 = 字区 + 上下留白（PAD_READ/PAD_OV），封顶裁剪层高——不再反向
                    撑满视口（那会让纸面上下各悬一截空白）。上下偏移保证缩放后垂直居中。 */}
                <motion.div
                  className="paper-noise absolute left-0 flex touch-none select-none items-center gap-[32px] rounded-sm border-y-[5px] border-[#1c160c]"
                  style={{
                    x: cameraX,
                    scale: cameraScale,
                    transformOrigin: "0% 50%",
                    height: `${(paperLayoutH / cropH) * 100}%`,
                    top: `${(paperTop / cropH) * 100}%`,
                    background: "linear-gradient(100deg, #55472a 0%, #43371f 45%, #2f2716 100%)",
                    boxShadow: "inset 0 0 42px rgba(16,12,5,0.6)",
                    /* 右起：col 0（铭文开头）渲染在最右——colCenterX 的镜头数学按它算，
                       丢了这行整个镜头是镜像的（v3 重写时踩过） */
                    flexDirection: "row-reverse",
                  }}
                  drag={view === "section" ? "x" : false}
                  dragConstraints={dragBounds}
                  dragElastic={0.06}
                  dragMomentum={false}
                  onDragEnd={() => {
                    if (view === "section") snapToNearestSection();
                  }}
                >
                  {/* 首端轴头：长在纸带上（随镜头缩放，天然与纸同高）。
                      放在 flex row-reverse 的第一个子位 = 视觉最右 = 卷首。
                      flex 顺序：这个 Roller → 列0 → 列1…（col 0 仍在最右列） */}
                  <Roller />

                  {cols.map((col, ci) => (
                    <div
                      key={ci}
                      className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-2"
                    >
                      {col.map(({ c, j }) => {
                        const [s, e] = section?.range ?? [0, 0];
                        const inCurrent = view === "section" && j >= s && j < e;
                        const op = litOpacity(j, inCurrent);
                        return hasGlyph(c) ? (
                          <motion.span
                            /* key 带 inCurrent：切段时该字重挂载，GlyphChar 的
                               笔画生长（grow）才会对新段重新播一遍 */
                            key={inCurrent ? `lit-${j}` : `dim-${j}`}
                            initial={false}
                            animate={{ opacity: op }}
                            transition={{
                              duration: 0.4,
                              delay: inCurrent ? (j - s) * 0.055 : 0,
                            }}
                            className={
                              inCurrent
                                ? "text-gilt-light drop-shadow-[0_0_8px_rgba(201,167,106,0.25)]"
                                : op >= 1
                                  ? "text-gilt-light/90"
                                  : "text-gilt-dark"
                            }
                          >
                            {/* 当前段：整字淡入换成逐笔书写（笔画生长）；
                                growDelay 跟外层 opacity 错峰同节奏 */}
                            <GlyphChar
                              char={c}
                              className="h-[52px] w-[52px]"
                              strokeWidth={3.4}
                              grow={inCurrent}
                              growDelay={(j - s) * 55}
                            />
                          </motion.span>
                        ) : (
                          /* 未精摹字 / 损泐字 □：低透明度示意字位，不伪装成摹写 */
                          <motion.span
                            key={j}
                            initial={false}
                            animate={{ opacity: Math.min(op, 0.62) }}
                            transition={{
                              duration: 0.4,
                              delay: inCurrent ? (j - s) * 0.055 : 0,
                            }}
                            className={`flex h-[52px] w-[52px] items-center justify-center font-title text-[34px] leading-none ${
                              inCurrent ? "text-rice-100/70" : "text-rice-100/45 blur-[1.5px]"
                            }`}
                          >
                            {c}
                          </motion.span>
                        );
                      })}
                    </div>
                  ))}

                  {/* 尾端轴头：flex 末位 = 视觉最左 = 卷尾 */}
                  <Roller />
                </motion.div>

                {/* 固定轴座：视口两缘、贯穿滑动全程可见的「手柄」。纸带从它下面穿过
                    （z 高于纸带），像纸绕在轴上被放出/卷入。 */}
                <RollerMount side="left" inset={paperInset} />
                <RollerMount side="right" inset={paperInset} />

                {/* 全览态的暗罩渐隐：卷的左右远端压暗（轴座之下，不压轴座） */}
                {view === "overview" && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(10,8,4,0.55), transparent 18%, transparent 82%, rgba(10,8,4,0.55))",
                    }}
                  />
                )}
                  </div>
                </div>
              </div>

              {/* ===== 全览态：提示 + 入口（读完后再进来，出口换成下一章） ===== */}
              {view === "overview" ? (
                <div className="mt-7 flex w-full max-w-md flex-col items-center gap-4">
                  <p className="text-center text-sm leading-7 text-rice-200/70">
                    {data.overviewHint ?? "这一卷纸，就是全部的铭文。"}
                  </p>
                  {readComplete ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={restartReading}
                        className="rounded-full border border-gilt/30 px-5 py-2.5 text-xs tracking-wide text-gilt-light/80 transition hover:border-gilt/50"
                      >
                        再读一遍
                      </button>
                      <button
                        onClick={onNext}
                        className="rounded-full bg-gilt/20 px-6 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                      >
                        继续听我说 →
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startReading(0)}
                      className="rounded-full bg-gilt/20 px-6 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                    >
                      从头读 →
                    </button>
                  )}
                </div>
              ) : (
                section && (
                  /* ===== 读态三层结构 =====
                     一层：释文卡（卷轴的延续，同款纸质感紧贴卷底）+ 考据/脚注 ⓘ
                     二层：何尊的低语（一次一句，金色微光，与史料明确分开）
                     三层：分段导航点条（进度即导航）。每屏可见文字量 = 一张卡 + 一句话。 */
                  <div className="mt-4 w-full max-w-md pb-[calc(3.5rem+var(--safe-bottom))] sm:max-w-xl">
                    {/* —— 释文卡 —— */}
                    <div className="relative">
                      <div
                        className="paper-noise rounded-sm border border-[#171209] px-5 pb-4 pt-3.5"
                        style={{
                          background:
                            "linear-gradient(100deg, #3a2f1b 0%, #2e2515 55%, #251d10 100%)",
                          boxShadow: "inset 0 0 30px rgba(14,10,4,0.55), 0 6px 24px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] tracking-widest text-gilt-light/80">
                            释文{section.sceneNote ? ` · ${section.sceneNote}` : ""}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {/* 考据角标：卡片标签行内的小「考」，不外凸不被卷轴压 */}
                            {section.debateNote && (
                              <button
                                onClick={() => {
                                  setNoteOpen((v) => !v);
                                  setInfoOpen(false);
                                }}
                                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] leading-none transition ${
                                  noteOpen
                                    ? "border-cinnabar-light/80 bg-cinnabar-light/20 text-cinnabar-light"
                                    : "border-cinnabar-light/50 text-cinnabar-light/90 hover:border-cinnabar-light/80"
                                }`}
                                title="学界释读分歧"
                              >
                                考
                              </button>
                            )}
                            {/* 脚注 ⓘ：摹写声明收进浮层，不再常驻占行 */}
                            <button
                              onClick={() => {
                                setInfoOpen((v) => !v);
                                setNoteOpen(false);
                              }}
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] leading-none transition ${
                                infoOpen
                                  ? "border-gilt-light/70 bg-gilt/20 text-gilt-light"
                                  : "border-gilt-light/40 text-gilt-light/70 hover:border-gilt-light/70"
                              }`}
                              title="字形来源说明"
                            >
                              ⓘ
                            </button>
                          </div>
                        </div>
                        {/* 释文：史料译文，整段常亮（逐字点亮惩罚阅读，不做） */}
                        <p className="mt-1.5 font-title text-[15px] leading-7 text-rice-100/95 sm:text-base">
                          {section.transcript}
                        </p>
                        {/* 考据 / 脚注浮层（互斥展开） */}
                        <AnimatePresence>
                          {noteOpen && section.debateNote && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 overflow-hidden border-l-2 border-cinnabar-light/30 pl-3 text-[11px] leading-4 text-cinnabar-light/65"
                            >
                              {section.debateNote}
                            </motion.p>
                          )}
                          {infoOpen && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 overflow-hidden border-l-2 border-gilt/60 pl-3 text-[11px] leading-4 text-rice-200/50"
                            >
                              {data.footnote}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* —— 何尊的低语：一次一句，与史料卡片明确分层。
                        居中：容器整体收窄（mx-auto + max-w），长句在容器内自然截行，
                        右下悬浮钮在容器外咬不到 —— */}
                    <div className="mx-auto mt-4 min-h-[3.5rem] max-w-[19rem] text-center sm:max-w-md">
                      {narrating ? (
                        <SpeechReveal
                          key={section.id}
                          lines={section.narrationLines}
                          lineDelay={data.lineDelay}
                          holdLast
                          onComplete={handleNarrationComplete}
                          textClassName="font-title text-base leading-relaxed text-gilt-light drop-shadow-[0_0_14px_rgba(201,167,106,0.25)] sm:text-lg"
                        />
                      ) : (
                        <p className="pt-1.5 text-[11px] tracking-widest text-rice-200/30">……</p>
                      )}
                    </div>

                    {/* —— 分段导航点条：进度即导航（点哪段去哪段），末段点亮为「读完了」 —— */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {sections.map((s, i) => {
                        const isCurrent = i === activeIndex;
                        const isLast = i === sections.length - 1;
                        return (
                          <button
                            key={s.id}
                            onClick={() => goToSection(i)}
                            title={s.sceneNote ?? `第 ${i + 1} 段`}
                            className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                              isCurrent
                                ? "w-16 bg-gilt/25 text-[10px] tracking-widest text-gilt-light"
                                : i < activeIndex
                                  ? "h-2.5 w-2.5 bg-gilt/55 hover:bg-gilt/75"
                                  : "h-2.5 w-2.5 bg-rice-200/15 hover:bg-rice-200/35"
                            }`}
                          >
                            {isCurrent
                              ? isLast
                                ? "读完了"
                                : `${i + 1} / ${sections.length}`
                              : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </motion.div>
          )}
          {phase === "closing" && (
            <motion.div
              key="closing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="my-auto flex max-w-md flex-col items-center gap-5"
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
                      继续听我说 →
                    </button>
                  </div>
                }
              />
              <p className="mt-6 text-center text-[10px] leading-4 text-rice-200/35">
                {data.footnote}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ climax：宅兹中国全屏（划过才点亮，既定决策不动） ============ */}
      <AnimatePresence>
        {phase === "climax" && section && (
          <motion.div
            key="climax"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="fixed inset-0 z-[60] flex touch-none flex-col items-center justify-center bg-ink-900/95 px-6"
            onPointerMove={handleClimaxSweep}
          >
            {/* 先现该节金文一行（快速掠过），再落四字——两句节奏 */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: [0, 0.5, 0.5], y: 0 }}
              transition={{ duration: 2.2 }}
              className="mb-10 flex flex-wrap justify-center gap-x-3"
            >
              {section.characters.map((c, i) =>
                hasGlyph(c) ? (
                  <span key={i} className="text-gilt/50">
                    <GlyphChar char={c} className="h-7 w-auto sm:h-8" strokeWidth={3.6} />
                  </span>
                ) : (
                  <span key={i} className="font-title text-sm text-rice-100/25 blur-[1px]">
                    {c}
                  </span>
                ),
              )}
            </motion.div>

            {/* 四字：初始极暗，手指划过才点亮（cinnabar 亮起 + gilt 辉光） */}
            <div className="flex items-center justify-center gap-[4vw] sm:gap-8">
              {CLIMAX_CHARS.map((c, i) => {
                const lit = litChars.includes(i);
                return (
                  <motion.div
                    key={c}
                    ref={(el) => {
                      climaxGlyphRefs.current[i] = el;
                    }}
                    animate={lit ? { opacity: 1, scale: 1 } : { opacity: 0.25, scale: 0.92 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="relative"
                  >
                    <motion.div
                      initial={false}
                      animate={{ opacity: lit ? [0, 0.45, 0.28] : 0 }}
                      transition={{ duration: 2.2 }}
                      className="absolute -inset-[30%] rounded-full"
                      style={{
                        background:
                          "radial-gradient(closest-side, rgba(201,167,106,0.5), transparent)",
                      }}
                    />
                    <span
                      className={`relative transition-colors duration-500 ${
                        lit
                          ? "text-cinnabar-light drop-shadow-[0_0_24px_rgba(201,167,106,0.4)]"
                          : "text-rice-100/40"
                      }`}
                    >
                      {/* key 带 lit：划亮瞬间重挂载 → 笔画以书写动画长出
                          （像武王当面写完这个字），而不是整字突然变亮 */}
                      <GlyphChar
                        key={lit ? `lit-${c}` : `dim-${c}`}
                        char={c}
                        className="h-[18vw] max-h-[140px] w-auto sm:h-[120px]"
                        strokeWidth={4}
                        grow={lit}
                      />
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {!allLit && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mt-10 text-[11px] tracking-widest text-rice-200/40"
              >
                用手划过这四个字
              </motion.p>
            )}

            {/* 落款与出口：四字全亮后才出现 */}
            {allLit && (
              <>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2 }}
                  className="mt-12 max-w-sm text-center font-title text-sm leading-7 text-rice-100/85 sm:text-base"
                >
                  余其宅兹中国，自之乂民。
                  <span className="mt-2 block text-[11px] tracking-widest text-gilt-light/60">
                    —— 武王告天
                  </span>
                </motion.p>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  onClick={finishClimax}
                  className="mt-10 rounded-full bg-gilt/20 px-6 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                >
                  听我说 →
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 固定轴座：视口两缘的「手柄」，滑动全程可见（纸带从它下面穿过）。
 * 高度跟随纸带（inset = 纸带视觉顶端到裁剪层顶的距离）——纸带收矮后
 * 轴座不能再钉死裁剪层两缘，否则会伸出纸面上下。
 */
function RollerMount({ side, inset }: { side: "left" | "right"; inset: number }) {
  return (
    <div
      className={`pointer-events-none absolute z-30 w-[26px] ${
        side === "left" ? "left-0" : "right-0"
      }`}
      style={{ top: inset, bottom: inset }}
      aria-hidden
    >
      <div
        className="h-full w-full rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
        style={{ background: "linear-gradient(90deg, #17120a, #4d3f22 38%, #241c0f)" }}
      />
      <div
        className="absolute left-1/2 top-0 h-2.5 w-[34px] -translate-x-1/2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(90deg, #17120a, #57482a 40%, #241c0f)" }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-2.5 w-[34px] -translate-x-1/2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(90deg, #17120a, #57482a 40%, #241c0f)" }}
      />
    </div>
  );
}

/**
 * 卷轴轴头：长在纸带两端（flex 子元素，随镜头缩放平移），与纸带天然同高。
 * 纯 CSS 圆柱（横向渐变出立体感）+ 上下端帽。拖到卷头/卷尾时会进入画面，
 * 正是「拖到头了」的物理暗示。
 */
function Roller() {
  const cap =
    "absolute left-1/2 h-2.5 w-[34px] -translate-x-1/2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.5)]";
  return (
    <div className="relative h-full w-[24px] shrink-0 self-stretch" aria-hidden>
      <div
        className="h-full w-full rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
        style={{ background: "linear-gradient(90deg, #17120a, #4d3f22 38%, #241c0f)" }}
      />
      <div
        className={`${cap} top-0`}
        style={{ background: "linear-gradient(90deg, #17120a, #57482a 40%, #241c0f)" }}
      />
      <div
        className={`${cap} bottom-0`}
        style={{ background: "linear-gradient(90deg, #17120a, #57482a 40%, #241c0f)" }}
      />
    </div>
  );
}
