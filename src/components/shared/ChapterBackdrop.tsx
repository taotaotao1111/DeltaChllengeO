import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * 章节视觉母题。每一章的背景要能回答「我现在在哪儿」：
 * - forge  第二章：铸造作坊。炉膛的火自下而上，陶范的合范缝，飘起的火星。
 * - patina 第三章：锈色与字。铜绿斑块 + 内壁上大到看不清的字影。
 * - strata 时间线：三千年。横向地层层理，越往下越暗——它有大半辈子埋在土里。
 */
type Motif = "forge" | "patina" | "strata";

interface ChapterBackdropProps {
  motif: Motif;
  /** 额外压暗，配合前景文字密度微调 */
  dim?: number;
}

/** 炉火里往上飘的火星。数量克制，纯 CSS animation，不逐帧算 */
function Sparks({ count = 14 }: { count?: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 22 + Math.random() * 56,
        size: 1 + Math.random() * 2.2,
        delay: Math.random() * 7,
        duration: 5 + Math.random() * 5,
      })),
    [count],
  );

  return (
    <div className="absolute inset-x-0 bottom-0 top-1/3 overflow-hidden">
      {sparks.map((s) => (
        <span
          key={s.id}
          className="animate-spark absolute bottom-0 rounded-full bg-cinnabar-light"
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            boxShadow: "0 0 8px rgba(201,120,70,0.95)",
          }}
        />
      ))}
    </div>
  );
}

function ForgeMotif() {
  return (
    <>
      {/* 炉膛：光源在画面下方，是"火在下、器在上"的铸造光位 */}
      <motion.div
        className="absolute -bottom-[18vh] left-1/2 h-[70vh] w-[110vw] -translate-x-1/2 rounded-[50%] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(184,80,63,0.42), rgba(156,59,46,0.22) 45%, rgba(122,97,31,0.10) 70%, transparent 85%)",
        }}
        animate={{ opacity: [0.75, 1, 0.82, 1, 0.75], scale: [1, 1.05, 1.02, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 热浪：极淡的暖色横纹缓慢上移，让"纯黑的上半屏"有空气在动 */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[160vh] opacity-[0.11]"
        style={{
          background:
            "repeating-linear-gradient(to top, rgba(201,167,106,0.75) 0px, rgba(201,167,106,0) 3px, rgba(201,167,106,0) 68px)",
          maskImage: "linear-gradient(to top, transparent, black 25%, transparent 75%)",
          WebkitMaskImage: "linear-gradient(to top, transparent, black 25%, transparent 75%)",
        }}
        animate={{ y: ["0%", "-28%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />

      {/*
        陶范的合范缝：何尊是在陶范里成形的，范缝是这门工艺留在器物上的签名。
        做成三条几乎看不见的竖线，给画面一点"我在模具里"的结构感。
      */}
      <div className="absolute inset-y-0 left-0 right-0 flex justify-between px-[12vw]">
        {[0.1, 0.18, 0.1].map((o, i) => (
          <div
            key={i}
            className="h-full w-px"
            style={{
              background: `linear-gradient(to bottom, transparent, rgba(201,167,106,${o}) 30%, rgba(201,167,106,${o}) 70%, transparent)`,
            }}
          />
        ))}
      </div>

      <Sparks />
    </>
  );
}

function PatinaMotif() {
  return (
    <>
      {/* 铜绿锈斑：三块极慢漂移的青绿，模拟埋藏三千年长出来的皮壳 */}
      <motion.div
        className="absolute -left-[15%] top-[8%] h-[60vh] w-[60vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(92,124,104,0.34), transparent 68%)" }}
        animate={{ x: [0, 30, -12, 0], y: [0, 18, 34, 0] }}
        transition={{ duration: 52, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[12%] bottom-[6%] h-[55vh] w-[55vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(122,97,31,0.32), transparent 70%)" }}
        animate={{ x: [0, -24, 8, 0], y: [0, -18, 10, 0] }}
        transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
      />

      {/*
        字影：内壁上那句话，大到看不清的样子。
        只用「宅兹中国」这四个有据可查的字——不拼凑、不伪造其余 118 字的字形。
        第二章刻意没有这一层：铭文是第三章才被擦出来的秘密，提前铺开就剧透了。
      */}
      <motion.div
        /* 22vh × 4 字 × 1.05 行高 ≈ 92vh：再大一点「国」的下半截就会被视口切掉 */
        className="font-title absolute right-[4vw] top-1/2 -translate-y-1/2 select-none text-[22vh] leading-[1.05] tracking-tight text-rice-100 opacity-[0.08] blur-[2px]"
        animate={{ y: ["-52%", "-48%", "-52%"], opacity: [0.06, 0.095, 0.06] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      >
        宅
        <br />兹
        <br />中
        <br />国
      </motion.div>
    </>
  );
}

function StrataMotif() {
  return (
    <>
      {/*
        地层层理：横向的夯土色带，越往下越密越暗。
        它讲的是这条时间线真正的形状——出土之前的两千多年，是"埋着"的。
      */}
      {/*
        mask 中间那一段刻意压到 0.22：正文（年份、叙述、跨度条）就落在这一带，
        条纹一旦从字后面穿过去，读起来立刻变成"百叶窗背景"而不是地层剖面。
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(74,84,68,0.22) 0px, rgba(74,84,68,0.22) 30px, rgba(10,10,12,0) 30px, rgba(10,10,12,0) 96px)",
          maskImage:
            "linear-gradient(to bottom, transparent 10%, black 24%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0.22) 66%, black 82%, rgba(0,0,0,0.5) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 10%, black 24%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0.22) 66%, black 82%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* 层与层之间的一线暗金：像剖面上被光扫到的一道沉积界面 */}
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(201,167,106,0.85) 0px, rgba(201,167,106,0) 1px, rgba(201,167,106,0) 168px)",
          maskImage: "linear-gradient(to bottom, transparent 22%, black 60%, rgba(0,0,0,0.5) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 22%, black 60%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* 地表的天光：上方留一层冷白微光，和下方的土色分出"地上/地下" */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[38vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(230,220,195,0.09), rgba(230,220,195,0.02) 55%, transparent)",
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export default function ChapterBackdrop({ motif, dim = 0 }: ChapterBackdropProps) {
  return (
    <div className="paper-noise fixed inset-0 -z-10 overflow-hidden bg-ink-900" aria-hidden>
      {motif === "forge" && <ForgeMotif />}
      {motif === "patina" && <PatinaMotif />}
      {motif === "strata" && <StrataMotif />}

      {/*
        统一的舞台压暗：四边收进去，正文所在的中间带最干净。
        注意别调过头——第一版这两层用的是 /85 与 /45，直接把地层与热浪全吃掉了，
        屏幕上又变回一片纯黑。母题的强度和这里的压暗是一组联动参数。
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-transparent to-ink-900/65" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/25 via-transparent to-ink-900/25" />
      {dim > 0 && <div className="absolute inset-0 bg-ink-900" style={{ opacity: dim }} />}
    </div>
  );
}
