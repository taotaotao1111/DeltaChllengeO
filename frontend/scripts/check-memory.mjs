import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const result = await build({
  stdin: { resolveDir: fileURLToPath(new URL("..", import.meta.url)), contents: `
    import assert from 'node:assert/strict';
    import { existsSync, statSync } from 'node:fs';
    import { buildMemoryPosterData } from './src/components/memory/memoryPoster';
    import { getPosterLayout, layoutPosterLines, MEMORY_BACKGROUND } from './src/components/memory/cardCanvas';
    import { hezun } from './src/data/artifacts/hezun';
    import { isMobileDevice, openImagePanel } from './src/components/memory/memoryTransfer';
    import { createDecodedMemoryPreview } from './src/components/memory/memoryPreview';
    const options={date:'2026.11.11'};
    const empty=buildMemoryPosterData(hezun,[],[],options);
    assert.deepEqual(empty.stats.map(stat=>stat.count),[0,0,0]);
    assert.equal(empty.legacyLine,null); assert.deepEqual(empty.tracedGlyphs,[]);
    assert.ok(!empty.discovery.includes('宅兹中国')); // 未查看不能假称已发现。
    const messages=[{id:'a',role:'user',content:'中国是什么意思？'}, {id:'b',role:'artifact',content:'回答'}, {id:'c',role:'user',content:'中国是什么意思？'}];
    const read=buildMemoryPosterData(hezun,['hotspot-inscription','hotspot-inscription','history','chapter:who-am-i','ai:evidence:sec-climax'],messages,options);
    assert.deepEqual(read.stats.map(stat=>stat.count),[1,1,1]);
    assert.ok(read.discovery.includes('不能直接等同')); // 保留历史解释的边界。
    const art=buildMemoryPosterData(hezun,['ai:evidence:hotspot-pattern','hotspot-pattern'],[],options);
    assert.ok(art.discovery.includes('不能只凭图案确定'));
    const dates=buildMemoryPosterData(hezun,['ai:evidence:rediscovery'],[],options);
    for(const year of ['1963','1965','1975']) assert.ok(dates.discovery.includes(year));
    const returned=buildMemoryPosterData(hezun,['ai:evidence:rediscovery','ai:evidence:sec-climax'],[],options);
    assert.ok(returned.discovery.includes('西周初年')); // 按实际查看顺序，不按注册表覆盖最近发现。
    const note='长留言测试'.repeat(16);
    const personal=buildMemoryPosterData(hezun,['hotspot-form'],messages,{...options,legacyLine:note,tracedGlyphs:[null,'data:trace2',null,'data:trace4']});
    assert.equal(personal.legacyLine,note);
    assert.deepEqual(personal.tracedGlyphs.map(g=>g.char),['兹','国']);
    assert.equal(personal.subject,null); assert.ok(personal.fallbackSubject);
    // 以中文全角字宽核对长文本的几何边界；真实 Canvas 在浏览器中另作视觉核对。
    const ctx={font:'28px serif',measureText(text){const size=Number.parseFloat(this.font);return {width:[...text].length*size};}};
    for(const data of [empty,read,personal,{...personal,quote:'很长的句子'.repeat(14),discovery:'较长的发现'.repeat(28),tracedGlyphs:Array.from({length:4},(_,i)=>({char:String(i),src:'data:image'}))}]) {
      const layout=getPosterLayout(ctx,data,data.tracedGlyphs.length>0);
      assert.ok(layout.paperTop>layout.quoteBottom+50);
      assert.ok(layout.statsTop>=layout.paperTop+layout.paperHeight+40);
      assert.ok(layout.personalTop>layout.statsTop+190);
      assert.ok(layout.personalTop+layout.personalHeight<layout.height-100);
      assert.equal(layout.noteLines.join(''),data.legacyLine||'');
      assert.equal(layout.discovery.join(''),data.discovery);
    }
    assert.equal(getPosterLayout(ctx,empty,false).height,1440);
    assert.equal(layoutPosterLines(ctx,'甲乙丙丁。',70).join(''),'甲乙丙丁。');
    assert.ok(existsSync('public/'+MEMORY_BACKGROUND)); assert.ok(statSync('public/'+MEMORY_BACKGROUND).size<100000);
    const iphone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',platform:'iPhone',maxTouchPoints:5};
    assert.equal(isMobileDevice(iphone),true);
    assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 Android',platform:'Linux',maxTouchPoints:5}),true);
    assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:5}),true);
    assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:0}),false);
    assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 Windows',platform:'Win32',maxTouchPoints:10}),false);
    const image=new File(['PNG'],'memory.png',{type:'image/png'});
    let invoked=false;
    const native={...iphone,canShare:({files})=>files[0]===image,share:({files})=>{assert.equal(files[0],image);invoked=true;return Promise.resolve();}};
    const opening=openImagePanel(image,native);
    assert.equal(invoked,true); // 点击内同步调系统 API，不能等异步生成后再调用。
    assert.equal(await opening,'finished');
    assert.equal(await openImagePanel(image,{...iphone}),'unsupported');
    assert.equal(await openImagePanel(image,{...native,canShare:()=>false}),'unsupported');
    assert.equal(await openImagePanel(image,{...native,share:()=>Promise.reject({name:'AbortError'})}),'cancelled');
    assert.equal(await openImagePanel(image,{...native,share:()=>Promise.reject({name:'NotAllowedError'})}),'failed');
    assert.equal(await openImagePanel(image,{...native,share:()=>{throw {name:'AbortError'};}}),'cancelled');
    const previousImage=globalThis.Image;
    try {
      let releaseDecode=()=>{throw new Error('没有开始解码');};
      globalThis.Image=class { decode(){return new Promise(resolve=>{releaseDecode=resolve;});} };
      let exposed=false;
      const pending=createDecodedMemoryPreview(image);
      void pending.then(()=>{exposed=true;});
      await Promise.resolve(); assert.equal(exposed,false); // 不把尚未解码的图片交给可见层。
      releaseDecode(); const decodedUrl=await pending;
      assert.equal(await (await fetch(decodedUrl)).text(),'PNG'); // 成功后地址保持有效，生命周期由缓存管理。
      URL.revokeObjectURL(decodedUrl);
      let failedUrl='';
      globalThis.Image=class { set src(url){failedUrl=url;} decode(){return Promise.reject(new Error('坏图片'));} };
      await assert.rejects(createDecodedMemoryPreview(image),/坏图片/);
      await assert.rejects(fetch(failedUrl)); // 失败时及时释放，不能泄漏 blob URL。
      globalThis.Image=class { set src(url){this.url=url;queueMicrotask(()=>this.onload());} };
      const fallbackUrl=await createDecodedMemoryPreview(image); // 兼容没有 decode() 的 WebView。
      assert.equal(await (await fetch(fallbackUrl)).text(),'PNG'); URL.revokeObjectURL(fallbackUrl);
    } finally { if(previousImage===undefined) delete globalThis.Image; else globalThis.Image=previousImage; }
    console.log('✅ 记忆海报：真实计数、长文本、设备分流、分享手势、解码后展示、预览地址有效与失败释放通过');
  ` }, bundle:true,write:false,platform:'node',format:'esm',target:'node20',logLevel:'silent',
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
