import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InkBackground from "../components/shared/InkBackground";
import { ARTIFACT_REGISTRY, GALLERY_MANIFEST } from "../data/artifacts";

/**
 * 只说**已开放**的文物。
 *
 * 注册表里可能有档案已就绪、但还没对外开放的文物（史实待核对期间会先锁在展厅里），
 * 在来源页介绍一件用户点不进去的东西只会让人困惑。开放之后这一页会自动跟着长出来。
 */
const ARTIFACTS = GALLERY_MANIFEST.filter((e) => !e.locked)
  .map((e) => ARTIFACT_REGISTRY[e.id])
  .filter(Boolean);

/**
 * 整份档案都还没核对过的文物——这件事不能藏起来。
 *
 * 判据是「没有任何一条 verified」，不是「存在非 verified」：
 * 已核对过的档案里也会有刻意标 inferred 的条目（何尊那条「入土经过无记载」
 * 就是有意标注的未知边界），拿它当未核对的证据会冤枉一份核过的档案。
 */
const UNVERIFIED_ARTIFACTS = ARTIFACTS.filter(
  (a) => a.verifiedFacts.length > 0 && a.verifiedFacts.every((f) => f.confidence !== "verified"),
);

const SECTIONS = [
  {
    title: "文物图片来源",
    items: [
      `本 Demo 收录 ${ARTIFACTS.length} 件文物：${ARTIFACTS.map((a) => a.name).join("、")}。`,
      "各文物的 2.5D 展示图为项目内原创绘制的 SVG 插画（DEMO 占位素材），并非文物实拍照片，仅用于展示交互效果。",
      "后续版本应替换为经相应博物馆或版权方授权的实拍图。",
    ],
  },
  {
    title: "3D 模型来源",
    items: [
      ...ARTIFACTS.filter((a) => a.model).map((a) => `${a.name}：${a.model!.source}`),
      "以上三维资源的授权信息均待确认，正式对外发布前必须补齐或替换。",
      "运行时若设备不支持 WebGL 或模型加载失败，会自动降级为 2.5D 插画，不影响完整体验。",
    ],
  },
  {
    title: "历史资料来源",
    items: [
      "内容分两层：FACT 层是可验证的史实，每条都带来源与可信度标注；STORY 层是为便于理解所做的第一人称文学化表达，围绕 FACT 展开，不引入未被史料支持的情节、人物或对话。",
      "何尊的基础信息与铭文释读参考宝鸡青铜器博物院公开展陈资料，以及学界对何尊铭文的通行释读意见。",
      ...(UNVERIFIED_ARTIFACTS.length > 0
        ? [
            `${UNVERIFIED_ARTIFACTS.map((a) => a.name).join("、")}的档案尚未完成逐条史料核对，相关条目一律标注为「合理推测」而非「已核实」，对话中也会如实说明。这是当前版本明确的待补项。`,
          ]
        : []),
      "对于史料未有明确记载的问题，产品会明确告知「历史资料没有留下明确答案」，不做主观编造。",
    ],
  },
  {
    title: "AI 生成素材说明",
    items: [
      "对话回复由大模型生成，但「什么是真的」不交给模型判断：每次提问都会先从该文物的事实库中检索相关条目，连同边界约束一起作为系统提示注入，回复上再标注它的依据档位（已核实 / 合理推测 / 无法回答）。",
      "模型服务由后端 /api/chat 代理（密钥不下发到前端）；未配置或调用失败时，前端会降级为基于事实库与人格模板的本地生成，护栏一致。",
    ],
  },
];

interface StatsRatios {
  chatBasis: Record<string, number>;
  chatUnknownRate: number | null;
  questionMix: Record<string, number>;
  completionRate: number | null;
  memoryCardRate: number | null;
  avgHotspots: number | null;
}

interface StatsResponse {
  since: number;
  totals: Record<string, number>;
  ratios: StatsRatios;
}

/** 百分比条的一段 */
function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-xs text-rice-200/50">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rice-200/10">
        <div className="h-full rounded-full bg-gilt/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-xs text-rice-200/50">{pct}%</span>
    </div>
  );
}

/**
 * 可信度报告：护栏不是形容词，是可度量的数字。
 * 数据来自 /api/stats（内存聚合，无个人信息）；服务不可用时降级为静态说明——
 * 护栏本身不依赖这份统计，始终生效。
 */
function TrustReport() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // ⚠️ 相对路径：/sources 页面在 /s/<alias>/sources 下，<base> 会正确解析
    fetch("api/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  const chatTotal = stats ? (stats.totals.chat_reply ?? 0) : 0;
  const basis = stats?.ratios.chatBasis ?? {};

  return (
    <div>
      <h2 className="mb-3 text-sm tracking-wide text-gilt-light/80">AI 回答可信度报告</h2>
      {failed ? (
        <ul className="space-y-2">
          <li className="text-sm leading-7 text-rice-200/60">
            · 报告暂不可用（统计服务未启动或网络不可达）。对话护栏本身不依赖此统计，始终生效。
          </li>
        </ul>
      ) : !stats ? (
        <p className="text-sm leading-7 text-rice-200/40">正在拉取统计……</p>
      ) : chatTotal === 0 ? (
        <ul className="space-y-2">
          <li className="text-sm leading-7 text-rice-200/60">
            · 本服务启动以来还没有人向文物提问。提问后，这里会展示回答依据档位与「无法回答」占比的实时统计。
          </li>
        </ul>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-rice-200/60">
            · 服务启动以来共 {chatTotal} 次对话。其中回答「无法回答」（史料没有明确答案，
            不编造）的占比为{" "}
            <span className="text-gilt-light">
              {stats.ratios.chatUnknownRate === null
                ? "—"
                : `${Math.round(stats.ratios.chatUnknownRate * 100)}%`}
            </span>
            。
          </p>
          <div className="space-y-2">
            <p className="text-xs tracking-widest text-gilt/60">回答依据档位</p>
            <Bar label="已核实" value={basis.verified ?? 0} total={chatTotal} />
            <Bar label="合理推测" value={basis.inferred ?? 0} total={chatTotal} />
            <Bar label="无法回答" value={basis.unknown ?? 0} total={chatTotal} />
          </div>
          <p className="text-[11px] leading-5 text-rice-200/30">
            统计自服务最近一次启动（{new Date(stats.since).toLocaleString("zh-CN")}）起累计，
            为聚合计数、不含任何问题内容与个人信息；服务重启后从零开始。
          </p>
        </div>
      )}
    </div>
  );
}

export default function Sources() {
  return (
    <div className="relative min-h-dvh w-full px-6 py-16 sm:px-16">
      <InkBackground glow={0.3} />
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-xs text-gilt-light/70 transition hover:text-gilt-light">
          ← 回到展厅
        </Link>
        <h1 className="font-title mt-6 text-2xl text-rice-100">数字资料来源</h1>
        <p className="mt-2 text-sm text-rice-200/50">
          《物语千年》尊重历史真实与内容版权，以下说明本 Demo 中素材与信息的来源与边界。
        </p>

        <div className="ink-divider my-8" />

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-sm tracking-wide text-gilt-light/80">{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm leading-7 text-rice-200/60">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <TrustReport />
        </div>
      </div>
    </div>
  );
}
