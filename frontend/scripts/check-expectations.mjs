import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), contents: `
    import assert from 'node:assert/strict';
    import { expectationApiUrl, getOwnExpectation, submitExpectation, deleteExpectation, ExpectationError } from './src/services/expectationService';
    const oldWindow=globalThis.window, oldFetch=globalThis.fetch;
    const calls=[]; let status=200, data={};
    globalThis.window={location:{pathname:'/s/wuyu-qiannian/admin/expectations'},setTimeout,clearTimeout};
    globalThis.fetch=async(url,options)=>{calls.push({url,options}); return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});};
    try {
      assert.equal(expectationApiUrl('expectations'),'/s/wuyu-qiannian/api/expectations');
      data={expectation:null}; assert.equal((await getOwnExpectation('hezun')).expectation,null);
      const row={id:'uuid',artifact_id:'hezun',content:'青铜神树',source:'epilogue',created_at:'2026-11-12T00:00:00Z',updated_at:'2026-11-12T00:00:00Z'};
      data={expectation:row}; assert.equal((await submitExpectation('hezun','青铜神树')).expectation.id,'uuid');
      const call=calls.at(-1); assert.equal(call.options.method,'PUT');
      assert.equal(call.options.credentials,'same-origin');
      assert.deepEqual(JSON.parse(call.options.body),{artifactId:'hezun',content:'青铜神树'});
      data={}; await assert.rejects(submitExpectation('hezun','青铜神树'),error=>error instanceof ExpectationError);
      data={expectation:{...row,content:'旧内容'}}; await assert.rejects(submitExpectation('hezun','青铜神树'));
      status=503; data={error:'服务不可用'}; await assert.rejects(submitExpectation('hezun','青铜神树'),error=>error.status===503);
      status=403; await assert.rejects(getOwnExpectation('hezun'),error=>error.status===403);
      status=200; data={ok:true}; await deleteExpectation('hezun'); assert.equal(calls.at(-1).options.method,'DELETE');
      globalThis.window.location.pathname='/'; assert.equal(expectationApiUrl('expectations'),'/api/expectations');
      console.log('✅ 期待接口：嵌套路径、账号凭证、服务器确认、响应不完整、服务故障与删除请求通过');
    } finally { globalThis.window=oldWindow; globalThis.fetch=oldFetch; }
  ` }, bundle:true,write:false,platform:'node',format:'esm',target:'node20',logLevel:'silent',
});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
