import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const result = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    contents: `
      import assert from "node:assert/strict";
      import { hezun } from "./src/data/artifacts/hezun";
      import { useGameStore } from "./src/store/gameStore";
      import { captureChatContext, getReplyFacts, limitReply, buildChatHistory } from "./src/utils/chatContext";
      import { buildSystemPrompt } from "./src/utils/factGuard";
      import { createPausableTimer } from "./src/utils/pausableTimer";
      import { streamArtifactReply } from "./src/services/aiService";
      import { getStoryQuestions } from "./src/utils/storyQuestions";
      // 推荐只来自关键节点，且资料齐全；主线四处 + 自选铭文一处。
      const followUps = [];
      for (const hotspot of hezun.hotspots) if (hotspot.followUp) followUps.push(hotspot.followUp);
      for (const chapter of hezun.chapters) {
        const module = chapter.module;
        if (module.followUp) followUps.push(module.followUp);
        for (const node of [...(module.items ?? []), ...(module.sections ?? []), ...(module.cards ?? [])]) {
          if (node.followUp) followUps.push(node.followUp);
        }
      }
      assert.equal(followUps.length, 5);
      for (const followUp of followUps) {
        assert.ok(followUp.prompt);
        assert.equal(followUp.questions.length, 1);
        assert.equal(getStoryQuestions(hezun, {id:"configured",title:"",summary:"",ready:true,...followUp}).length, 1);
      }
      const qa = hezun.chapters.find(chapter => chapter.module.kind === "qa").module;
      const carve = qa.items.find(item => item.id === "carve");
      assert.ok(carve.followUp.questions[0].includes("工匠姓名"));
      assert.ok(qa.items.filter(item => item.followUp).every(item => item.id === "carve"));
      const recommendation = {id:"carve",title:carve.question,summary:carve.answer,ready:true,...carve.followUp,blockedQuestions:qa.items.map(item => item.question)};
      assert.equal(getStoryQuestions(hezun,recommendation).length,1);
      assert.deepEqual(getStoryQuestions(hezun,{...recommendation,questions:qa.items.map(item => item.question)}),[]);
      assert.deepEqual(getStoryQuestions(hezun,{...recommendation,questions:["为什么要铸造你?"]}),[]);
      assert.deepEqual(getStoryQuestions(hezun,recommendation,[carve.followUp.questions[0].replace("？","?")]),[]);
      assert.deepEqual(getStoryQuestions(hezun,{...recommendation,ready:false}),[]);
      assert.deepEqual(getStoryQuestions(hezun,{...recommendation,factIds:["missing-source"]}),[]);
      assert.deepEqual(getStoryQuestions(hezun,{...recommendation,questions:[]}),[]);
      assert.deepEqual(getStoryQuestions(hezun,null),[]);
      const history = hezun.chapters.find(chapter => chapter.module.kind === "flip").module;
      const discoveryFollowUp = history.cards.find(card => card.id === "card-1975").followUp;
      assert.deepEqual(getReplyFacts({verifiedFacts:hezun.verifiedFacts,storyMoment:discoveryFollowUp},discoveryFollowUp.questions[0]).map(fact => fact.id).sort(),[...discoveryFollowUp.factIds].sort());
      const moment = { id: "inscription-now", title: "铭文初现", summary: "宅兹中国", factIds: ["fact-inscription-zhongguo"], questions: ["这里的中国是什么意思？"], ready: true, sectionId: "sec-center" };
      const discovered = ["hotspot-inscription"];
      const turn = captureChatContext(hezun, 2, "inscription", discovered, moment);
      discovered.push("later"); moment.factIds.push("fact-form");
      assert.deepEqual(turn.discoveredDetails, ["hotspot-inscription"]);
      assert.deepEqual(turn.storyMoment.factIds, ["fact-inscription-zhongguo"]);
      assert.equal(turn.actTitle, "第二幕 · 发现");
      const context = {artifact:hezun, verifiedFacts:hezun.verifiedFacts, timeline:hezun.timeline, conversationHistory:[], ...turn};
      assert.deepEqual(getReplyFacts(context, "这里的中国是什么意思？").map(f => f.id), ["fact-inscription-zhongguo"]);
      assert.deepEqual(getReplyFacts({...context,storyMoment:undefined}, "这里的中国和今天一样吗？").map(f => f.id), ["fact-inscription-zhongguo"]);
      const prompt = buildSystemPrompt(context, "这里的中国是什么意思？");
      assert.ok(prompt.includes("sec-center") && prompt.includes("铭文初现") && prompt.includes("120 字"));
      assert.ok(buildSystemPrompt({...context,answerMode:"deep"}, "解释一下").includes("360 字"));
      assert.ok(Array.from(limitReply("甲".repeat(500))).length <= 120);
      assert.ok(Array.from(limitReply("甲".repeat(500), "deep")).length <= 360);
      assert.ok(limitReply("甲".repeat(500), "deep").length > limitReply("甲".repeat(500)).length);
      assert.equal(limitReply("资料未载。"), "资料未载。");
      const messages = [{id:"1",role:"user",content:"旧问题"},{id:"2",role:"artifact",content:"旧回答"},{id:"3",role:"user",content:"新问题"}];
      assert.deepEqual(buildChatHistory(messages, "新问题").map(m => m.content), ["旧问题", "旧回答"]);
      const store = useGameStore.getState();
      store.setStage("chapter"); store.setChapter(2, "closing"); store.markDiscovered("hotspot-inscription"); store.setStoryMoment(turn.storyMoment);
      store.askArtifact("这里的中国是什么意思？");
      assert.equal(useGameStore.getState().chatOpen, true);
      assert.equal(useGameStore.getState().chapterIndex, 2);
      assert.equal(useGameStore.getState().chapterEntry, "closing");
      store.clearPendingChatQuestion(); store.toggleChat(false);
      assert.ok(useGameStore.getState().dismissedStoryMomentIds.includes("inscription-now"));
      // 同一节点更新/再次打开后仍不重复浮现；不同关键节点不被一并屏蔽。
      store.setStoryMoment({...turn.storyMoment});
      assert.ok(useGameStore.getState().dismissedStoryMomentIds.includes("inscription-now"));
      assert.ok(!useGameStore.getState().dismissedStoryMomentIds.includes("next"));
      assert.equal(useGameStore.getState().storyMoment.id, "inscription-now");
      assert.equal(useGameStore.getState().chapterIndex, 2);
      assert.equal(useGameStore.getState().stage, "chapter");
      assert.ok(useGameStore.getState().discoveredDetails.includes("hotspot-inscription"));
      store.addMessage({id:"reply",role:"artifact",content:"old",createdAt:0});
      store.addMessage({id:"newer",role:"user",content:"newer",createdAt:1});
      store.patchMessage("reply", {content:"correct-target"});
      assert.equal(useGameStore.getState().chatMessages.find(m => m.id === "reply").content, "correct-target");
      assert.equal(useGameStore.getState().chatMessages.at(-1).content, "newer");
      // 只有收起对话后完成的真实回复才标记未读；打开后清除，跨文物不串状态。
      store.completeChatReply("reply", {content:"完成回答",factBasis:"verified"});
      assert.equal(useGameStore.getState().chatHasNewReply, true);
      store.toggleChat(true);
      assert.equal(useGameStore.getState().chatHasNewReply, false);
      store.completeChatReply("reply", {content:"面板内已读的回答"});
      assert.equal(useGameStore.getState().chatHasNewReply, false);
      store.toggleChat(false);
      store.completeChatReply("missing", {content:"不存在的回复"});
      assert.equal(useGameStore.getState().chatHasNewReply, false);
      store.completeChatReply("reply", {content:"收起后完成的回答"});
      assert.equal(useGameStore.getState().chatHasNewReply, true);
      store.askArtifact("新问题");
      assert.equal(useGameStore.getState().chatHasNewReply, false);
      store.toggleChat(false);
      store.completeChatReply("reply", {content:"又一条完成的回答"});
      store.selectArtifact("changxin");
      assert.equal(useGameStore.getState().chatHasNewReply, false);
      assert.deepEqual(useGameStore.getState().dismissedStoryMomentIds, []);
      store.selectArtifact("hezun");
      store.setStoryMoment({...turn.storyMoment,id:"next"}); store.clearStoryMoment("inscription-now");
      assert.equal(useGameStore.getState().storyMoment.id, "next");
      let fired = 0;
      const timer = createPausableTimer(() => fired++, 10, true);
      await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(fired, 0);
      timer.resume(); timer.pause();
      await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(fired, 0);
      timer.resume(); await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(fired, 1);
      timer.resume(); await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(fired, 1);
      const cancelled = createPausableTimer(() => fired++, 5, true); cancelled.cancel(); cancelled.resume();
      await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(fired, 1);
      const originalFetch = globalThis.fetch, originalWarn = console.warn;
      globalThis.fetch = async () => { throw new Error("test offline"); }; console.warn = () => {};
      let answer = "", metadata;
      try {
        await streamArtifactReply(context, "这里的中国是什么意思？", {onToken:(text) => answer = text, onDone:(_,basis,meta) => {metadata=meta;assert.equal(basis,"verified");}});
      } finally { globalThis.fetch = originalFetch; console.warn = originalWarn; }
      assert.ok(answer.length > 0 && Array.from(answer).length <= 120);
      assert.equal(metadata.source, "local");
      assert.deepEqual(metadata.factIds, ["fact-inscription-zhongguo"]);
      console.log("✅ 关键节点推荐、剧情去重、已问隐藏、关闭抑制、情境快照、暂停恢复与离线回答核验通过");
    `,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
