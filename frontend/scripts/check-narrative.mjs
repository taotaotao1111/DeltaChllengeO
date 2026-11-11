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
      import { getHistorySpan } from "./src/utils/historySpan";
      import { getRevealSteps } from "./src/utils/revealFlow";
      import { existsSync, statSync } from "node:fs";
      import { join } from "node:path";
      const ending = hezun.historyEnding;
      // 故事签只展示文案，完整短片独立配置，观察页不再保留重复视频入口。
      const observe = hezun.chapters.find(chapter => chapter.module.kind === "observe").module;
      const qa = hezun.chapters.find(chapter => chapter.module.kind === "qa").module;
      // 精简配图说明后，除锈与猜词之间仍须逐字揭示「宅兹中国」。
      const reveal = hezun.chapters.find(chapter => chapter.module.kind === "reveal").module;
      assert.equal(reveal.focus.characters.join(""),"宅兹中国");
      assert.deepEqual(getRevealSteps(reveal),["lead-in","derust","compare","focus","guess","closing"]);
      assert.ok(getRevealSteps({...reveal,focus:{...reveal.focus,showPage:false}}).includes("focus"));
      assert.deepEqual(getRevealSteps({...reveal,derust:undefined,compare:undefined,focus:undefined}),["lead-in","guess","closing"]);
      assert.equal("introVideo" in observe,false);
      assert.equal(qa.items.length,4);
      assert.ok(qa.items.every(item=>item.title && item.teaser && item.answer));
      assert.ok(qa.items.every(item=>!("video" in item)));
      const video = qa.fullStoryVideo;
      assert.equal(video.src,"videos/hezun-intro.mp4");
      assert.ok(video.durationSec>0);
      for (const asset of [video.src,video.poster]) {
        assert.ok(asset && !asset.startsWith("/") && existsSync(join("public",asset)));
      }
      assert.equal(ending.phases.length, 4);
      const eventIds = ending.phases.flatMap(phase => phase.eventIds);
      assert.equal(new Set(eventIds).size, eventIds.length);
      assert.deepEqual([...eventIds].sort(),hezun.timeline.map(event => event.id).sort());
      const assets = [ending.background.desktop,ending.background.mobile,ending.appraisalImage,ending.tracingImage,...ending.phases.map(phase => phase.image)];
      assert.equal(new Set(assets).size,8);
      for (const asset of assets) { assert.ok(existsSync(join("public",asset))); assert.ok(statSync(join("public",asset)).size < 150000); }
      const span2026 = getHistorySpan(-1050,1963,2026);
      assert.equal(span2026.sinceDiscovery,63);
      assert.equal(span2026.percent.toFixed(1),"2.0");
      assert.ok(span2026.percent > 0 && span2026.percent < 3);
      assert.equal(getHistorySpan(-1,1,2).beforeDiscovery,1);
      assert.equal(getHistorySpan(1963,1963,1963).percent,0);
      assert.equal(getHistorySpan(-1050,1963,2027).sinceDiscovery,64);
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
      console.log("✅ 四段时间线、八张素材、动态时间比例、三幕跳转与探索记忆核验通过");
    `,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
