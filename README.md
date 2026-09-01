# 物语千年 · DeltaChllengeO

以青铜器「何尊」为核心的互动叙事 Demo。React + TypeScript + Vite 单页应用，通过场景切换讲述文物的一生，并提供一个具备「事实边界护栏」的 AI 角色扮演对话。

## 开发

```bash
npm install
npm run dev       # 开发服务器
npm run build     # 类型检查 + 生产构建
npm run lint      # ESLint
npm run preview   # 预览生产构建
```

## 叙事流程

应用只有两条真实路由（`/` 和 `/sources`）。`/` 内部的流程由 `src/store/gameStore.ts` 的 `stage` 驱动，而非 react-router：

```
museum → gallery → chapter1 → chapter2 → chapter3 → timeline（可选）
```

AI 对话与记忆卡是贯穿全程的全局能力，同样由 `gameStore` 管理。

## FACT / STORY 双层数据模型

- **FACT 层**（`src/types/artifact.ts` 的 `Fact`，含 `confidence` 与 `source`）：可验证的历史事实，AI 与文案只能基于它展开。
- **STORY 层**（热点故事、时间线旁白等）：为可读性做的文学化表达，可以感性，但不能与关联的 FACT 矛盾。

何尊的全部文本内容集中在 `src/data/artifacts/hezun.ts`。

## 三维模型资产

线上使用 `public/models/hezun.glb`（约 4.5MB，270K 面），由原始扫描件经 `scripts/pack-hezun-model.mjs` 压缩生成：

```bash
node scripts/pack-hezun-model.mjs
```

原始扫描件 `src/assests/hezun.glb`（约 96MB）**未入库**（见 `.gitignore`）—— 它超过 GitHub 50MB 警告线，会永久撑大仓库。需要重新生成压缩件时请自行放回该路径，或改用 Git LFS 管理。

展示分三档自动降级（`src/utils/artifactEvaluator.ts`）：模型可用且支持 WebGL 时走 `3d`，加载中显示带真实进度的中性占位，失败则回落到手绘插画，任何异常都不阻塞体验。

## 技术栈

Tailwind CSS · framer-motion · @react-three/fiber + drei + three · zustand · react-router-dom
