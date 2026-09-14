/**
 * 长信宫灯 · 文物档案（骨架版）
 *
 * ⚠️⚠️ 史实尚未核实 ⚠️⚠️
 * 本档案里的 verifiedFacts **全部标为 inferred**，source 一律写明「尚未逐条核对」。
 * 它们是公开资料里的通说，但本项目还没有对照博物馆/考古报告逐条核对过，
 * 所以界面上会显示为「推测」而不是「已知」。
 *
 * 正式对外发布之前必须做的事：
 *   1. 逐条核对出土年份与地点、馆藏机构全名、年代范围、尺寸重量、刻铭字样与释读；
 *   2. 核实通过的改 confidence: "verified" 并把 source 换成确切出处；
 *   3. 核不实的直接删掉，不要留着凑数。
 * 在一个主张「不编造史料」的作品里，把没核过的话标成已知，等于自毁。
 *
 * 另外：images 指向项目内绘制的 DEMO 插画（SVG），不是文物实拍；
 * model 的授权信息同样待确认（与何尊现状一致）。
 *
 * 这一版刻意只做一章 —— 章数由档案决定，不必为了对齐何尊凑三章。
 */
import type { Artifact } from "../../types/artifact";

/** 未核实来源的统一措辞，别在各条里各写一套 */
const UNVERIFIED = "公开资料通说，本项目尚未逐条核对——正式发布前需补确切出处";

