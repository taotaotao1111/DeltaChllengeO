import type { Artifact } from "../../types/artifact";

/**
 * 何尊 —— 数据档案
 *
 * 内容说明（重要，请勿删除本说明）：
 * - verifiedFacts 中的内容基于公开、被广泛引用的考古与博物馆资料整理
 *  （宝鸡青铜器博物院公开资料 / 学界对何尊铭文的通行释读），
 *   用于本 Demo 的历史事实基线。
 * - images 字段目前指向项目内绘制的 **DEMO 插画（SVG）**，
 *   并非文物实拍照片，仅用于展示交互效果，后续应替换为经授权的实拍图 / 3D 模型。
 * - narration / story 等文学化文案属于 STORY 层，用于让年轻用户更容易理解，
 *   但均围绕 verifiedFacts 展开，不引入未被史料支持的情节、人物或对话。
 */
export const hezun: Artifact = {
  id: "hezun",
  name: "何尊",
  nameEn: "He Zun",
  dynasty: "西周",
  period: "西周早期（约公元前11世纪，成王时期）",
  museum: "宝鸡青铜器博物院",
  summary:
    "一件西周早期的青铜礌器，内底铸有122字铭文，其中「宅兹中国」是目前所见「中国」一词最早的文字记录。",
  personality: ["沉稳", "温和", "克制", "见证者", "偶尔有一点幽默"],
  images: {
    // DEMO 数据：以下为项目内绘制的 SVG 插画路径标识，非文物实拍图
    hero: "demo:hezun-illustration",
    detail: ["demo:hezun-pattern", "demo:hezun-inscription", "demo:hezun-form"],
  },
  /**
   * 3D 模型（见 utils/artifactEvaluator.ts：有 url + license 且环境支持 WebGL 才启用 3D，
   * 否则自动降级为 2.5D 插画）。
   *
   * 产物由 scripts/pack-hezun-model.mjs 从原始扫描件压缩而来：
   * 95.75MB / 150 万三角面 → 4.5MB / 27 万三角面，贴图 4096 PNG → 2048 JPEG。
   *
   * 这份扫描件导出时已经是 three.js 需要的 Y-up（旋转对称轴沿 Y，包围盒
   * y ∈ [-0.416, 0.473]），本身就是正立的，所以不需要 rotation 校正。
   * 换模型时若发现器物躺着，再按需补 rotation。
   */
  model: {
    // 相对路径（不带开头斜杠）：Cowork 部署在 /s/<alias>/ 下，平台只改写 HTML
    // 并注入 <base href>，不改写 JS 字面量；写绝对路径会打到站点根拿不到模型。
    url: "models/hezun.glb",
    // DEMO 数据：授权信息待确认，请在正式发布前替换为真实来源与授权说明
    license: "项目自有 DEMO 扫描资源，授权信息待确认",
    // 这段会显示在 /sources 页面上，所以只写来源性质，不写本机路径
    source: "项目提供的何尊三维扫描件，授权信息待确认",
  },

  verifiedFacts: [
    {
      id: "fact-discovery",
      content:
        "何尊于1963年在陕西省宝鸡市贾村镇出土，出土后一度作为废旧金属流入回收渠道，后被当地文物工作者发现并收回，现藏于宝鸡青铜器博物院。",
      source: "宝鸡青铜器博物院公开资料",
      confidence: "verified",
      tags: ["发现", "宝鸡", "1963"],
    },
    {
      id: "fact-date",
      content:
        "何尊的年代被断定为西周早期，铭文内容与成王时期的史事相印证，铸造年代大致在公元前11世纪。",
      source: "学界通行断代意见（宝鸡青铜器博物院展陈说明）",
      confidence: "verified",
      tags: ["年代", "西周", "成王"],
    },
    {
      id: "fact-form",
      content:
        "何尊是一种「尊」——中国古代青铜礌器中的盛酒器/礌器类型，器身呈喇叭形大口、鼓腹、圈足，装饰有饕餮纹（兽面纹）与蕉叶纹等青铜器常见纹饰，兽面纹两侧带有明显的扉棱。",
      source: "宝鸡青铜器博物院展陈说明 / 中国古代青铜器分类通说",
      confidence: "verified",
      tags: ["器型", "尊", "纹饰"],
    },
    {
      id: "fact-size",
      content: "何尊高38.8厘米，口径28.6厘米，重14.6公斤。",
      source: "宝鸡青铜器博物院公开资料",
      confidence: "verified",
      tags: ["尺寸", "重量"],
    },
    {
      id: "fact-inscription-basic",
      content:
        "何尊内底铸有铭文，共122字（含重文），是研究西周早期历史的重要一级文物级实物证据，1975年经专家清理除锈后被发现并释读。",
      source: "宝鸡青铜器博物院公开资料 / 青铜器铭文研究通行记述",
      confidence: "verified",
      tags: ["铭文", "发现过程"],
    },
    {
      id: "fact-inscription-zhongguo",
      content:
        "何尊铭文中出现「宅兹中国」一语，是目前所见「中国」二字作为词组连用的最早文字记录之一。铭文中的「中国」意指「天下之中的都邑/区域」，与今天「中国」一词的含义并不完全相同。",
      source: "学界通行释读（多篇公开考古与文字学研究一致认定）",
      confidence: "verified",
      tags: ["铭文", "中国", "核心事实"],
    },
    {
      id: "fact-inscription-content",
      content:
        "铭文追述周武王在世时曾提及要在天下的中心营建都邑以治理民众，成王依此告诫宗室子弟「何」应效法先人、恪守职责，并赏赐何贝币，何因此铸造此尊以为纪念。",
      source: "学界对何尊铭文的通行释读",
      confidence: "verified",
      tags: ["铭文", "成王", "武王", "何"],
    },
    {
      id: "fact-owner",
      content:
        "铭文中的「何」是西周宗室中一位年轻的贵族子弟，此尊因此得名「何尊」；铭文以成王对何的训诫与赏赐为核心内容。",
      source: "学界对何尊铭文的通行释读",
      confidence: "verified",
      tags: ["何", "铭文"],
    },
    {
      id: "fact-status",
      content:
        "何尊现藏于宝鸡青铜器博物院，属于国家文物局公布的「禁止出境展览文物」名录中的文物之一。",
      source: "国家文物局公开名录",
      confidence: "verified",
      tags: ["现状", "禁止出境"],
    },
    {
      id: "fact-inscription-full",
      content:
        "铭文122字的大意：王初迁居成周、举行祭礼禀告武王与上天；成王在京室训诫宗室子弟「何」，追述其父辅佐文王之功，并转述武王克商后「宅兹中国」（定居天下之中）的告天之辞；训诰之后赏赐何贝三十朋，何因此铸尊以为纪念。铭文纪年为「唯王五祀」。",
      source: "学界对何尊铭文的通行释读",
      confidence: "verified",
      tags: ["铭文", "全文", "成王", "武王", "训诰", "赏赐"],
    },
    {
      id: "fact-inscription-debate",
      content:
        "铭文个别字词的释读（如开篇首字、作器对象称谓等）学界存在不同意见；本作品的解读采用学界通行释读，遇到分歧之处会明确标注。",
      source: "何尊铭文研究的公开学术文献综述（通行意见与异说并存）",
      confidence: "verified",
      tags: ["铭文", "释读", "分歧", "学术"],
    },
    {
      id: "fact-scrap-unearthed",
      content:
        "1963年，何尊出土于宝鸡县贾村镇（今宝鸡市陈仓区）一户陈姓村民家的后院断崖——取土时挖出，先藏于家中。",
      source: "王光永《宝鸡市博物馆新征集的饕餮纹铜尊》（《文物》1966年1期）· 李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年）",
      confidence: "verified",
      tags: ["出土", "1963", "贾村", "发现"],
    },
    {
      id: "fact-scrap-sale",
      content:
        "1965年8月，因生活困难，村民将此尊背到宝鸡市，以人民币30元卖给龙泉巷废品回收门市部；门市部营业员将此事告知博物馆工作人员，宝鸡市博物馆随即将其征集收藏。",
      source: "李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年，转述经手人王光永的记述）",
      confidence: "verified",
      tags: ["废品", "30元", "1965", "回收", "征集", "熔掉", "差点消失"],
    },
    {
      id: "fact-scrap-1975",
      content:
        "何尊入藏后十余年间因铜锈未除，内底铭文一直未被发现。1975年，何尊被列为出国展品，清除锈垢时发现内底铭文12行122字；唐兰、马承源等学者的考释文章于1976年《文物》发表，此尊从此定名「何尊」。",
      source: "李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年）·《文物》1976年1期考释文章",
      confidence: "verified",
      tags: ["1975", "除锈", "发现铭文", "定名", "考释"],
    },
    {
      id: "fact-unknown-personal",
      content:
        "关于「何」本人的具体身份、生平细节，以及此器在铸成之后流转、入土的具体经过，现有史料并未给出明确记载。",
      source: "现有公开考古资料的记述边界",
      confidence: "inferred",
      tags: ["未知", "边界"],
    },
  ],

  timeline: [
    {
      id: "tl-cast",
      year: "约公元前11世纪",
      title: "被铸造",
      narration: "那时候，我还没有名字。铜被熔化，浇进模具，火光照亮了整个作坊。",
      factIds: ["fact-date", "fact-form"],
      sceneMood: "furnace",
    },
    {
      id: "tl-inscribed",
      year: "西周早期",
      title: "被赐名、被刻字",
      narration:
        "有人把一段话，一字一字地留在了我的内壁。那句话，后来被称作「宅兹中国」。",
      factIds: ["fact-inscription-zhongguo", "fact-inscription-content"],
      sceneMood: "court",
    },
    {
      id: "tl-buried",
      year: "西周之后",
      title: "沉睡",
      narration: "之后发生了什么，我说不清楚。我只记得，很长很长一段时间里，没有光。",
      factIds: ["fact-unknown-personal"],
      sceneMood: "burial",
    },
    {
      id: "tl-found",
      year: "1963年",
      title: "被发现",
      narration: "1963年，陕西宝鸡贾村镇，我重新见到了光——虽然一开始，没有人认出我。",
      factIds: ["fact-discovery"],
      sceneMood: "excavation",
    },
    {
      id: "tl-museum",
      year: "1975年之后",
      title: "被认出",
      narration:
        "1975年，有人清理掉我身上的锈，发现了那122个字。从那以后，我的名字，被重新念了出来。",
      factIds: ["fact-inscription-basic"],
      sceneMood: "museum",
    },
    {
      id: "tl-today",
      year: "今天",
      title: "你正在看我",
      narration: "三千年过去了。现在，是你在看着我。",
      factIds: ["fact-status"],
      sceneMood: "today",
    },
  ],

  hotspots: [
    {
      id: "hotspot-pattern",
      type: "pattern",
      position: { x: 50, y: 46 },
      // 腹部兽面纹：偏到中轴扉棱右侧，正好落在兽面的眼睛上，也比压在亮色扉棱上更清楚
      position3d: [0.25, -0.1, 0.42],
      label: "器身纹饰",
      teaser: "这些纹饰，不只是装饰。",
      title: "饕餮纹与扉棱",
      story:
        "我腹部这一圈凸起的兽面，古人称它「饕餮纹」。它不是随手画上去的图案——在那个青铜与祭祀紧密相连的时代，纹饰往往承载着秩序与敬畏。两侧突起的扉棱，既是装饰，也让整件器物在光影里更有分量感。",
      factIds: ["fact-form"],
    },
    {
      id: "hotspot-banana-leaf",
      type: "banana-leaf",
      position: { x: 50, y: 34 },
      // 喇叭口上那一段长叶纹的中段（截图校准过：0.5 会掉到收颈处，偏低）
      position3d: [0, 0.7, 0.46],
      label: "蕉叶纹",
      teaser: "口沿下面那一圈，是什么？",
      title: "蕉叶纹",
      story:
        "我颈部这一圈修长的叶片状纹样，古人叫它「蕉叶纹」——像蕉叶一样上下伸展。它让我的喇叭口不至于空落，也把看我的人的视线，一路引向下面那圈兽面。",
      factIds: ["fact-form"],
    },
    {
      id: "hotspot-flange",
      type: "flange",
      position: { x: 50, y: 52 },
      // 正面中轴线上的棱脊
      position3d: [0, 0.15, 0.5],
      label: "扉棱",
      teaser: "我身上这几道凸起的棱，是干什么的？",
      title: "扉棱",
      story:
        "这些纵向凸起的棱脊叫「扉棱」，从口沿一直延伸到圈足。它们把兽面纹分割成对称的两半，也让光在我身上留下更硬的明暗交界——远远看过去，我因此显得更有重量。",
      factIds: ["fact-form"],
    },
    {
      id: "hotspot-foot",
      type: "foot",
      position: { x: 50, y: 84 },
      // 底部圈足
      position3d: [0, -0.8, 0.45],
      label: "圈足",
      teaser: "我是怎么稳稳站住的？",
      title: "圈足，与我的体量",
      story:
        "我底下这一圈厚重的足，叫「圈足」——它把重量摊开，让我在祭台上稳稳站住，不至于被碰一下就倾倒。我通高38.8厘米，口径28.6厘米，重14.6公斤，比一箱矿泉水还要沉一些。三千年前，要抬起我，也需要认真对待。",
      factIds: ["fact-form", "fact-size"],
    },
    {
      id: "hotspot-inscription",
      type: "inscription",
      position: { x: 50, y: 62 },
      // 铭文在内壁最深处，这里取器身下段作为指向点
      position3d: [0, -0.45, 0.42],
      label: "铭文",
      teaser: "我身上，有一句很重要的话。",
      title: "宅兹中国",
      story:
        "这四个字，藏在我内壁最深的地方，一共122字的一部分。它记录的，是一段关于「天下之中」的叮嘱。三千年后，人们才渐渐意识到——这是「中国」二字连用，最早的文字证据之一。",
      factIds: ["fact-inscription-zhongguo", "fact-inscription-content"],
    },
    {
      id: "hotspot-form",
      type: "form",
      position: { x: 50, y: 30 },
      // 喇叭形大口的口沿
      position3d: [0, 0.95, 0.5],
      label: "器型",
      teaser: "为什么我长成这样？",
      title: "尊，一种礌器",
      story:
        "我叫「尊」，是那个时代盛酒、行礌的青铜器物。喇叭形的大口，是为了在礌仪中方便持握与倾倒；厚重的圈足，让我能稳稳站立。古人铸我，不是为了好看，而是为了在最重要的场合里，被认真对待。",
      factIds: ["fact-form", "fact-size"],
    },
    {
      id: "hotspot-timeline",
      type: "timeline",
      position: { x: 78, y: 78 },
      // 不指向具体部位，浮在圈足外侧
      position3d: [0.7, -0.75, 0.4],
      label: "我的一生",
      teaser: "想看看我经历了多久吗？",
      title: "三千年，一条时间线",
      story: "从被铸造，到今天站在你面前——拖动时间轴，慢慢看。",
      factIds: ["fact-date", "fact-discovery", "fact-status"],
    },
  ],

  suggestedQuestions: [
    "为什么你这么重要？",
    "“中国”两个字在哪里？",
    "你为什么会被造出来？",
    "你经历了多少年？",
    "古人怎么制作你？",
    "你为什么会被埋起来？",
    "你现在为什么在博物馆？",
    "你差点被熔掉是真的吗？",
    "铭文里都写了什么？",
  ],

  memoryLines: [
    "我不是一件青铜器。\n我是一个时代留下来的证据。",
    "三千年前，有人把“中国”刻在了我身上。",
    "我沉睡了很久，但我从未忘记。",
  ],

  teaserLine: "我身上的四个字，被你们记了三千年。",
  shortPeriod: "西周早期",
  illustrationId: "hezun",
  sealChars: ["何", "尊"],

  galleryReveal: {
    greetingLines: ["你终于来了。", "我已经很久没有和人说过话了。", "他们叫我——何尊。"],
    lineDelay: 1500,
    guess: {
      question: "你觉得，我为什么会被铸造成这个样子？",
      options: [
        {
          id: "drink",
          label: "用来喝酒",
          response: "我确实是一种盛酒的礌器——但铸造我，不只是为了喝酒这么简单。",
        },
        {
          id: "ritual",
          label: "用来祭祀",
          response: "礌仪的确重要，我也因此而生——不过还有一个更具体的原因。",
        },
        {
          id: "remember",
          label: "用来纪念一件重要的事情",
          response: "你猜对了。有一段话，需要被记住，我因此而生。",
        },
      ],
    },
  },

  chapters: [
    {
      id: "who-am-i",
      label: "第一章",
      title: "我是谁",
      hook: "先自己看看我——你的第一眼落在哪里？",
      module: {
        kind: "observe",
        prompt: "先别急着听我说。你自己看看我——你的第一眼，最先注意到了哪里？",
        /**
         * 本章只呈现「看得见的器身细节」。
         * 排除两类：铭文（藏在内壁，留给第三章的高潮）、时间线（不是器身部位，走导航进入）。
         * 不写 hotspotIds 就是这个默认排除法，以后在数据里加器身热点不用再动这里。
         */
        firstLookResponses: {
          pattern: "很多人第一次见我，也会先注意到这里。",
          form: "你先看到的是我的样子。也有人是这样。",
          "banana-leaf": "很少有人先看这里。你看得比大多数人都细。",
          flange: "你注意到的是我的骨架——那几道棱，撑住了我全部的气势。",
          foot: "你从我站着的地方开始看。有意思，很少有人这样。",
        },
        allFoundLine: "你把我身上看得见的地方，都看过了。",
        openingLines: [
          "我出生在三千多年前。",
          "那时候，人们用青铜铸造礼器。",
          "我的主人，希望把一件重要的事情留下来。",
        ],
        lineDelay: 1500,
        notAllFoundHint: "我身上还有你没看过的地方——也可以直接听我讲下去。",
        /**
         * 自我介绍视频（用户提供的 3D 动画短片，第一人称讲述从出土到「中国」词源）。
         * 横构图 1080p，44.7s，4.6MB。开场白念完后的「听我完整讲一遍」入口进入。
         * 注意：视频内字幕是文学化表述，与 FACT 层口径的对齐见 /sources 的史料列表。
         */
        introVideo: {
          src: "videos/hezun-intro.mp4",
          poster: "images/hezun-intro-poster.jpg",
          durationSec: 45,
        },
      },
    },
    {
      id: "why-cast",
      label: "第二章",
      title: "我为什么会被铸造",
      hook: "一场为了「记住」的铸造。",
      backdrop: "forge",
      // 开场氛围图（AI 生成示意，非实物照片）。人像场景提亮到 0.85——
      // 0.62 的常规档会把浇铸工匠压成剪影（用户实测反馈）
      openingArt: {
        src: "images/ch2-casting.jpg",
        caption: "青铜浇铸 · 场景示意",
        peakOpacity: 0.85,
      },
      // 讲述者继续在场：偏到右下、压得很暗，像"刚从范里出来还在炉边"的器物
      presence: {
        opacity: 0.16,
        className: "-right-[18vw] bottom-[-12vh] h-[58vh] w-[58vh] sm:-right-[2vw]",
      },
      module: {
        kind: "qa",
        openingLines: ["那时候，我还没有名字。", "工匠把青铜熔化。", "火光照亮了整个作坊。"],
        lineDelay: 1500,
        prompt: "你想先听哪一个？",
        items: [
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
        ],
      },
    },
    {
      id: "my-secret",
      label: "第三章",
      title: "我身上的秘密",
      hook: "锈的下面，藏着四个字。",
      backdrop: "patina",
      backdropGlyphs: ["宅", "兹", "中", "国"],
      // 开场氛围图换回刮锈场景图（用户指定：原 ch3-derust）
      openingArt: {
        src: "images/ch3-derust.jpg",
        caption: "刮锈见字 · 场景示意",
      },
      presence: {
        opacity: 0.13,
        className: "-left-[20vw] bottom-[-10vh] h-[56vh] w-[56vh] sm:-left-[4vw]",
      },
      module: {
        kind: "reveal",
        leadInLines: ["你还记得，我说过我身上刻着字吗？", "现在，我想让你看看。"],
        lineDelay: 1500,
        derust: {
          leadLines: ["三千年的锈，盖住了我内壁的字。", "1975年，有人一点一点把它清理掉。"],
          footnote: "器身为示意呈现，非实物照片 · 除锈史实见资料来源页",
          // 刮开锈壳露出除锈后的器身（示意素材）
          underImageSrc: "images/hezun-derust-after.jpg",
        },
        // 刮锈之后的前后对比（AI 示意图、器型非严格何尊——caption 如实标注）
        compare: {
          beforeSrc: "images/hezun-derust-before.jpg",
          afterSrc: "images/hezun-derust-after.jpg",
          caption: "前后对比为场景示意图，非何尊实物照片 · 除锈史实见资料来源页",
          nextLabel: "看清这几个字 →",
        },
        focus: {
          characters: ["宅", "兹", "中", "国"],
          explainLines: [
            "这是何尊铭文中的一句，铭文全文共122字（含重文）。",
            "「宅兹中国」，是目前所见「中国」二字连用的最早文字记录之一。",
          ],
          factIds: ["fact-inscription-zhongguo", "fact-inscription-content"],
          // 三千年后，「宅兹中国」四个字仍被人做成灯、刻成礼——这句话活到了今天
          sideImage: {
            src: "images/hezun-lamp-lit.jpg",
            caption: "「宅兹中国」文创摆件 · 今天",
          },
        },
        /**
         * 「中国」古今义竞猜。
         *
         * 这是全站立意最核心、也最容易被误读的一点：铭文里的「中国」意指
         * 「天下之中的都邑/区域」，与今天「中国」一词的含义**并不完全相同**
         * （见 fact-inscription-zhongguo）。与其把这句话念给用户听，不如让他先猜一次。
         */
        guess: {
          question: "三千年前，我身上的「中国」是什么意思？",
          options: [
            {
              id: "same",
              label: "就是今天说的中国",
              response: "不完全是。那时候它还不是一个国家的名字——它说的是一个更具体的位置。",
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
              response: "还不是。三千年前它更像是对一个位置的称呼，「国」在当时指的是城邑。",
            },
          ],
        },
        /**
         * 收尾不去解释「中国」一词后来如何演变 —— verifiedFacts 里没有这条，
         * 编一段词义演变史就越界了。所以这里明说"我身上没有记载"，
         * 只把有据可查的那一点讲死：它是目前所见最早的连用记录之一。
         */
        closingLines: [
          "至于它后来怎么变成你们今天说的意思——我身上没有记载，我也不替史料编。",
          "我只知道：这两个字连在一起被写下来，目前所见最早的一次，就在我的内壁上。",
        ],
        marksDiscovered: "hotspot-inscription",
        // 下一章不再是时间线，出口按钮写过渡文案（见 RevealModuleData.nextLabel）
        nextLabel: "接着，读我腹中的字 →",
      },
    },
    {
      id: "read-my-words",
      label: "第四章",
      title: "读我腹中的字",
      hook: "122 个字，一段一段读给你听。",
      // 与第三章同母题：刚擦完锈读铭文，视觉上是同一个场景的延续
      backdrop: "patina",
      backdropGlyphs: ["宅", "兹", "中", "国"],
      openingArt: {
        src: "images/ch4-scroll.jpg",
        caption: "腹中字卷 · 场景示意",
      },
      module: {
        kind: "inscription",
        openingLines: [
          "刚才你只看见了四个字。",
          "其实在我内底，一共有一百二十二个。",
          "现在，我想把它们一段一段，读给你听。",
        ],
        lineDelay: 1500,
        /**
         * 铭文全文逐字序列：通行释读（与《文物》1976 年考释一致的网络多来源交叉核实，
         * 2026-09-29），共 122 字——含重文（「武王」二字重文计入）与损泐占位字「□」。
         * 数字数自洽：8+8+5+9+6+4+7+8+6+6+4+2+7+4+4+2+3+6+4+3+5+7+4 = 122。
         * 卷面一次性铺开整卷；各节 range 是它在 fullText 里的字序范围。
         */
        fullText:
          "唯王初壅宅于成周复禀武王礼福自天在四月丙戌王诰宗小子于京室曰昔在尔考公氏克逑文王肆文王受兹大命唯武王既克大邑商则廷告于天曰余其宅兹中国自之乂民呜呼尔有唯小子无识视于公氏有勋于天彻命敬享哉唯王恭德裕天训我不敏王咸诰何赐贝卅朋用作□公宝尊彝唯王五祀".split(
            "",
          ),
        overviewHint: "这一卷纸，就是我的全部——一百二十二个字。",
        /**
         * 分节按学界通行释读（fact-inscription-full）。
         * 每节三层：卷面上的原文段（range 点亮，精摹字见 hezun-glyphs.ts，
         * 未摹字以示意字位呈现）→ 释文 → 第一人称讲述。
         * debateNote 只标注、不展开学术综述——分歧本身如实呈现，采用的释读说明白。
         */
        sections: [
          {
            id: "sec-opening",
            characters: ["唯", "王", "成", "周", "武", "天"],
            range: [0, 16],
            transcript: "王初迁居成周，举行祭礼，禀告武王与上天。",
            sceneNote: "开篇纪时",
            narrationLines: [
              "这段话，是从一场仪式开始的。",
              "有人刚搬了新家——第一件事，是告诉祖先和天。",
            ],
            debateNote:
              "开篇首字的释读，学界另有不同意见（迁 / 邕 / 壅诸说）。本作品采用通行释读。",
            factIds: ["fact-inscription-full", "fact-inscription-debate"],
          },
          {
            id: "sec-admonition",
            characters: ["诰", "何"],
            range: [16, 30],
            transcript: "四月丙戌这一天，王在京室训诫宗室子弟，说——",
            sceneNote: "训诰场景",
            narrationLines: [
              "被叫到跟前的年轻人里，有一个叫「何」。",
              "就是我后来名字的来源。",
            ],
            factIds: ["fact-inscription-full", "fact-owner"],
          },
          {
            id: "sec-ancestors",
            characters: ["王", "武"],
            range: [30, 47],
            transcript: "王先追述了何的父亲辅佐文王的功绩，又说文王承受了上天的大命。",
            sceneNote: "追述先人",
            narrationLines: [
              "训话之前，先被肯定——王夸了他的父亲。",
              "三千年前，人们已经懂得这个道理。",
            ],
            debateNote: "「逑」字（辅佐之义）的释读，学界另有诸说。本作品采用通行释读。",
            factIds: ["fact-inscription-full"],
          },
          {
            id: "sec-climax",
            characters: ["武", "王", "唯", "宅", "兹", "中", "国"],
            range: [47, 71],
            transcript: "武王攻克大邑商之后，向上天祷告说：我要定居在天下之中，从这里治理民众。",
            sceneNote: "武王告天",
            narrationLines: [
              "注意——这句最重的话，不是王对何说的。",
              "是武王，对天说的。",
              "「余其宅兹中国，自之乂民。」",
            ],
            isClimax: true,
            debateNote:
              "铭文中「中国」指「天下之中的都邑」为通行释义；个别学者持「国中（都城之中）」说。本作品采用通行释义。",
            factIds: ["fact-inscription-zhongguo", "fact-inscription-content", "fact-inscription-full"],
          },
          {
            id: "sec-exhort",
            characters: ["王", "天"],
            range: [71, 103],
            transcript: "王勉励何：要效法你的父亲，他有功于天；要恭敬地对待你的职守。",
            sceneNote: "勉励",
            narrationLines: [
              "训话最后落到了何自己身上。",
              "「年轻人，好好干」——三千年前的话，今天听着也不过时。",
            ],
            debateNote: "此段个别句子的断句与释字，学界有不同意见。本作品采用通行释读。",
            factIds: ["fact-inscription-full"],
          },
          {
            id: "sec-reward",
            characters: ["何", "贝", "朋", "王", "祀"],
            range: [103, 122],
            transcript: "王结束训诰，赏赐何贝三十朋。何铸了这件尊，用来纪念——纪年为「唯王五祀」。",
            sceneNote: "赏赐与作器",
            narrationLines: [
              "这场训诰的结尾，何得到了三十朋贝。",
              "他用这份赏赐，把我铸了出来——为了让这段话活下去。",
              "我，就是那个结果。",
            ],
            debateNote:
              "「用作□公宝尊彝」中有一损泐字，作器对象的称谓各家释读不一。本作品如实标注，不作臆测。",
            factIds: ["fact-inscription-full", "fact-inscription-content"],
          },
        ],
        closingLines: [
          "整卷读完，用了你几分钟。",
          "它们在我肚子里，安安静静待了三千年。",
        ],
        footnote: "字形为手工摹写示意（非拓片）· 未摹字以示意字位呈现 · 全文 122 字（含重文与损泐字）",
        marksDiscovered: "hotspot-inscription",
      },
    },
    {
      id: "almost-gone",
      label: "第五章",
      title: "我差点消失",
      hook: "离熔炉最近的十二年。",
      backdrop: "scrap",
      module: {
        kind: "flip",
        openingLines: [
          "在读给你听之前，其实——我差点没能等到 1975 年。",
          "1963 年之后的这十二年，是我离熔炉最近的日子。",
          "每张卡翻过来，都是核实过的事实。你自己看。",
        ],
        lineDelay: 1500,
        /**
         * 卡片正面 STORY / 背面 FACT（factIds 指向 verifiedFacts）。
         * 史实已逐条核实（2026-09）：出土、30 元、1975 故宫除锈均有
         * 《文物》原始报告与博物馆当事人回忆文章支撑（见各 fact 的 source）。
         * 「差点被熔掉」是 STORY 层的比喻（废品站是事实、熔炉是推断），
         * 正面口白只用「离熔炉最近」的说法，背面不写「曾被送去熔炉」。
         */
        cards: [
          {
            id: "card-1963",
            front: "一九六三年，宝鸡贾村。\n一场雨过后，后院的崖土塌了一块——我重新见到了光。\n没有人认得我。",
            back: {
              content:
                "1963年，何尊出土于宝鸡县贾村镇（今宝鸡市陈仓区）一户陈姓村民家的后院断崖，取土时挖出，先藏于家中。",
              source: "王光永《宝鸡市博物馆新征集的饕餮纹铜尊》（《文物》1966年1期）",
              confidence: "verified",
              factId: "fact-scrap-unearthed",
            },
            hint: "出土地：宝鸡贾村塬 · 后院断崖取土时挖出",
          },
          {
            id: "card-30yuan",
            front: "两年后，我被装进麻袋，背进了城里。\n按废铜的价，三十块钱。\n我身上那些字，那时候没有人知道——包括买我的人。",
            back: {
              content:
                "1965年8月，因生活困难，村民将此尊以人民币30元卖给龙泉巷废品回收门市部。",
              source:
                "李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年，转述经手人王光永的记述）",
              confidence: "verified",
              factId: "fact-scrap-sale",
            },
            hint: "废品回收门市部：龙泉巷 · 卖出时铭文尚未被发现",
          },
          {
            id: "card-rescue",
            front: "废品站里，我旁边堆着别的铜器。\n有一个人的目光在我身上停得久了些。\n后来我常想：那一眼，值多少个三十块？",
            back: {
              content:
                "废品门市部营业员将此事告知博物馆工作人员佟太放，宝鸡市博物馆随即将何尊征集收藏。",
              source:
                "李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年，转述经手人王光永的记述）",
              confidence: "verified",
              factId: "fact-scrap-sale",
            },
          },
          {
            id: "card-dormant",
            front: "进了库房，我睡得很沉。\n锈还盖在那 122 个字上面——一盖，又是十年。\n安静，但也没有人认识我。",
            back: {
              content:
                "何尊入藏后十余年间因铜锈未除，内底铭文一直未被发现；期间曾被借往北京故宫博物院展出。",
              source:
                "李仲操《何尊的发现及其史料价值》（宝鸡日报，2020年）· 王光永《宝鸡市博物馆新征集的饕餮纹铜尊》（《文物》1966年1期）",
              confidence: "verified",
              factId: "fact-scrap-1975",
            },
          },
          {
            id: "card-1975",
            front: "一九七五年，我入选出国展览的名单。\n出发前，有人把我身上的锈，一点一点清掉。\n然后——那个人愣住了。",
            back: {
              content:
                "1975年，何尊被列为出国展品，清除锈垢时发现内底铭文12行122字；唐兰、马承源等学者的考释文章于1976年《文物》发表，此尊从此定名「何尊」。",
              source: "李仲操回忆文章 ·《文物》1976年1期考释文章",
              confidence: "verified",
              factId: "fact-scrap-1975",
            },
            hint: "铭文藏在内底：入藏十余年无人看见，直到除锈那一刻",
          },
          {
            id: "card-revalue",
            front: "从废品堆，到禁止出境。\n中间隔着的，只是那 122 个字——被看见。",
            back: {
              content:
                "何尊现藏于宝鸡青铜器博物院，属国家文物局公布的「禁止出境展览文物」名录中的文物。",
              source: "国家文物局公开名录",
              confidence: "verified",
              factId: "fact-status",
            },
          },
        ],
        /**
         * 读完六张卡的「合成时刻」：STORY 卡与 FACT 卡叠合浮现的点题句。
         * FACT/STORY 双层是全项目的骨架，这章翻牌动作（情绪→求证）的语义终点。
         */
        mergeLine: "记忆和事实，都是我的一部分",
        closingLines: [
          "你刚才读的那 122 个字，差一点，谁都没机会读。",
          "所以被看见这件事，本身就是运气——我的，也是你的。",
        ],
      },
    },
  ],

  span: {
    /**
     * 铸造年代：铭文与成王时期史事相印证，年代大致在公元前11世纪（见 fact-date）。
     * 取公元前 1050 年作为"约公元前11世纪"的中值，仅用于画比例，正文一律只说"约三千年"。
     */
    castYear: -1050,
    /** 1963 年在陕西宝鸡贾村镇出土（见 fact-discovery） */
    foundYear: 1963,
    note: "按铸造年代（约公元前11世纪）与出土年份（1963年）计算 · 来源：宝鸡青铜器博物院公开资料",
  },

  insights: [
    {
      requires: ["hotspot-inscription"],
      text: "「宅兹中国」里的「中国」，指的是天下之中的都邑，并不是今天意义上的「中国」。",
    },
    {
      requires: ["hotspot-form"],
      text: "我是一种「尊」——西周礼器中，用来盛酒、行礼的青铜器。",
    },
    {
      requires: ["hotspot-pattern"],
      text: "我腹部的兽面纹，不只是装饰，也承载着那个时代的秩序与敬畏。",
    },
    {
      requires: ["history"],
      text: "铸造我，是为了让一段重要的嘱托被长久地记住。",
    },
  ],
  defaultInsight: "我已经三千多岁了，此刻正站在你面前。",

  /** 时间线终点的描红仪式：四个字须在 hezun-glyphs.ts 有精摹字形 */
  traceGlyphs: { chars: ["宅", "兹", "中", "国"] },

  mock: {
    /** 这些问题都预设了何尊自己的叙事（入土、西周、被谁使用），换一件文物并不成立 */
    extraUnknownTriggers: [
      "见过",
      "认识周",
      "谁埋",
      "谁把你埋",
      "谁使用过你之后",
      "本名叫什么",
      "埋你的人是谁",
    ],
  },
};
