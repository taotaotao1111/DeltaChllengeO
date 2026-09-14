import { Link } from "react-router-dom";
import InkBackground from "../components/shared/InkBackground";
import { ARTIFACT_REGISTRY } from "../data/artifacts";

/** 已登记的文物，按注册表顺序。新增文物这一页会自动跟着长出来，不用手写 */
const ARTIFACTS = Object.values(ARTIFACT_REGISTRY);

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
        </div>
      </div>
    </div>
  );
}
