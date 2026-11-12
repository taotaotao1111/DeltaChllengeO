import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

// 状态/SSR 检查发现不了 React 客户端的同级重复 key：这个回归曾使片尾 DOM 残留。
const homeSource = ts.createSourceFile("Home.tsx", readFileSync(new URL("../src/pages/Home.tsx",import.meta.url),"utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = homeSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "Home");
const returned = home?.body?.statements.find(ts.isReturnStatement)?.expression;
const keys = [];
function collectSceneKeys(node) {
  if (!node) return;
  if (ts.isParenthesizedExpression(node)) return collectSceneKeys(node.expression);
  if (ts.isJsxExpression(node)) return collectSceneKeys(node.expression);
  if (ts.isBinaryExpression(node)) return collectSceneKeys(node.right);
  if (ts.isConditionalExpression(node)) { collectSceneKeys(node.whenTrue); collectSceneKeys(node.whenFalse); return; }
  const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
  if (!opening) return;
  const key = opening.attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(homeSource) === "key");
  if (!key?.initializer) return;
  const value = ts.isJsxExpression(key.initializer) ? key.initializer.expression : key.initializer;
  const text = value?.getText(homeSource).replaceAll("${currentArtifactId}","hezun").replaceAll("${chapterIndex}","4").replaceAll("`", "").replaceAll('"', "");
  keys.push({component:opening.tagName.getText(homeSource),key:text === "currentArtifactId" ? "hezun" : text});
}
const homeRoot = returned && ts.isParenthesizedExpression(returned) ? returned.expression : returned;
assert.ok(homeRoot && ts.isJsxElement(homeRoot));
homeRoot.children.forEach(collectSceneKeys);
assert.equal(new Set(keys.map((item) => item.key)).size,keys.length,`页面同级 key 冲突：${JSON.stringify(keys)}`);
assert.ok(keys.some((item) => item.component === "EpilogueScene"));
assert.ok(keys.some((item) => item.component === "MemoryCard"));

const result = await build({
  define:{'process.env.NODE_ENV':'"production"'},
  stdin: { resolveDir:fileURLToPath(new URL("..",import.meta.url)), contents:`
    import assert from 'node:assert/strict';
    import { existsSync,statSync } from 'node:fs';
    import { useGameStore } from './src/store/gameStore';
    import { loadEncounter,saveEncounter } from './src/utils/encounterStorage';
    import { loadProgress } from './src/utils/progressStorage';
    import { getArtifact } from './src/data/artifacts';
    import { getExpectationScrollDelta, keepExpectationInView } from './src/utils/expectationViewport';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import TimelineScene from './src/components/scenes/TimelineScene';
    import EpilogueScene from './src/components/scenes/EpilogueScene';
    const originalWindow=globalThis.window;
    const storage=new Map();
    globalThis.window={addEventListener:()=>{},removeEventListener:()=>{},matchMedia:()=>({matches:false,addListener:()=>{},removeListener:()=>{},addEventListener:()=>{},removeEventListener:()=>{}}),localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}};
    const state=()=>useGameStore.getState();
    const reset=()=>useGameStore.setState({stage:'chapter',currentArtifactId:'hezun',chapterIndex:4,storyCompleted:false,epilogueSeen:false,memoryCardOpen:false,userLegacyLine:null,tracedGlyphs:null,chatOpen:false});
    try {
      // 键盘只缩小 visualViewport 时，滚动内层页面并补足底部空间。
      assert.equal(getExpectationScrollDelta({top:600,bottom:790},{top:650,bottom:726},12,828),0);
      assert.equal(getExpectationScrollDelta({top:600,bottom:790},{top:650,bottom:726},32,364),426);
      assert.equal(getExpectationScrollDelta({top:600,bottom:790},{top:650,bottom:726},12,140),586);
      const events=()=>{
        const listeners=new Map();
        return {addEventListener:(type,fn)=>{if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn);},removeEventListener:(type,fn)=>listeners.get(type)?.delete(fn),emit:(type)=>listeners.get(type)?.forEach(fn=>fn()),count:()=>[...listeners.values()].reduce((sum,fns)=>sum+fns.size,0)};
      };
      const windowEvents=events(),viewportEvents=events(),inputEvents=events(),mediaEvents=events();
      const frames=new Map(),timers=new Map(),styles=new Map(); let nextTask=0,scrolled=0;
      const media={...mediaEvents,matches:true};
      const viewport={...viewportEvents,height:844,offsetTop:0,scale:1};
      const browser={...windowEvents,visualViewport:viewport,innerHeight:844,matchMedia:()=>media,requestAnimationFrame:fn=>{frames.set(++nextTask,fn);return nextTask;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:fn=>{timers.set(++nextTask,fn);return nextTask;},clearTimeout:id=>timers.delete(id)};
      const flush=()=>{const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn());};
      const input={...inputEvents,getBoundingClientRect:()=>({top:650-scrolled,bottom:726-scrolled})};
      const form={getBoundingClientRect:()=>({top:600-scrolled,bottom:790-scrolled})};
      const scene={ownerDocument:{activeElement:input},style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)},getBoundingClientRect:()=>({top:0,bottom:844}),scrollBy:({top})=>{scrolled+=top;}};
      const stop=keepExpectationInView(scene,form,input,browser); flush(); assert.equal(scrolled,0);
      input.emit('focus'); assert.equal(timers.size,2);
      viewport.height=360; viewport.offsetTop=20; viewport.emit('resize'); viewport.emit('scroll');
      assert.equal(frames.size,1); flush(); assert.equal(scrolled,426); assert.equal(styles.get('--epilogue-keyboard-inset'),'464px');
      assert.ok(form.getBoundingClientRect().bottom<=364);
      viewport.emit('resize'); flush(); assert.equal(scrolled,426); // 已可见不重复跳动。
      scene.ownerDocument.activeElement=null; input.emit('blur'); flush(); assert.equal(styles.size,0);
      scene.ownerDocument.activeElement=input; media.matches=false; media.emit('change'); flush(); assert.equal(scrolled,426);
      stop(); assert.equal(frames.size,0); assert.equal(timers.size,0);
      for(const target of [windowEvents,viewportEvents,inputEvents,mediaEvents]) assert.equal(target.count(),0);
      // 无 VisualViewport 的 WebView 使用 resize 后的 innerHeight，不影响电脑端。
      media.matches=true; browser.visualViewport=undefined; browser.innerHeight=360; scrolled=0;
      const stopFallback=keepExpectationInView(scene,form,input,browser); flush();
      assert.equal(scrolled,446); assert.equal(styles.get('--epilogue-keyboard-inset'),'484px'); stopFallback();
      reset();
      // 主线首次收尾开卡，不要求留言、描红或鉴宝。
      state().completeStory();
      assert.equal(state().stage,'timeline'); assert.equal(state().memoryCardOpen,true);
      assert.equal(state().userLegacyLine,null); assert.equal(state().tracedGlyphs,null);
      assert.equal(loadEncounter('hezun').completed,true);
      // X 关闭、再打开、继续修改，都不能触发片尾。
      state().closeMemoryCard();
      assert.equal(state().stage,'timeline');
      state().openMemoryCard(); state().setUserLegacyLine('一次相遇'); state().closeMemoryCard();
      assert.equal(state().stage,'timeline');
      state().openMemoryCard();
      const transitions=[];
      const unsubscribe=useGameStore.subscribe((next)=>transitions.push({stage:next.stage,card:next.memoryCardOpen}));
      state().finishEncounter(); unsubscribe();
      // 不允许出现「关卡但仍是时间线」的中间帧。
      assert.deepEqual(transitions,[{stage:'epilogue',card:false}]);
      assert.equal(state().memoryCardOpen,false);
      assert.equal(state().stage,'epilogue'); assert.equal(loadEncounter('hezun').epilogueSeen,true);
      // 已看过后，不论重开记忆卡、重走出口或续读都不强制重播。
      const originalDetails=[...state().discoveredDetails];
      state().setUserLegacyLine('留下的话'); state().setTracedGlyphs(['data:image/png;base64,ink']);
      // 返回必须原子打开记忆卡；已看片尾不能使显式入口失效。
      for(let i=0;i<3;i++) {
        state().returnToMemoryCard();
        assert.equal(state().stage,'timeline'); assert.equal(state().memoryCardOpen,true);
        assert.equal(state().userLegacyLine,'留下的话');
        assert.deepEqual(state().tracedGlyphs,['data:image/png;base64,ink']);
        assert.deepEqual(state().discoveredDetails,originalDetails);
        state().finishEncounter(); assert.equal(state().stage,'epilogue');
      }
      state().returnToMemoryCard(); state().closeMemoryCard();
      assert.equal(state().stage,'timeline');
      const endingMarkup=renderToStaticMarkup(createElement(TimelineScene));
      for(const text of ['我的一生 · 时间线','我的探索记忆卡','故事之后 · 更多探索']) assert.ok(endingMarkup.includes(text));
      const epilogueMarkup=renderToStaticMarkup(createElement(EpilogueScene));
      assert.ok(epilogueMarkup.includes('回到记忆卡')); assert.ok(!epilogueMarkup.includes('回看何尊'));
      state().completeStory();
      assert.equal(state().memoryCardOpen,false); assert.equal(state().stage,'timeline');
      useGameStore.setState({resumable:loadProgress(),storyCompleted:false,epilogueSeen:false});
      state().resumeSession(); assert.equal(state().stage,'timeline'); assert.equal(state().epilogueSeen,true);
      // 没有卡片时重复完成不推进；返回和后续导航不受延时任务影响。
      state().finishEncounter(); assert.equal(state().stage,'timeline');
      reset(); state().completeStory(); state().finishEncounter(); state().returnToMemoryCard();
      assert.equal(state().stage,'timeline'); assert.equal(state().memoryCardOpen,true);
      state().closeMemoryCard(); state().setStage('chapter'); assert.equal(state().stage,'chapter');
      // 每件文物独立；保留当前进度与原始探索足迹。
      state().selectArtifact('changxin');
      assert.equal(state().storyCompleted,false); assert.equal(state().epilogueSeen,false);
      // 记忆卡是全局能力：提前打开卡片也保留主动完成入口，但不伪造主线完成。
      state().openMemoryCard(); state().finishEncounter();
      assert.equal(state().stage,'epilogue'); assert.equal(state().storyCompleted,false);
      state().returnToMemoryCard(); assert.equal(state().memoryCardOpen,true);
      state().closeMemoryCard(); assert.equal(state().stage,'timeline');
      assert.equal(loadEncounter('hezun').completed,true);
      assert.equal(saveEncounter('hezun',{expectation:'想听长信宫灯的故事'}),true);
      assert.equal(loadEncounter('hezun').expectation,'想听长信宫灯的故事');
      assert.equal(loadEncounter('hezun').epilogueSeen,true);
      storage.set('wuyu-encounter-v1:bad','{broken'); assert.equal(loadEncounter('bad').completed,false);
      globalThis.window.localStorage.setItem=()=>{throw new Error('quota');};
      assert.equal(saveEncounter('hezun',{expectation:'不能保存'}),false);
      for(const src of ['images/epilogue/next-encounter-desktop.webp','images/epilogue/next-encounter-mobile.webp']) {
        assert.ok(existsSync('public/'+src)); assert.ok(statSync('public/'+src).size<100000);
      }
      assert.ok(getArtifact('hezun').chapters[4]);
      console.log('✅ 片尾：首次开卡、X 原位关闭、显式完成、无留言描红、无时间线中间帧、片尾与记忆卡反复往返、回看/续读去重、按文物保存、存储失败与键盘可视区适配通过');
    } finally { globalThis.window=originalWindow; }
  ` }, bundle:true,write:false,platform:'node',format:'esm',target:'node20',logLevel:'silent',jsx:'automatic',loader:{'.css':'empty'},
  banner:{js:`import { createRequire } from "node:module"; const require=createRequire(${JSON.stringify(fileURLToPath(new URL('../package.json',import.meta.url)))});`},
});
try { await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`); } catch(error) { console.error(error.name+': '+error.message); process.exitCode=1; }
