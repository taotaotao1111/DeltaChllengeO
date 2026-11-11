import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const result = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    contents: `
      import assert from "node:assert/strict";
      import { hezun } from "./src/data/artifacts/hezun";
      import { useGameStore } from "./src/store/gameStore";
      import { captureChatContext, getReplyFacts, buildChatHistory } from "./src/utils/chatContext";
      import { buildSystemPrompt } from "./src/utils/factGuard";
      import { createPausableTimer } from "./src/utils/pausableTimer";
      import { streamArtifactReply } from "./src/services/aiService";
      import { getStoryQuestions, getConfiguredFollowUp, getInscriptionFollowUp } from "./src/utils/storyQuestions";
      // 四段故事各有一条追问，其他既有节点保持配置；铭文考据另由「考」触发。
      const followUps = [];
      const debateFollowUps = [];
      for (const hotspot of hezun.hotspots) if (hotspot.followUp) followUps.push(hotspot.followUp);
      for (const chapter of hezun.chapters) {
        const module = chapter.module;
        if (module.followUp) followUps.push(module.followUp);
        for (const node of [...(module.items ?? []), ...(module.sections ?? []), ...(module.cards ?? [])]) {
          if (node.followUp) followUps.push(node.followUp);
          if (node.debateFollowUp) debateFollowUps.push(node.debateFollowUp);
        }
      }
      assert.equal(followUps.length, 8);
      assert.equal(debateFollowUps.length, 5);
      followUps.push(...debateFollowUps);
      for (const followUp of followUps) {
        assert.ok(followUp.prompt);
        assert.equal(followUp.questions.length, 1);
        assert.ok(followUp.localAnswer && Array.from(followUp.localAnswer).length <= 120);
        assert.ok(followUp.localAnswer.endsWith("。"));
        assert.equal(getStoryQuestions(hezun, {id:"configured",title:"",summary:"",ready:true,...followUp}).length, 1);
      }
      const inscription = hezun.chapters.find(chapter => chapter.module.kind === "inscription").module;
      const opening = inscription.sections.find(section => section.id === "sec-opening");
      assert.equal(getInscriptionFollowUp(opening,false,false),opening.followUp);
      assert.ok(opening.followUp.questions[0].includes("迁居成周"));
      assert.ok(!opening.followUp.questions[0].includes("分歧"));
      assert.equal(getInscriptionFollowUp(opening,true,false),opening.debateFollowUp);
      assert.ok(opening.debateFollowUp.questions[0].includes("历史背景"));
      assert.notEqual(opening.followUp.questions[0],opening.debateFollowUp.questions[0]);
      assert.equal(getInscriptionFollowUp(opening,false,true),undefined);
      assert.equal(getInscriptionFollowUp(opening,true,true),undefined);
      assert.equal(getInscriptionFollowUp(undefined,false,false),undefined);
      for (const section of inscription.sections) {
        assert.equal(getInscriptionFollowUp(section,false,false),section.followUp);
        assert.equal(getInscriptionFollowUp(section,true,false),section.debateNote ? section.debateFollowUp : undefined);
        const recommendation = getInscriptionFollowUp(section,true,false);
        if (!recommendation) continue;
        assert.deepEqual(getStoryQuestions(hezun,{id:section.id+":debate",title:section.sceneNote,summary:section.transcript,ready:true,...recommendation}),recommendation.questions);
        assert.deepEqual(getStoryQuestions(hezun,{id:section.id+":debate",title:section.sceneNote,summary:section.transcript,ready:true,...recommendation},recommendation.questions),[]);
      }
      const qa = hezun.chapters.find(chapter => chapter.module.kind === "qa").module;
      const carve = qa.items.find(item => item.id === "carve");
      assert.deepEqual(qa.items.map(item=>item.followUp.questions[0]),[
        "为什么古人要把重要的事铸进青铜器？",
        "为什么青铜器不是人人都能使用？",
        "三千年前的文字，是怎样留在青铜器上的？",
        "三千年前的人，和今天的我们有什么相似的心愿？"
      ]);
      for (const item of qa.items) {
        const moment = {id:item.id,title:item.question,summary:item.answer,ready:true,...item.followUp,blockedQuestions:qa.items.map(item=>item.question)};
        assert.deepEqual(getStoryQuestions(hezun,moment),item.followUp.questions);
        assert.equal(getConfiguredFollowUp(hezun,item.followUp.questions[0]),item.followUp);
      }
      assert.ok(qa.items.find(item=>item.id==="who").followUp.localAnswer.includes("主要说的是青铜礼器"));
      assert.ok(carve.followUp.localAnswer.includes("铸成"));
      assert.ok(qa.items.find(item=>item.id==="mind").followUp.localAnswer.includes("情感联想"));
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
      assert.deepEqual(getReplyFacts({...context,storyMoment:undefined}, "这里的中国和今天一样吗？").map(f => f.id), ["fact-inscription-zhongguo", "fact-inscription-full"]);
      const prompt = buildSystemPrompt(context, "这里的中国是什么意思？");
      assert.ok(prompt.includes("sec-center") && prompt.includes("铭文初现") && prompt.includes("120 字"));
      assert.ok(buildSystemPrompt({...context,answerMode:"deep"}, "解释一下").includes("360 字"));
      assert.ok(buildSystemPrompt(context, "解释一下").includes("完整回答优先于字数目标"));
      assert.equal(getConfiguredFollowUp({...hezun,verifiedFacts:[]},discoveryFollowUp.questions[0]),undefined);
      assert.equal(getConfiguredFollowUp(hezun,discoveryFollowUp.questions[0].replace("？","?")),discoveryFollowUp);
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
      // 加速打字机，检查实际 API/离线路径的最终文本，不只检查引用资料命中。
      const originalTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (fn, ms, ...args) => originalTimeout(fn, 0, ...args);
      console.warn = () => {};
      const reply = async (ctx, question) => {
        let typed = "", done = "", meta;
        await streamArtifactReply(ctx,question,{onToken:(text)=>typed=text,onDone:(text,basis,metadata)=>{done=text;meta=metadata;}});
        assert.equal(typed,done);
        return {text:done,meta};
      };
      try {
        globalThis.fetch = async () => { throw new Error("test offline"); };
        for (const followUp of followUps) {
          const question = followUp.questions[0];
          const offline = await reply({...context,storyMoment:{id:"offline",title:"",summary:"",ready:true,...followUp}},question);
          const inferred = followUp.factIds.some(id=>hezun.verifiedFacts.find(fact=>fact.id===id).confidence==="inferred");
          assert.equal(offline.text,followUp.localAnswer+(inferred?"\\n\\n这一段，更接近合理的推测，而不是百分百确定的史实。":""));
          assert.equal(offline.meta.source,"local");
          assert.deepEqual([...offline.meta.factIds].sort(),[...followUp.factIds].sort());
        }
        const chronologicalContext = {...context,storyMoment:{id:"history",title:"",summary:"",ready:true,...discoveryFollowUp}};
        const shortReply = await reply(chronologicalContext,discoveryFollowUp.questions[0]);
        for (const year of ["1963","1965","1975"]) assert.ok(shortReply.text.includes(year));
        assert.ok(shortReply.text.endsWith("并非同时完成。"));
        const deepReply = await reply({...chronologicalContext,answerMode:"deep"},discoveryFollowUp.questions[0]);
        for (const id of discoveryFollowUp.factIds) assert.ok(deepReply.text.includes(hezun.verifiedFacts.find(fact=>fact.id===id).content));
        // 服务端完整长回答也不能在 120/360 字处被前端二次裁切。
        const serverText = hezun.verifiedFacts.filter(fact=>discoveryFollowUp.factIds.includes(fact.id)).map(fact=>fact.content).join("\\n\\n");
        assert.ok(Array.from(serverText).length>120);
        globalThis.fetch = async () => ({ok:true,json:async()=>({reply:serverText})});
        const backendReply = await reply(chronologicalContext,discoveryFollowUp.questions[0]);
        assert.equal(backendReply.text,serverText);
        assert.equal(backendReply.meta.source,"ai");
      } finally {
        globalThis.fetch=originalFetch; console.warn=originalWarn; globalThis.setTimeout=originalTimeout;
      }
      console.log("✅ 铭文行为推荐、当前段落考据、完整短答、三个时间点覆盖、服务端全文保留与暂停恢复通过");
    `,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