export const changxin: Artifact = {
  id: "changxin",
  name: "长信宫灯",
  nameEn: "Changxin Palace Lantern",
  dynasty: "西汉",
  period: "西汉（年代范围待核实）",
  museum: "馆藏机构待核实",
  summary:
    "一盏做成跪坐执灯宫女模样的鎏金铜灯。烟从她的袖口进去，藏在身体里；灯罩可以转动，光要照哪里由你决定。",

  personality: ["含蓄", "精巧", "低声说话", "对自己的来历有保留"],

  images: {
    hero: "demo:changxin-illustration",
    detail: ["demo:changxin-shade", "demo:changxin-sleeve"],
  },

  model: {
    url: "models/changxin.glb",
    // DEMO 数据：授权信息待确认，请在正式发布前替换为真实来源与授权说明
    license: "项目自有 DEMO 三维资源，授权信息待确认",
    source:
      "项目提供的长信宫灯三维模型（原始扫描件存于仓库外 ~/DeltaChallenge-assets/changxin.glb，来源与授权待补充确认）",
  },

  verifiedFacts: [
    {
      id: "fact-cx-form",
      content: "我是一盏鎏金铜灯，被做成一个跪坐着、举灯的宫女的样子。",
      source: UNVERIFIED,
      confidence: "inferred",
      tags: ["器型", "鎏金", "西汉"],
    },
    {
      id: "fact-cx-shade",
      content: "我的灯罩可以开合转动——光照的方向和亮度，是可以调的。",
      source: UNVERIFIED,
      confidence: "inferred",
      tags: ["灯罩", "调光", "设计"],
    },
    {
      id: "fact-cx-smoke",
      content: "举灯那只手的袖口连着灯罩，烟顺着中空的手臂进到我的身体里，不会满屋弥散。",
      source: UNVERIFIED,
      confidence: "inferred",
      tags: ["烟道", "设计", "科学性"],
    },
    {
      id: "fact-cx-parts",
      content: "我可以被拆开——分成若干部件，便于清理里面积下的烟灰。",
      source: UNVERIFIED,
      confidence: "inferred",
      tags: ["可拆卸", "清洗"],
    },
    {
      id: "fact-cx-name",
      content: "我身上刻着「长信」字样，后来的人因此称我为长信宫灯。这个名字不是我自己的。",
      source: UNVERIFIED,
      confidence: "inferred",
      tags: ["刻铭", "命名", "核心事实"],
    },
    {
      id: "fact-cx-unknown-holder",
      content:
        "举着灯的这个人是谁，没有记载。她有没有名字、是不是确指某一个人，我都答不上来。",
      source: "史料未见明确记载（未知边界，不作推测）",
      confidence: "inferred",
      tags: ["未知", "边界"],
    },
  ],

  timeline: [
    {
      id: "cx-made",
      year: "西汉",
      title: "被造出来",
      narration: "有人把一盏灯，做成了一个人的样子。她跪着，举着光。",
      factIds: ["fact-cx-form", "fact-cx-shade"],
    },
    {
      id: "cx-found",
      year: "出土年份待核实",
      title: "被挖出来",
      narration: "我从土里被取出来的时候，身上还留着那两个字。",
      sceneMood: "excavation",
      factIds: ["fact-cx-name"],
    },
    {
      id: "cx-today",
      year: "今天",
      title: "站在你面前",
      narration: "现在你可以转动我看。只是我的灯，很久没有点过了。",
      sceneMood: "today",
      factIds: ["fact-cx-unknown-holder"],
    },
  ],

  /** 骨架版还没有标定 3D 热点坐标，先不做器身观察，留到内容定稿之后 */
  hotspots: [],

  suggestedQuestions: [
    "你是用来做什么的？",
    "为什么叫长信宫灯？",
    "举着灯的这个人是谁？",
    "你能被拆开吗？",
    "烟到哪里去了？",
  ],

  memoryLines: [
    "我是一盏灯。\n光照向哪里，从来不是我决定的。",
    "他们用刻在我身上的两个字，叫了我两千年。",
  ],

  teaserLine: "你看到的灯光，其实是我藏起来的烟。",
  shortPeriod: "西汉",
  illustrationId: "changxin",
  /** 取铭文里那两个字——它们是这件器物身上唯一有字可依的落款 */
  sealChars: ["长", "信"],

  galleryReveal: {
    greetingLines: ["你把灯点着了吗。", "还没有。", "那先看看我——他们叫我长信宫灯。"],
    lineDelay: 2000,
    /**
     * 刻意不设竞猜。
     * 竞猜要立在一个「大众普遍误解、而史实能纠正」的点上；这件文物的史实
     * 还没核实完，现在编一道题就是拿没核过的说法当答案。
     */
  },

  chapters: [
    {
      id: "whose-am-i",
      label: "第一章",
      title: "我是谁的",
      module: {
        kind: "qa",
        openingLines: ["我身上有两个字。", "那两个字不是我的名字。", "是拥有过我的地方的名字。"],
        lineDelay: 2200,
        prompt: "你想先问哪一个？",
        items: [
          {
            id: "use",
            question: "你是用来做什么的？",
            answer:
              "照明。但不只是把火举起来那么简单——我的灯罩能开合转动，光要照哪个方向、照多亮，是可以调的。",
          },
          {
            id: "smoke",
            question: "烟到哪里去了？",
            answer:
              "举灯那只手的袖口连着灯罩，烟顺着中空的手臂进到我的身体里。所以点着我的时候，屋子里不会烟雾弥漫。",
          },
          {
            id: "name",
            question: "为什么叫长信宫灯？",
            answer:
              "因为我身上刻着「长信」两个字，后来的人就这样叫我。至于我怎么从一个地方到了另一个地方、经过谁的手——这些我身上没有写，我也不替史料编。",
          },
          {
            id: "holder",
            question: "举着灯的这个人是谁？",
            answer:
              "没有记载。我不知道她有没有名字，也不知道她是不是确指某一个人。这是我答不上来的问题里，最常被问到的一个。",
          },
        ],
      },
    },
  ],

  insights: [
    {
      requires: ["history"],
      text: "「长信」是刻在我身上的两个字，不是我自己的名字——它来自曾经拥有过我的地方。",
    },
  ],
  defaultInsight: "我是一盏灯。至于我属于谁，我身上只留了两个字。",
};
