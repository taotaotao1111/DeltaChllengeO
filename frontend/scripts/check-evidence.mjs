import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const result = await build({
  stdin: { resolveDir: fileURLToPath(new URL("..", import.meta.url)), contents: `
    import assert from "node:assert/strict";
    import { hezun } from "./src/data/artifacts/hezun";
    import { changxin } from "./src/data/artifacts/changxin";
    import { getInscriptionEvidenceRange, getChatDiscoveryQuestions, getEvidenceIntentFactIds, getEvidenceTargets, validateEvidenceAction, decodeEvidenceReply, deriveEvidenceActions, evidenceVisitKey } from "./src/utils/evidenceActions";
    import { captureChatContext, getReplyFacts } from "./src/utils/chatContext";
    import { buildSystemPrompt } from "./src/utils/factGuard";
    import { streamArtifactReply } from "./src/services/aiService";
    import { buildExplorationMemory } from "./src/utils/explorationMemory";
    import { useGameStore } from "./src/store/gameStore";
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import InscriptionModule from "./src/components/scenes/modules/InscriptionModule";
    const target = getEvidenceTargets(hezun)[0];
    assert.ok(target); assert.equal(target.section.id,"sec-climax");
    assert.deepEqual(getEvidenceTargets(changxin),[]);
    const answer = hezun.evidenceGuide.answer;
    const factIds = target.target.factIds;
    const action = {type:"FOCUS_INSCRIPTION",artifactId:"hezun",targetId:"sec-climax",factIds};
    assert.deepEqual(validateEvidenceAction(hezun,action,factIds,answer),action);
    for (const invalid of [null,{}, {...action,type:"EXECUTE_CODE"},{...action,artifactId:"changxin"},{...action,targetId:"document.body"},{...action,factIds:[]},{...action,factIds:[...factIds,"fake"]}]) {
      assert.equal(validateEvidenceAction(hezun,invalid,factIds,answer),null);
    }
    assert.equal(validateEvidenceAction(hezun,action,[],answer),null);
    assert.equal(validateEvidenceAction(hezun,action,factIds,"这是一个没有谈及铭文的回答。"),null);
    assert.deepEqual(deriveEvidenceActions(hezun,answer,factIds),[action]);
    assert.deepEqual(deriveEvidenceActions(hezun,"史料没有留下答案。",factIds),[]);
    assert.deepEqual(getChatDiscoveryQuestions(hezun,["另一个问题"],[]),[hezun.evidenceGuide.question,"另一个问题"]);
    assert.deepEqual(getChatDiscoveryQuestions(hezun,["另一个问题"],["问过了"]),["另一个问题"]);
    assert.deepEqual(getChatDiscoveryQuestions(changxin,["原问题"],[]),["原问题"]);
    const variants = ["你为什么这么重要？","你有什么特别的？","为什么值得收藏？","何尊和其他青铜器有什么不同？","这里的中国是什么意思？"];
    for(const question of variants) assert.deepEqual(getEvidenceIntentFactIds(hezun,question),factIds);
    for(const question of ["这段为什么重要？","你有没有灵魂？","是谁埋了你？","你身上的纹饰为什么特别？","王迁居成周为什么重要？"]) assert.deepEqual(getEvidenceIntentFactIds(hezun,question),[]);
    const decoded = decodeEvidenceReply(JSON.stringify({answer,factIds,suggestedActions:[action]}),hezun);
    assert.deepEqual(decoded,{answer,factIds,suggestedActions:[action]});
    assert.deepEqual(decodeEvidenceReply(JSON.stringify({answer,factIds:["fake"],suggestedActions:[action]}),hezun).suggestedActions,[]);
    assert.deepEqual(decodeEvidenceReply(JSON.stringify({answer,factIds,suggestedActions:[{...action,targetId:"#anything"}]}),hezun).suggestedActions,[]);
    assert.equal(decodeEvidenceReply("旧版纯文本回答",hezun).answer,"旧版纯文本回答");
    assert.throws(()=>decodeEvidenceReply('{"answer":',hezun));
    const state = useGameStore.getState();
    state.selectArtifact("hezun"); state.setStage("chapter"); state.setChapter(4);
    const moment = {id:"original-story",title:"重逢",summary:"原来的卡片",factIds:["fact-discovery"],questions:[],ready:true};
    state.setStoryMoment(moment); state.toggleChat(true);
    state.markDiscovered(evidenceVisitKey(action.targetId));
    state.markDiscovered("inscription:"+action.targetId);
    const context = {artifact:hezun,verifiedFacts:hezun.verifiedFacts,timeline:hezun.timeline,conversationHistory:[],...captureChatContext(hezun,4,"history",[],moment)};
    assert.equal(useGameStore.getState().chapterIndex,4);
    assert.equal(useGameStore.getState().stage,"chapter");
    assert.equal(useGameStore.getState().storyMoment.id,moment.id);
    assert.equal(useGameStore.getState().chatOpen,true);
    assert.deepEqual(getReplyFacts(context,variants[0]).map(f=>f.id),factIds);
    const focused = renderToStaticMarkup(createElement(InscriptionModule,{artifact:hezun,data:target.module,focusSectionId:action.targetId,onNext:()=>{}}));
    assert.ok(focused.includes("金文「中」摹写") && focused.includes("金文「国」摹写"));
    const highlighted = [...focused.matchAll(/data-evidence-highlight="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(highlighted.join(""),"宅兹中国");
    const range = getInscriptionEvidenceRange(target.module,target.section,target.target.label);
    assert.equal(target.module.fullText.slice(...range).join(""),"宅兹中国");
    assert.equal(getInscriptionEvidenceRange(target.module,target.section,"用作公宝尊彝"),null);
    assert.equal((focused.match(/visibility:hidden/g)??[]).length,2);
    // 右起整卷必须有明确布局宽度，不能只校验目标字存在于被裁切的 DOM 中。
    const paperStyle = focused.match(/class="paper-noise[^\"]*" style="([^\"]*)"/)[1];
    const columns = Math.ceil(target.module.fullText.length / 8);
    const expectedWidth = 2 * 20 + 2 * 24 + (columns + 1) * 32 + columns * 52;
    assert.ok(paperStyle.includes("width:" + expectedWidth + "px"));
    assert.ok(paperStyle.includes("padding-inline:20px"));
    assert.ok(!focused.includes("从头读"));
    // SSR 证据视图不能发布或清除原故事上下文。
    assert.equal(useGameStore.getState().storyMoment.id,moment.id);
    const memory = buildExplorationMemory(hezun,useGameStore.getState().discoveredDetails,[]);
    assert.deepEqual(memory.evidence,["宅兹中国"]); assert.deepEqual(memory.completed,[]);
    assert.deepEqual(buildExplorationMemory(hezun,[],[]).evidence,[]);
    state.toggleChat(false); assert.equal(useGameStore.getState().chapterIndex,4);
    assert.ok(buildSystemPrompt(context,variants[0]).includes("suggestedActions"));
    const originalFetch = globalThis.fetch, originalTimeout = globalThis.setTimeout, originalWarn = console.warn;
    globalThis.setTimeout = (fn,_delay,...args)=>originalTimeout(fn,0,...args); console.warn=()=>{};
    const reply = async question => {
      let result, typed="";
      await streamArtifactReply(context,question,{onToken:text=>typed=text,onDone:(text,basis,metadata)=>result={text,basis,metadata}});
      assert.equal(result.text,typed); return result;
    };
    try {
      globalThis.fetch=async()=>({ok:true,json:async()=>({reply:JSON.stringify({answer,factIds,suggestedActions:[action]})})});
      const online=await reply(variants[0]);
      assert.equal(online.text,answer); assert.equal(online.metadata.source,"ai");
      assert.deepEqual(online.metadata.suggestedActions,[action]); assert.equal(online.basis,"verified");
      const personal=await reply("你有灵魂吗？"); assert.deepEqual(personal.metadata.suggestedActions,[]);
      globalThis.fetch=async()=>({ok:true,json:async()=>({reply:answer})});
      assert.deepEqual((await reply(variants[0])).metadata.suggestedActions,[action]);
      globalThis.fetch=async()=>{throw new Error("offline")};
      for(const question of variants) {
        const local=await reply(question); assert.equal(local.metadata.source,"local");
        assert.ok(local.text.includes("中国")); assert.deepEqual(local.metadata.suggestedActions,[action]);
      }
      const unknown=await reply("谁把你埋进土里的？"); assert.deepEqual(unknown.metadata.suggestedActions,[]);
    } finally { globalThis.fetch=originalFetch; globalThis.setTimeout=originalTimeout; console.warn=originalWarn; }
    console.log("✅ 证据入口、多种问法、动作登记校验、AI JSON/旧响应/离线回退、原进度保留与记忆记录通过");
  `},
  bundle:true,platform:"node",format:"esm",write:false,jsx:"automatic",loader:{".css":"empty"},
  banner:{js:`import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(fileURLToPath(new URL("../package.json", import.meta.url)))});`},
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
