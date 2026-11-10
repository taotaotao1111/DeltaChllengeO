import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const result = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    contents: `
      import assert from "node:assert/strict";
      import { clampSheetHeight, resolveSheetSnap, shouldResizeSheet } from "./src/utils/sheetGesture";
      import { createAmbientAudioController, suspendAmbientAudio, isAmbientAudioSuspended } from "./src/utils/ambientAudio";
      assert.equal(clampSheetHeight(620, 480, 800), 620);
      assert.equal(clampSheetHeight(200, 480, 800), 480);
      assert.equal(clampSheetHeight(950, 480, 800), 800);
      assert.equal(resolveSheetSnap(false, -80, 0, 320), true);
      assert.equal(resolveSheetSnap(false, -15, -700, 320), true);
      assert.equal(resolveSheetSnap(false, -3, -700, 320), false);
      assert.equal(resolveSheetSnap(true, 80, 0, 320), false);
      assert.equal(resolveSheetSnap(true, 15, 700, 320), false);
      assert.equal(resolveSheetSnap(true, -80, -700, 320), true);
      assert.equal(shouldResizeSheet(false, 50, 0, -30), true);
      assert.equal(shouldResizeSheet(true, 50, 0, 30), false);
      assert.equal(shouldResizeSheet(true, 0, 0, 30), true);
      assert.equal(shouldResizeSheet(true, 0, 0, -30), false);
      assert.equal(shouldResizeSheet(false, 0, 50, -20), false);
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
      const count = audio.plays; releaseVideo(); assert.equal(audio.plays,count);
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
      console.log("✅ 面板跟手高度、快滑吸附、正文滚动边界、视频后恢复音乐与保留静音选择通过");
    `,
  },
  bundle: true, platform: "node", format: "esm", write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
