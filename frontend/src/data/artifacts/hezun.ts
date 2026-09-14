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
    source: "项目提供的何尊三维扫描件（原始件存于仓库外 ~/DeltaChallenge-assets/hezun.glb）",
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
  ],

  memoryLines: [
    "我不是一件青铜器。\n我是一个时代留下来的证据。",
    "三千年前，有人把“中国”刻在了我身上。",
    "我沉睡了很久，但我从未忘记。",
  ],

  teaserLine: "我身上的四个字，被你们记了三千年。",
  illustrationId: "hezun",
  sealChars: ["何", "尊"],

  galleryReveal: {
    greetingLines: ["你终于来了。", "我已经很久没有和人说过话了。", "他们叫我——何尊。"],
    lineDelay: 2000,
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
        lineDelay: 2400,
        notAllFoundHint: "我身上还有你没看过的地方——也可以直接听我讲下去。",
      },
    },
    {
      id: "why-cast",
      label: "第二章",
      title: "我为什么会被铸造",
      backdrop: "forge",
      // 讲述者继续在场：偏到右下、压得很暗，像"刚从范里出来还在炉边"的器物
      presence: {
        opacity: 0.16,
        className: "-right-[18vw] bottom-[-12vh] h-[58vh] w-[58vh] sm:-right-[2vw]",
      },
      module: {
        kind: "qa",
        openingLines: ["那时候，我还没有名字。", "工匠把青铜熔化。", "火光照亮了整个作坊。"],
        lineDelay: 2200,
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
      backdrop: "patina",
      presence: {
        opacity: 0.13,
        className: "-left-[20vw] bottom-[-10vh] h-[56vh] w-[56vh] sm:-left-[4vw]",
      },
      module: {
        kind: "reveal",
        leadInLines: ["你还记得，我说过我身上刻着字吗？", "现在，我想让你看看。"],
        lineDelay: 2400,
        derust: {
          leadLines: ["三千年的锈，盖住了我内壁的字。", "1975年，有人一点一点把它清理掉。"],
          footnote: "字影为示意呈现，非拓片实物 · 铭文全文共122字（含重文）",
        },
        focus: {
          characters: ["宅", "兹", "中", "国"],
          explainLines: [
            "这是何尊铭文中的一句，铭文全文共122字（含重文）。",
            "「宅兹中国」，是目前所见「中国」二字连用的最早文字记录之一。",
          ],
          factIds: ["fact-inscription-zhongguo", "fact-inscription-content"],
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
      },
    },
  ],

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
