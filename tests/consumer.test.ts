import test from 'node:test';
import assert from 'node:assert/strict';
import { consumerInput, parseAsset, domainHit, officialProject, canConfirmNft, executeConsumer, extractUrls } from '../server/consumer.js';
import { parseReport, runAgent, type Completion } from '../server/agent.js';
import { initialSample } from '../server/fixtures.js';
import type { Investigation, Evidence } from '../src/types.js';
const address='0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7';
const url=`https://opensea.io/item/ethereum/${address}/1`;
const evidence=(id:string,tool:string,data:Record<string,unknown>,url?:string):Evidence=>({id,tool,data,title:tool,url,createdAt:new Date().toISOString()});
const fresh=(flow='purchase',query=url):Investigation=>({...initialSample(),id:'consumer-test',input:consumerInput({flow,query}),status:'running',sampleReport:undefined,actions:[],evidence:[],report:undefined,modelCalls:0,tokenUsage:0});
const report={verdict:'matches_reference',summary:'找到官方出处。',findings:[{text:'依据官方资料。',evidenceIds:['E1','E2']}],limitations:['未验证交易安全。'],nextStep:'从已确认的官方页面了解项目。'};
test('single input resolves supported asset links and rejects unsupported networks, spoofed hosts and collection homepages',()=>{
  for(const link of [url,url.replace('/item/','/assets/'),`https://etherscan.io/nft/${address}/1`,`https://etherscan.io/token/${address}?a=1`]) assert.equal(parseAsset(link).tokenId,'1');
  assert.throws(()=>parseAsset(url.replace('ethereum','base')),/其他链/);
  assert.throws(()=>parseAsset(url.replace('opensea.io','opensea.io.evil.com')),/目前支持/);
  assert.throws(()=>parseAsset('https://opensea.io/collection/lootproject'),/单件/);
  assert.throws(()=>parseAsset(url.replace('/1',`/${2n**256n}`)),/完整/);
  assert.equal(consumerInput({flow:'purchase',query:url,referenceAddress:'0xevil',sourceUrl:'https://evil.example'}).sourceUrl,'');
  assert.equal(consumerInput({flow:'message',query:'Orbio 活动消息'}).flow,'message');
});
test('domain lookups respect DNS label boundaries; only exact configured HTTPS hosts qualify as official',()=>{
  const domains=new Set(['evil.example']);
  assert.equal(domainHit('claim.evil.example',domains),'evil.example');
  assert.equal(domainHit('notevil.example',domains),undefined);
  assert.equal(domainHit('evil.example.good.example',domains),undefined);
  assert.equal(officialProject('https://sellers.orbio.so/build')?.id,'orbio');
  for(const u of ['http://sellers.orbio.so/build','https://sellers.orbio.so.evil.example','https://sellers.orbio.so@evil.example','https://sellers.orbio.so:444/build']) assert.equal(officialProject(u),undefined);
  assert.deepEqual(extractUrls('https://example.com/，这里 https://x.com/。'),['https://example.com/','https://x.com/']);
  assert.deepEqual(extractUrls('MINT [https://nikentfs.xyz](https://nikentfs.xyz) 网站 https://other.example/'),['https://nikentfs.xyz','https://other.example/']);
});
test('NFT positive result requires the real item plus independently read official address, and must cite that proof',()=>{
  const run=fresh();
  run.evidence=[evidence('E1','inspect_nft',{address,codePresent:true,tokenExists:true}),evidence('E2','read_page',{official:true,projectId:'loot',addresses:[address]},'https://www.lootproject.com/')];
  assert.equal(canConfirmNft(run.input,run.evidence),true);
  assert.equal(parseReport(report,run).verdict,'matches_reference');
  assert.throws(()=>parseReport({...report,findings:[{text:'自报名称一致。',evidenceIds:['E1']}]},run),/confirmation requires/);
  run.evidence[0].data.tokenExists=false;
  assert.throws(()=>parseReport(report,run),/confirmation requires/);
  run.evidence[0].data.tokenExists=true;run.evidence[1].url='https://unknown.example/';
  assert.throws(()=>parseReport(report,run),/confirmation requires/);
});
test('activity requires a quoted cited source and exact destination support, rejecting invented quotes',()=>{
  const u='https://sellers.orbio.so/build',run=fresh('message',`Orbio 活动 ${u}`);
  run.evidence=[evidence('E1','check_domains',{checks:[{matched:null}]}),evidence('E2','read_page',{official:true,projectId:'orbio',text:'Build anything. $50 of inference on us.',links:[]},u)];
  assert.throws(()=>parseReport(report,run),/sourceQuote/);
  const r={...report,sourceUrl:u,sourceQuote:'Build anything. $50 of inference on us.'};
  assert.equal(parseReport(r,run).verdict,'matches_reference');
  assert.throws(()=>parseReport({...r,sourceQuote:'Imaginary official announcement that does not exist.'},run),/sourceQuote/);
  run.input.query='Orbio https://claim-orbio.example/';
  assert.throws(()=>parseReport(r,run),/every submitted URL/);
});
test('a blacklist hit supports a risk finding, but a miss never proves an activity legitimate',()=>{
  const run=fresh('message','https://evil.example/');run.evidence=[evidence('E1','check_domains',{checks:[{matched:'evil.example'}]})];
  const r={...report,verdict:'conflict_found',findings:[{text:'命中记录。',evidenceIds:['E1']}]};
  assert.equal(parseReport(r,run).verdict,'conflict_found');
  run.evidence[0].data.checks=[{matched:null}];assert.throws(()=>parseReport(r,run),/sourceQuote/);
  assert.throws(()=>parseReport({...r,verdict:'matches_reference'},run),/sourceQuote/);
});
test('agent cannot invent a page URL or spend duplicate reads; evidence-driven follow-up is preserved',async()=>{
  const run=fresh('message','Orbio https://sellers.orbio.so/build');
  await assert.rejects(()=>executeConsumer(run.input,'read_page',{url:'https://invented.example'},new AbortController().signal,[]),/Source URL must/);
  let turn=0,reads=0;
  const call=(name:string,args:unknown):Completion=>({choices:[{message:{role:'assistant',tool_calls:[{id:String(turn),type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
  await runAgent(run,new AbortController().signal,()=>{}, {
    complete:async()=>{turn++;return turn<=2?call('check_domains',{reason:turn===1?'核对域名':'重复读取'}):call('finish_investigation',{...report,verdict:'unverified',findings:[{text:'尚未找到官方对应公告。',evidenceIds:['E1']}]});},
    execute:async()=>{reads++;return {title:'域名',data:{checks:[]}};}
  });
  assert.equal(reads,1);assert.equal(run.report?.verdict,'unverified');assert.equal(run.status,'completed');
});

test('first model timeout is identified before any tools run, without fabricating evidence or verdict', async()=>{
  const run=fresh('message','Arc主网上线了！');
  await runAgent(run,new AbortController().signal,()=>{}, {complete:async()=>{throw new DOMException('The operation timed out.','TimeoutError');}});
  assert.equal(run.status,'failed');
  assert.deepEqual(run.failure,{kind:'model_timeout',timeoutMs:90_000});
  assert.equal(run.modelCalls,0);assert.equal(run.actions.length,0);assert.equal(run.evidence.length,0);assert.equal(run.report,undefined);
  const {failureFeedback}=await import('../src/run-feedback.js');
  assert.equal(failureFeedback(run).title,'模型响应超时');
  assert.match(failureFeedback(run).description,/90 秒/);
  assert.match(failureFeedback(run).description,/尚未取得/);
});

test('legacy timeout records show the actual cause; later failures retain evidence; cancellation stays separate', async()=>{
  const {failureFeedback}=await import('../src/run-feedback.js');
  const run=fresh('message','Arc主网上线了！');run.status='failed';run.error='The request timed out. Try again or check the source.';
  assert.equal(failureFeedback(run).title,'模型响应超时');
  run.failure={kind:'model_timeout',timeoutMs:90_000};run.modelCalls=1;run.evidence=[evidence('E1','find_official_sources',{sources:[]})];
  assert.match(failureFeedback(run).description,/已保留 1 条资料/);
  assert.doesNotMatch(failureFeedback(run).description,/第一次/);
  run.status='stopped';assert.equal(failureFeedback(run).title,'核验已停止');
  run.status='failed';run.failure={kind:'model_unavailable',httpStatus:429};run.error='Bearer secret-do-not-show';
  assert.match(failureFeedback(run).description,/HTTP 429/);assert.doesNotMatch(failureFeedback(run).description,/secret-do-not-show/);
});

test('uncovered projects are an evidence limitation rather than a model service failure',async()=>{
  const {hasCoverageGap}=await import('../src/run-feedback.js');
  const run=fresh('message','UnknownProject主网上线了！');let calls=0;
  const call=(name:string,args:unknown):Completion=>({choices:[{message:{role:'assistant',tool_calls:[{id:String(calls),type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
  await runAgent(run,new AbortController().signal,()=>{}, {
    complete:async()=>++calls===1?call('find_official_sources',{project:'UnknownProject',reason:'查找官方来源。'}):call('finish_investigation',{...report,verdict:'unverified',summary:'目前还不能核实这条消息。',findings:[{text:'目前的官方来源目录尚未覆盖 UnknownProject。',evidenceIds:['E1']}]}),
    execute:async(input,name,args,signal)=>executeConsumer(input,name,args,signal,run.evidence),
  });
  assert.equal(run.status,'completed');assert.equal(run.report?.verdict,'unverified');assert.equal(run.failure,undefined);assert.equal(hasCoverageGap(run),true);assert.equal(run.evidence[0].tool,'find_official_sources');
});
