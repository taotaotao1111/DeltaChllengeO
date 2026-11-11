import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const result = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    contents: `
      import assert from "node:assert/strict";
      import { getChatPanelBounds } from "./src/utils/chatViewport";
      import { createAmbientAudioController, suspendAmbientAudio, isAmbientAudioSuspended } from "./src/utils/ambientAudio";
      import { playStoryVideo, storyVideoCompletionKey } from "./src/utils/storyVideo";
      import { loadProgress } from "./src/utils/progressStorage";
      import { blurFogPixels, getFogClearedRatio, wipeFogStroke } from "./src/utils/fogMask";
      import { getInitialHistoryPhase, historyPhaseKey } from "./src/utils/historyTimeline";
      import { hezun } from "./src/data/artifacts/hezun";
      import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import HistoryTimeline from "./src/components/story/HistoryTimeline";
      import ArchiveCardFace from "./src/components/scenes/modules/ArchiveCardFace";
      import ArchiveCardStack from "./src/components/scenes/modules/ArchiveCardStack";
      import FlipCardProgress from "./src/components/scenes/modules/FlipCardProgress";
      import { useGameStore } from "./src/store/gameStore";
      assert.equal(getInitialHistoryPhase(hezun,1,[]),"casting");
      assert.equal(getInitialHistoryPhase(hezun,2,[]),"rediscovery");
      assert.equal(getInitialHistoryPhase(hezun,4,hezun.chapters.map(c=>"chapter:"+c.id)),"today");
      // 浏览记录与当前选中分开：向后切换、返回旧节点、关闭故事均不会熄灭已读节点和弧线。
      const state = useGameStore.getState();
      state.selectArtifact("hezun");
      state.markDiscovered(historyPhaseKey("casting"));
      state.markDiscovered(historyPhaseKey("quiet"));
      const phases = hezun.historyEnding.phases;
      const visitedIds = phases.filter(phase=>useGameStore.getState().discoveredDetails.includes(historyPhaseKey(phase.id))).map(phase=>phase.id);
      const draw = (focusedId,activeId=null) => renderToStaticMarkup(createElement(HistoryTimeline,{artifact:hezun,focusedId,activeId,visitedIds,onFocus:()=>{},onSelect:()=>{}}));
      const count = (html,pattern) => (html.match(pattern)??[]).length;
      const firstTwo = draw("quiet");
      assert.equal(count(firstTwo,/is-visited/g),2);
      assert.equal(count(firstTwo,/<path class="is-lit"/g),3);
      assert.equal(count(firstTwo,/is-focused/g),1);
      const revisit = draw("casting");
      assert.equal(count(revisit,/is-visited/g),2);
      assert.equal(count(revisit,/<path class="is-lit"/g),3);
      const third = draw("rediscovery","rediscovery");
      assert.equal(count(third,/is-visited/g),3);
      assert.equal(count(third,/<path class="is-lit"/g),5);
      assert.equal(count(third,/is-focused/g),1);
      // 六张纸卡均保留完整史实、来源及提示；移动端与 PC 选择各自真实素材。
      const flipModule = hezun.chapters.find(chapter=>chapter.module.kind==="flip").module;
      // 从后面的卡片回看第一张，仍保留已读状态，并给键盘留下唯一导航入口。
      const readCards = flipModule.cards.slice(0,3).map(card=>card.id);
      const progress = renderToStaticMarkup(createElement(FlipCardProgress,{cards:flipModule.cards,currentIndex:0,readIds:readCards,panelId:"archive-card",onSelect:()=>{}}));
      assert.equal(count(progress,/<button /g),flipModule.cards.length);
      assert.equal(count(progress,/is-read/g),3);
      assert.equal(count(progress,/aria-current="step"/g),1);
      assert.equal(count(progress,/tabindex="0"/g),1);
      assert.equal(count(progress,/aria-controls="archive-card"/g),flipModule.cards.length);
      assert.ok(progress.includes('aria-label="查看第 1 张，已读"'));
      for (const card of flipModule.cards) {
        const front = renderToStaticMarkup(createElement(ArchiveCardFace,{face:"front",artwork:flipModule.cardArtwork,artifactName:hezun.name,card,hidden:false,onReadScroll:()=>{}}));
        const back = renderToStaticMarkup(createElement(ArchiveCardFace,{face:"back",artwork:flipModule.cardArtwork,artifactName:hezun.name,card,hidden:false,onReadScroll:()=>{}}));
        assert.ok(front.includes(flipModule.cardArtwork.front.mobile) && front.includes(flipModule.cardArtwork.front.desktop));
        assert.ok(back.includes(flipModule.cardArtwork.back.mobile) && back.includes(flipModule.cardArtwork.back.desktop));
        assert.ok(back.includes(card.back.content) && back.includes(card.back.source));
        if (card.hint) assert.ok(back.includes(card.hint));
      }
      // 结尾收拢的是读过的六张新纸卡，装饰层不会抢走键盘阅读焦点。
      const mergedCards = renderToStaticMarkup(createElement(ArchiveCardStack,{artifactName:hezun.name,artwork:flipModule.cardArtwork,cards:flipModule.cards,message:flipModule.mergeLine}));
      assert.equal(count(mergedCards,/data-card-id=/g),flipModule.cards.length);
      for (const card of flipModule.cards) assert.ok(mergedCards.includes('data-card-id="'+card.id+'"'));
      assert.ok(mergedCards.includes(flipModule.cardArtwork.front.mobile) && mergedCards.includes(flipModule.cardArtwork.back.mobile));
      assert.ok(mergedCards.includes(flipModule.mergeLine));
      assert.ok(!mergedCards.includes('tabindex="0"'));
      // 手机打开即填满可见视口，键盘出现、视口偏移、旋转都不回退半屏。
      assert.deepEqual(getChatPanelBounds(false,800),{height:800,bottom:0});
      assert.deepEqual(getChatPanelBounds(false,800,480),{height:480,bottom:320});
      assert.deepEqual(getChatPanelBounds(false,800,440,40),{height:440,bottom:320});
      assert.deepEqual(getChatPanelBounds(false,390),{height:390,bottom:0});
      assert.deepEqual(getChatPanelBounds(false,800,820),{height:800,bottom:0});
      // 桌面仍是带 16px 外边距的右侧抽屉。
      assert.deepEqual(getChatPanelBounds(true,900),{height:868,bottom:16});
      assert.deepEqual(getChatPanelBounds(true,900,600),{height:568,bottom:316});
      class FakeAudio extends EventTarget {
        paused = true; volume = 1; currentTime = 42; plays = 0;
        play() { this.paused = false; this.plays++; return Promise.resolve(); }
        pause() { this.paused = true; this.dispatchEvent(new Event("pause")); }
      }
      const audio = new FakeAudio();
      let playing = false;
      const controller = createAmbientAudioController(audio, value => playing = value);
      controller.setEnabled(true); await Promise.resolve();
      assert.equal(playing, true);
      const releaseVideo = suspendAmbientAudio();
      assert.equal(audio.paused, true); assert.equal(playing, false);
      // 关闭视频的同一个调用栈内恢复，不需要用户再切一次音乐开关。
      releaseVideo(); assert.equal(audio.paused, false); await Promise.resolve();
      assert.equal(playing, true); assert.equal(audio.currentTime,42);
      const playCount = audio.plays; releaseVideo(); assert.equal(audio.plays,playCount);
      // 视频期间的点击不能让背景音乐抢回焦点。
      const releaseAgain = suspendAmbientAudio(); controller.setEnabled(true);
      assert.equal(audio.paused,true);
      controller.setEnabled(false); releaseAgain(); await Promise.resolve();
      assert.equal(audio.paused,true); assert.equal(playing,false);
      controller.setEnabled(true); await Promise.resolve();
      assert.equal(playing,true);
      const releaseA=suspendAmbientAudio(), releaseB=suspendAmbientAudio();
      releaseA(); assert.equal(audio.paused,true); releaseB(); assert.equal(audio.paused,false);
      assert.equal(isAmbientAudioSuspended(),false);
      // 旧 play Promise 完成不能把暂停状态误标成正在播放。
      controller.setEnabled(true); const releasePending=suspendAmbientAudio(); await Promise.resolve();
      assert.equal(playing,false); releasePending(); await Promise.resolve();
      controller.dispose(); assert.equal(audio.paused,true);
      // 浏览器拒绝带声播放时不得悄悄静音重播；用户重试仍明确请求声音。
      const video = {
        muted:true, defaultMuted:true, volume:0, plays:0, allowed:false,
        play() {
          this.plays++;
          assert.equal(this.muted,false);
          assert.equal(this.defaultMuted,false);
          assert.equal(this.volume,1);
          return this.allowed ? Promise.resolve() : Promise.reject(new DOMException("User gesture required","NotAllowedError"));
        }
      };
      const request = playStoryVideo(video);
      assert.equal(video.plays,1); // play() 同步发起，不推迟至 Promise 或计时器。
      await assert.rejects(request,{name:"NotAllowedError"});
      assert.equal(video.plays,1); assert.equal(video.muted,false);
      video.allowed=true; video.muted=true; video.volume=0;
      await playStoryVideo(video); assert.equal(video.plays,2);
      // 看完状态跟随视频素材保存，跨问题、章节与续读保留，换文物不会串入。
      const previousWindow = globalThis.window;
      const storage = new Map();
      globalThis.window = {localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}};
      try {
        const source = hezun.chapters.find(chapter=>chapter.module.kind==="qa").module.fullStoryVideo.src;
        const completedKey = storyVideoCompletionKey(source);
        useGameStore.getState().setStage("chapter");
        useGameStore.getState().setChapter(1);
        assert.equal(useGameStore.getState().discoveredDetails.includes(completedKey),false);
        useGameStore.getState().markDiscovered(completedKey);
        useGameStore.getState().persistCheckpoint();
        const snapshot = loadProgress();
        assert.ok(snapshot.discovered.includes(completedKey));
        useGameStore.getState().setChapter(2);
        useGameStore.getState().setChapter(1);
        useGameStore.getState().markDiscovered(completedKey);
        assert.equal(useGameStore.getState().discoveredDetails.filter(id=>id===completedKey).length,1);
        assert.equal(useGameStore.getState().discoveredDetails.includes(storyVideoCompletionKey("videos/another-story.mp4")),false);
        useGameStore.getState().selectArtifact("changxin");
        assert.equal(useGameStore.getState().discoveredDetails.includes(completedKey),false);
        useGameStore.setState({resumable:snapshot});
        useGameStore.getState().resumeSession();
        assert.equal(useGameStore.getState().currentArtifactId,"hezun");
        assert.ok(useGameStore.getState().discoveredDetails.includes(completedKey));
      } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
      }
      // 雾层覆盖率来自真实 alpha：半透明边缘按比例计入，避免中心点网格的虚假进度。
      assert.equal(getFogClearedRatio(new Uint8ClampedArray()),0);
      assert.equal(getFogClearedRatio(new Uint8ClampedArray([255,255,255,255,255,255,255,255])),0);
      assert.equal(getFogClearedRatio(new Uint8ClampedArray([255,255,255,0,255,255,255,255])),0.5);
      assert.ok(Math.abs(getFogClearedRatio(new Uint8ClampedArray([255,255,255,128]))-0.498)<0.001);
      // 静态模糊只扩散颜色，不改变不透明度；不支持 Canvas filter 的手机也能显示轮廓。
      const uniform = new Uint8ClampedArray(Array.from({length:12},()=>[74,96,120,255]).flat());
      const expectedUniform = uniform.slice();
      blurFogPixels(uniform,3,4,2);
      assert.deepEqual(uniform,expectedUniform);
      const impulse = new Uint8ClampedArray(Array.from({length:49},()=>[0,0,0,255]).flat());
      impulse[(3*7+3)*4]=255;
      blurFogPixels(impulse,7,7,1);
      assert.ok(impulse[(3*7+3)*4]>0 && impulse[(3*7+3)*4]<255);
      assert.ok(impulse[(3*7+2)*4]>0);
      assert.equal(impulse[(3*7+2)*4],impulse[(3*7+4)*4]);
      for(let i=0;i<49;i++){
        assert.equal(impulse[i*4+1],0); assert.equal(impulse[i*4+2],0); assert.equal(impulse[i*4+3],255);
      }
      // 高速拖动也必须覆盖整条轨迹，笔刷使用 destination-out 和软边透明度。
      const centers = [];
      let operation = "source-over";
      const brushContext = {
        save(){},restore(){},set globalCompositeOperation(value){operation=value},
        createRadialGradient(x,y,inner,ex,ey,outer){
          assert.equal(operation,"destination-out");
          assert.ok(inner<outer); centers.push([x,y]);
          return {addColorStop(position,color){if(position===1)assert.equal(color,"rgba(0,0,0,0)")}};
        }, fillRect(){}, fillStyle:""
      };
      wipeFogStroke(brushContext,{x:10,y:20},{x:210,y:20},20);
      assert.deepEqual(centers[0],[10,20]); assert.deepEqual(centers.at(-1),[210,20]);
      for(let i=1;i<centers.length;i++)assert.ok(centers[i][0]-centers[i-1][0]<=6.001);
      console.log("✅ 交互回归通过：时间线、手机全屏、视频音频与续读、雾层透明度与连续擦拭");
    `,
  },
  bundle: true, platform: "node", format: "esm", write: false, jsx: "automatic", loader: { ".css": "empty" },
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(fileURLToPath(new URL("../package.json", import.meta.url)))});` },
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
