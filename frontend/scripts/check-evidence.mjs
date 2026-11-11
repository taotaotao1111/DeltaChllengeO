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
    import { getRegisteredEvidenceActions, resolveActionTarget, getEvidenceActionPresentation, getEvidenceDiscoveryKeys, getEvidenceIntentAnswer } from "./src/utils/evidenceActions";
    import { getHotspotFocusPosition } from "./src/utils/hotspotFocus";
    import { getInitialHistoryPhase } from "./src/utils/historyTimeline";
    import { useGameStore } from "./src/store/gameStore";
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import InscriptionModule from "./src/components/scenes/modules/InscriptionModule";
    import ArtifactViewer from "./src/components/artifact/ArtifactViewer";
    import HistoryTimeline from "./src/components/story/HistoryTimeline";
    import ChatMessage from "./src/components/ai/ChatMessage";
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
    // B/C 必须能定位真实内容；类型、目标与全部史料须相互匹配。
    const registry = getRegisteredEvidenceActions(hezun);
    assert.equal(registry.length,3);
    const patternAction = registry.find(item=>item.type==="FOCUS_HOTSPOT");
    const timelineAction = registry.find(item=>item.type==="OPEN_TIMELINE");
    const scenarios = [
      {action:patternAction,questions:["何尊身上的兽面纹有什么意义？","饕餮纹为什么像一张脸？"],label:"带我看纹饰 · 兽面纹",key:"hotspot-pattern"},
      {action:timelineAction,questions:["何尊是怎么被发现的？","你在哪里出土？","何尊重新见天日的经过是什么？"],label:"带我回到 1963 年 · 重逢",key:"history:phase:rediscovery"},
    ];
    for(const scenario of scenarios) {
      assert.ok(scenario.action);
      const info = resolveActionTarget(hezun,scenario.action);
      const text = getEvidenceIntentAnswer(hezun,scenario.questions[0]);
      assert.equal(text,info.target.interpretation);
      assert.deepEqual(validateEvidenceAction(hezun,scenario.action,scenario.action.factIds,text),scenario.action);
      for(const question of scenario.questions) {
        assert.deepEqual(getEvidenceIntentFactIds(hezun,question),scenario.action.factIds);
        assert.deepEqual(deriveEvidenceActions(hezun,text,scenario.action.factIds,question),[scenario.action]);
        assert.ok(scenario.action.factIds.every(id=>getReplyFacts(context,question).some(fact=>fact.id===id)));
      }
      for(const wrong of [{...scenario.action,targetId:"document.body"},{...scenario.action,type:"FOCUS_INSCRIPTION"},{...scenario.action,artifactId:"changxin"},{...scenario.action,factIds:[]},{...scenario.action,factIds:["fact-inscription-zhongguo"]}]) {
        assert.equal(validateEvidenceAction(hezun,wrong,scenario.action.factIds,text),null);
      }
      assert.equal(validateEvidenceAction(hezun,scenario.action,[],text),null);
      assert.equal(validateEvidenceAction(hezun,scenario.action,scenario.action.factIds,"没有回答当前内容"),null);
      const json = decodeEvidenceReply(JSON.stringify({answer:text,factIds:scenario.action.factIds,suggestedActions:[scenario.action]}),hezun);
      assert.deepEqual(json.suggestedActions,[scenario.action]);
      assert.equal(getEvidenceActionPresentation(hezun,scenario.action).label,scenario.label);
      const before = useGameStore.getState();
      const beforeChapter = before.chapterIndex, beforeStage=before.stage, beforeMoment=before.storyMoment;
      getEvidenceDiscoveryKeys(hezun,scenario.action).forEach(key=>state.markDiscovered(key));
      assert.ok(useGameStore.getState().discoveredDetails.includes(scenario.key));
      assert.equal(useGameStore.getState().chapterIndex,beforeChapter);
      assert.equal(useGameStore.getState().stage,beforeStage);
      assert.equal(useGameStore.getState().storyMoment,beforeMoment);
      const markup = renderToStaticMarkup(createElement(ChatMessage,{artifact:hezun,message:{id:"test",role:"artifact",content:text,factBasis:"verified",factIds:scenario.action.factIds,suggestedActions:[scenario.action]},facts:[],sourcesOpen:false,loading:false,onSources:()=>{},onDeepDive:()=>{},onRetry:()=>{},onExplore:()=>{}}));
      assert.ok(markup.includes(scenario.label));
    }
    assert.deepEqual(getEvidenceDiscoveryKeys(hezun,{...timelineAction,targetId:"today"}),[]);
    assert.deepEqual(getRegisteredEvidenceActions({...hezun,hotspots:[]}).filter(a=>a.type==="FOCUS_HOTSPOT"),[]);
    assert.deepEqual(getRegisteredEvidenceActions({...hezun,timeline:[]}).filter(a=>a.type==="OPEN_TIMELINE"),[]);
    assert.deepEqual(getEvidenceIntentFactIds(hezun,"内底铭文是什么时候被发现的？"),[]);
    const pose = resolveActionTarget(hezun,patternAction);
    const camera = getHotspotFocusPosition(4.2,pose.target.view);
    assert.ok(Math.abs(Math.hypot(...camera)-4.2)<1e-9);
    const [hx,,hz] = pose.hotspot.position3d;
    assert.ok((hx*camera[0]+hz*camera[2])/(Math.hypot(hx,hz)*Math.hypot(camera[0],camera[2]))>.99);
    const fallback = renderToStaticMarkup(createElement(ArtifactViewer,{artifact:hezun,hotspots:[pose.hotspot],activeHotspotType:pose.hotspot.type,focusView:pose.target.view,className:"h-full"}));
    assert.ok(fallback.includes("当前为插画示意") && fallback.includes("器身纹饰"));
    const timelineMarkup = renderToStaticMarkup(createElement(HistoryTimeline,{artifact:hezun,focusedId:"rediscovery",activeId:"rediscovery",visitedIds:[],onFocus:()=>{},onSelect:()=>{},evidenceInitiallyOpen:true}));
    assert.ok(timelineMarkup.includes('aria-current="step"') && timelineMarkup.includes('aria-expanded="true"'));
    for(const year of ["1963","1965","1975"]) assert.ok(timelineMarkup.includes(year));
    assert.ok(timelineMarkup.includes('<details open=""'));
    for(const id of timelineAction.factIds) assert.ok(timelineMarkup.includes(hezun.verifiedFacts.find(f=>f.id===id).source));
    assert.equal(getInitialHistoryPhase(hezun,4),"rediscovery");
    const allMemory = buildExplorationMemory(hezun,useGameStore.getState().discoveredDetails,[]);
    assert.deepEqual(allMemory.evidence,["宅兹中国","兽面纹","1963 年 · 重逢"]);
    assert.deepEqual(allMemory.completed,[]);
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
      for(const scenario of scenarios) {
        const text=getEvidenceIntentAnswer(hezun,scenario.questions[0]);
        globalThis.fetch=async()=>({ok:true,json:async()=>({reply:JSON.stringify({answer:text,factIds:scenario.action.factIds,suggestedActions:[scenario.action]})})});
        const live=await reply(scenario.questions[0]);
        assert.equal(live.metadata.source,"ai"); assert.deepEqual(live.metadata.suggestedActions,[scenario.action]);
        globalThis.fetch=async()=>({ok:true,json:async()=>({reply:text})});
        assert.deepEqual((await reply(scenario.questions[0])).metadata.suggestedActions,[scenario.action]);
        globalThis.fetch=async()=>{throw new Error("offline")};
        const local=await reply(scenario.questions[0]);
        assert.equal(local.metadata.source,"local"); assert.deepEqual(local.metadata.suggestedActions,[scenario.action]);
      }
    } finally { globalThis.fetch=originalFetch; globalThis.setTimeout=originalTimeout; console.warn=originalWarn; }
    console.log("✅ 铭文、兽面纹、重逢时间线：入口校验、相机目标、来源、原进度与记忆、AI/旧响应/离线回退通过");
  `},
  bundle:true,platform:"node",format:"esm",write:false,jsx:"automatic",loader:{".css":"empty"},
  banner:{js:`import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(fileURLToPath(new URL("../package.json", import.meta.url)))});`},
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
