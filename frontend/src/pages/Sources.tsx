import { Link } from "react-router-dom";
import InkBackground from "../components/shared/InkBackground";

const SECTIONS = [
  {
    title: "文物图片来源",
    items: [
      "本 Demo 中的何尊展示图为项目内原创绘制的 SVG 插画（DEMO 占位素材），并非文物实拍照片，仅用于展示交互效果。",
      "后续版本应替换为经宝鸡青铜器博物院或相应版权方授权的实拍图 / 3D 模型。",
    ],
  },
  {
    title: "3D 模型来源",
    items: ["当前版本暂无授权 3D 模型，展示模式已自动降级为 2.5D，不影响完整体验。"],
  },
  {
    title: "历史资料来源",
    items: [
      "文物基础信息、铭文释读等内容参考宝鸡青铜器博物院公开展陈资料，以及学界对何尊铭文的通行释读意见。",
      "文案中的第一人称叙述（STORY 层）为便于理解所做的文学化表达，均围绕已核实事实（FACT 层）展开，不引入未被史料支持的情节、人物或对话。",
      "对于史料未有明确记载的问题，产品会明确告知「历史资料没有留下明确答案」，不做主观编造。",
    ],
  },
  {
    title: "AI 生成素材说明",
    items: [
      "「何尊」对话功能基于本 Demo 内置的事实库（factGuard）与人格化模板本地生成，当前环境未接入外部大模型 API。",
      "架构已预留 /api/chat 接入真实 LLM 服务的能力，接入后前端无需改动。",
    ],
  },
];

export default function Sources() {
  return (
    <div className="relative min-h-dvh w-full px-6 py-16 sm:px-16">
      <InkBackground glow={0.3} />
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-xs text-gilt-light/70 transition hover:text-gilt-light">
          ← 回到何尊
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
