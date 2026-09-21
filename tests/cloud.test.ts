import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createCloudApi } from '../server/cloud.js';
import { runAgent, type Completion } from '../server/agent.js';
import { consumeRunStream, readBrowserRuns, saveBrowserRuns } from '../src/browser-runs.js';
import { markdownReport } from '../src/report.js';
import type { Investigation } from '../src/types.js';

async function serve(options: Parameters<typeof createCloudApi>[0]) {
  const server=createCloudApi(options).listen(0,'127.0.0.1');
  await once(server,'listening');
  return {base:`http://127.0.0.1:${(server.address() as AddressInfo).port}`,close:()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})};
}
const input={flow:'message',query:'Orbio Build Week https://sellers.orbio.so/build',locale:'en'};
const post=(base:string,body:unknown=input,signal?:AbortSignal)=>fetch(`${base}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
const call=(name:string,args:unknown):Completion=>({choices:[{message:{role:'assistant',tool_calls:[{id:name,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
const investigate:typeof runAgent=(run,signal,save)=>runAgent(run,signal,save,{
  complete:async messages=>messages.some(m=>m.role==='tool')
    ?call('finish_investigation',{verdict:'unverified',summary:'Synthetic cloud transport test; not a live check.',findings:[{text:'Only fixture evidence was read.',evidenceIds:['E1']}],limitations:['Fixture data cannot verify a real announcement.'],nextStep:'Run a live check to collect current evidence.'})
    :call('read_page',{url:'https://sellers.orbio.so/build',reason:'Read fixture evidence.'}),
  execute:async()=>({title:'Synthetic fixture',url:'https://sellers.orbio.so/build',data:{text:'Synthetic fixture only.'}}),
});

test('cloud request streams actual agent steps and a final report, without exposing a shared history',async()=>{
  const server=await serve({configured:true,investigate});
  try{
    const settings=await fetch(`${server.base}/api/config`).then(r=>r.json());
    assert.equal(settings.storage,'browser');assert.equal(settings.configured,true);assert.equal(settings.apiKey,undefined);
    const collect=async()=>{const snapshots:Investigation[]=[];await consumeRunStream(await post(server.base),r=>snapshots.push(r));return snapshots;};
    const [first,second]=await Promise.all([collect(),collect()]);
    assert.equal(first[0].status,'running');assert.ok(first.some(r=>r.actions[0]?.status==='running'));
    const final=first.at(-1)!;
    assert.equal(final.status,'completed');assert.equal(final.report?.verdict,'unverified');assert.equal(final.evidence.length,1);assert.equal(final.modelCalls,2);
    assert.notEqual(final.id,second.at(-1)!.id);
    assert.equal((await fetch(`${server.base}/api/runs/${final.id}`)).status,404);
    assert.equal((await fetch(`${server.base}/api/runs`)).status,404);
    assert.match(markdownReport(final,'en'),/Synthetic cloud transport test/);
  }finally{await server.close();}
});

test('invalid input, cross-site requests and missing configuration do not start inference',async()=>{
  let calls=0;
  const server=await serve({configured:true,investigate:async()=>{calls++;}});
  const missing=await serve({configured:false,investigate:async()=>{calls++;}});
  try{
    assert.equal((await post(server.base,{})).status,400);
    assert.equal((await fetch(`${server.base}/api/runs`,{method:'POST',headers:{origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify(input)})).status,403);
    assert.equal((await fetch(`${server.base}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'})).status,400);
    assert.equal((await post(missing.base)).status,503);
    assert.equal(calls,0);
    const proxy=await fetch(`${server.base}/api/config`,{headers:{origin:server.base.replace('http:','https:'),'x-forwarded-proto':'https'}});
    assert.equal(proxy.status,200,'same-origin HTTPS request behind Vercel proxy works');
  }finally{await server.close();await missing.close();}
});

test('disconnect aborts model work; a total deadline produces an explicit failed run',async()=>{
  let notifyAbort!:()=>void;
  const aborted=new Promise<void>(resolve=>{notifyAbort=resolve;});
  const waitForAbort:typeof runAgent=async(run,signal,save)=>{
    await new Promise<void>(resolve=>signal.aborted?resolve():signal.addEventListener('abort',()=>resolve(),{once:true}));
    notifyAbort();run.status='stopped';save();
  };
  const server=await serve({configured:true,investigate:waitForAbort});
  const limited=await serve({configured:true,deadlineMs:50,investigate:waitForAbort});
  try{
    const controller=new AbortController();
    const response=await post(server.base,input,controller.signal);
    await response.body!.getReader().read();controller.abort();
    await Promise.race([aborted,new Promise((_,reject)=>{const timeout=setTimeout(()=>reject(new Error('Upstream work was not cancelled')),1000);timeout.unref();})]);
    const snapshots:Investigation[]=[];
    await consumeRunStream(await post(limited.base),r=>snapshots.push(r));
    assert.equal(snapshots.at(-1)?.status,'failed');assert.equal(snapshots.at(-1)?.failure?.kind,'investigation_timeout');
  }finally{await server.close();await limited.close();}
});

test('stream handles split UTF-8 and detects incomplete runs; browser history survives refresh',async()=>{
  const server=await serve({configured:true,investigate});
  let run:Investigation;
  try{await consumeRunStream(await post(server.base),r=>{run=r;});}finally{await server.close();}
  run!.input.name='中文测试';
  const bytes=new TextEncoder().encode(JSON.stringify(run!)+'\n');
  const response=new Response(new ReadableStream({start(controller){for(const b of bytes)controller.enqueue(Uint8Array.of(b));controller.close();}}),{headers:{'content-type':'application/x-ndjson'}});
  let received:Investigation|undefined;await consumeRunStream(response,r=>{received=r;});assert.equal(received?.input.name,'中文测试');
  const running={...run!,status:'running' as const};
  await assert.rejects(consumeRunStream(new Response(JSON.stringify(running)+'\n',{headers:{'content-type':'application/x-ndjson'}}),()=>{}),/connection ended/);
  let saved='';const storage={setItem:(_key:string,value:string)=>{saved=value;},getItem:()=>saved};
  saveBrowserRuns(storage,[running]);const restored=readBrowserRuns(storage);
  assert.equal(restored[0].status,'stopped');assert.deepEqual(restored[0].evidence,running.evidence);
  assert.equal(readBrowserRuns({getItem:()=>null}).length,0,'another browser has no shared records');
});
