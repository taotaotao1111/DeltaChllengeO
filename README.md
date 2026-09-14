# 物语千年 · DeltaChllengeO

一个让文物用第一人称讲完自己一生的框架。React + TypeScript + Vite 单页应用，通过场景切换叙事，并提供具备「事实边界护栏」的 AI 角色扮演对话。当前收录何尊（完整三章）与长信宫灯（骨架版一章）。

**新增一件文物 = 在 `src/data/artifacts/` 下加一个档案文件 + 在 `index.ts` 注册表里登记一行**，组件层无需改动。

## 开发

代码在 `frontend/`（`backend/` 是 Cowork 部署用的托管服务）：

```bash
cd frontend
npm install
npm run dev              # 开发服务器
npm run build            # 档案自检 + 类型检查 + 生产构建
npm run lint             # ESLint
npm run preview          # 预览生产构建
npm run check:artifacts  # 只跑档案自检
```

## 叙事流程

应用只有两条真实路由（`/` 和 `/sources`）。`/` 内部的流程由 `src/store/gameStore.ts` 的 `stage` 驱动，而非 react-router：

```
museum → gallery → chapter（第 chapterIndex 章，章数由该文物档案决定）→ timeline（可选）
```

章节不写死数量：`ChapterHost` 读出当前文物的第 N 章，按 `module.kind` 分发给对应模块组件（`observe` 观察 / `qa` 问答 / `reveal` 揭示）。模块不知道自己是第几章，只收到 `onNext` / `onBack`，所以只做一章的文物同样成立。

新增一种叙事玩法 = 加一个 `kind` + 一个模块组件，已有 kind 一行都不用动。

AI 对话与记忆卡是贯穿全程的全局能力，同样由 `gameStore` 管理。

## FACT / STORY 双层数据模型

- **FACT 层**（`src/types/artifact.ts` 的 `Fact`，含 `confidence` 与 `source`）：可验证的历史事实，AI 与文案只能基于它展开。
- **STORY 层**（热点故事、时间线旁白等）：为可读性做的文学化表达，可以感性，但不能与关联的 FACT 矛盾。

每件文物的全部文本内容集中在自己的档案文件里（`src/data/artifacts/hezun.ts`、`changxin.ts`）。

> ⚠️ 长信宫灯的史实**尚未逐条核对**，档案里一律标 `confidence: "inferred"`、`source` 写明待补出处，界面上会显示为「合理推测」。`npm run check:artifacts` 会持续提醒这件事。正式发布前必须核实。

## 三维模型资产

线上使用 `public/models/<id>.glb`（何尊 4.5MB / 27 万面，长信宫灯 5.1MB / 37.5 万面），由原始扫描件压缩生成：

```bash
node scripts/pack-model.mjs hezun
node scripts/pack-model.mjs changxin 0.25   # 第二个参数是网格简化比例
```

简化比例**不要跨文物照抄**：`0.18` 是按何尊（回转体 + 纹饰）调的，人物造型（宫灯的面部与手部）压太狠会先糊在那里，所以宫灯用 `0.25`。

原始扫描件（各约 100MB）**存放在仓库外** `~/DeltaChallenge-assets/`，脚本默认从那里读（可用 `ASSETS_DIR` 覆盖）。移出仓库不只是因为 GitHub 的 50MB 警告线，更要紧的是 Cowork 的 pack 是整目录 copytree、**不看 `.gitignore`**——素材留在仓库里会让发布包上传超时。

展示分三档自动降级（`src/utils/artifactEvaluator.ts`）：模型可用且支持 WebGL 时走 `3d`，加载中显示带真实进度的中性占位，失败则回落到手绘插画（按档案的 `illustrationId` 分发），任何异常都不阻塞体验。

## 技术栈

Tailwind CSS · framer-motion · @react-three/fiber + drei + three · zustand · react-router-dom
