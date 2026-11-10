import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// 验证主线与深入分支、旧文物兼容，以及纪念卡不会虚报探索记录。
const result = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    contents: `
      import assert from "node:assert/strict";
      import { hezun } from "./src/data/artifacts/hezun";
      import { changxin } from "./src/data/artifacts/changxin";
      import { getMainChapterIndices, getAdjacentChapter, getChapterAct, getStoryActs } from "./src/utils/narrative";
      import { buildExplorationMemory } from "./src/utils/explorationMemory";
      assert.deepEqual(getMainChapterIndices(hezun), [0, 1, 2, 4]);
      assert.equal(getAdjacentChapter(hezun, 2, 1), 4);
      assert.equal(getAdjacentChapter(hezun, 3, 1), 4);
      assert.equal(getAdjacentChapter(hezun, 4, -1), 2);
      assert.equal(getAdjacentChapter(hezun, 3, -1), 2);
      assert.equal(getAdjacentChapter(hezun, 4, 1), undefined);
      assert.equal(getAdjacentChapter(hezun, 0, -1), undefined);
      assert.equal(getChapterAct(hezun, 0)?.title, "相遇");
      assert.equal(getChapterAct(hezun, 3)?.title, "发现");
      assert.equal(getChapterAct(hezun, 4)?.title, "重逢");
      assert.deepEqual(getStoryActs(hezun).map(a => a.label + " · " + a.title), ["第一幕 · 相遇", "第二幕 · 发现", "第三幕 · 重逢"]);
      assert.deepEqual(getStoryActs(hezun).map(a => a.mainIndices), [[0, 1], [2], [4]]);
      assert.deepEqual(getStoryActs(hezun)[1].optionalIndices, [3]);
      const ids = hezun.chapters.map(c => c.id);
      assert.equal(new Set(hezun.narrative.acts.flatMap(a => a.chapterIds)).size, ids.length);
      for (const id of hezun.narrative.acts.flatMap(a => a.chapterIds)) assert.ok(ids.includes(id));
      assert.deepEqual(getMainChapterIndices(changxin), [0]);
      assert.equal(getAdjacentChapter(changxin, 0, 1), undefined);
      const empty = buildExplorationMemory(hezun, [], []);
      assert.deepEqual([empty.details, empty.completed, empty.questions], [[], [], []]);
      const hotspot = hezun.hotspots.find(h => h.type !== "timeline");
      const timeline = hezun.hotspots.find(h => h.type === "timeline");
      const messages = [{role: "artifact", content: "开场"}, {role:"user", content:"铭文是什么？"}, {role:"user",content:"铭文是什么？"}];
      const memory = buildExplorationMemory(hezun, [hotspot.id, hotspot.id, timeline.id, "history", "chapter:who-am-i"], messages);
      assert.deepEqual(memory.details, [hotspot.title]);
      assert.deepEqual(memory.completed, []); // 只读完幕内一段，不能算整幕完成。
      assert.deepEqual(memory.questions, ["铭文是什么？"]);
      const firstAct = buildExplorationMemory(hezun, ["chapter:who-am-i", "chapter:why-cast"], []);
      assert.deepEqual(firstAct.completed, ["第一幕 · 相遇"]);
      assert.equal(firstAct.storyUnit, "幕");
      const allMain = getMainChapterIndices(hezun).map(i => "chapter:" + hezun.chapters[i].id);
      assert.deepEqual(buildExplorationMemory(hezun, allMain, []).completed, ["第一幕 · 相遇", "第二幕 · 发现", "第三幕 · 重逢"]);
      assert.equal(buildExplorationMemory(hezun, [...allMain, "chapter:read-my-words"], []).completed.length, 3);
      const nextMemory = buildExplorationMemory(hezun, [], [...messages, {role:"user",content:"你是谁？"}]);
      assert.equal(nextMemory.questions.at(-1), "你是谁？");
      console.log("✅ 三幕主线、铭文分支、单章兼容和探索记忆核验通过");
    `,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
