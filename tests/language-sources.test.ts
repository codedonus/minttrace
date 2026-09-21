import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSourceUrls, consumerInput, normalizeSourceUrl, parsePage, sourceIdentity } from '../server/consumer.js';
import { parseReport, runAgent, type Completion } from '../server/agent.js';
import { SourceError, sourceFailure } from '../server/source-error.js';
import { applicationError, detectLocale, resultLabel, sourceFailureText } from '../src/i18n.js';
import { translate } from '../src/ui-copy.js';
import { markdownReport } from '../server/report.js';
import { initialSample } from '../server/fixtures.js';
import type { Evidence, Investigation } from '../src/types.js';
const ev=(id:string,url:string,data:Record<string,unknown>):Evidence=>({id,url,data,tool:'read_page',title:'Page',createdAt:'2026-09-17T00:00:00Z'});
const fresh=():Investigation=>({...initialSample(),input:consumerInput({flow:'message',query:'https://x.com/arc arc mainnet is online',locale:'en'}),status:'running',sampleReport:undefined,report:undefined,actions:[],evidence:[],modelCalls:0,tokenUsage:0});
const quote='Arc Mainnet is live. The Economic OS for the internet.';
const report={verdict:'matches_reference',summary:'The official account announced the launch.',findings:[{text:'The homepage links to this account; its post announces launch.',evidenceIds:['E1','E2']}],limitations:['This checks an announcement, not transaction safety.'],nextStep:'Read the cited announcement.',sourceUrl:'https://x.com/arc',sourceQuote:quote};

test('late X links survive navigation and the input link limit; failed and invented URLs do not become readable',()=>{
  const run=fresh();
  const urls=Array.from({length:20},(_,i)=>`https://x.com/nav${i}`);
  const short='https://t.co/BCNxhprAsF';
  const data=parsePage(`<html><nav><a href="${short}">Announcement</a></nav><body>${urls.map(u=>`<a href="${u}">nav</a>`).join('')}<a href="https://www.arc.io/">Website</a></body></html>`,'https://x.com/arc');
  const e=ev('E1','https://x.com/arc',{...data.data,links:[...urls.map(url=>({url})),{url:short}]});
  assert.equal(allowedSourceUrls(run.input,[e]).has(short),true);
  assert.equal(allowedSourceUrls(run.input,[e]).has(normalizeSourceUrl('https://x.com/arc#top')),true);
  assert.ok((data.data.links as {url:string}[]).some(l=>l.url===short),'nav links retained for source identity');
  assert.equal(allowedSourceUrls(run.input,[ev('E2','https://madeup.example',{error:'failed',url:'https://madeup.example'})]).has('https://madeup.example/'),false);
  assert.equal(allowedSourceUrls(run.input,[e]).has('https://unseen.example/'),false);
});

test('live official homepage links authenticate the exact X profile and its posts, never other accounts or lookalike hosts',()=>{
  const homepage=ev('E2','https://www.arc.io/',{official:true,projectId:'arc',text:'Arc homepage',links:[{url:'https://x.com/arc'}]});
  assert.equal(sourceIdentity('https://twitter.com/ARC/status/123',[homepage]),true);
  for(const url of ['https://x.com/fake_arc','https://x.com/arc_extra','https://x.com.evil.example/arc','https://x.com/arc/status/123/extra'])assert.equal(sourceIdentity(url,[homepage]),false);
  assert.equal(sourceIdentity('https://x.com/arc',[ev('E2','https://pretend.example/',{...homepage.data,official:true})]),false);
  assert.equal(sourceIdentity('https://x.com/arc/status/456',[{...homepage,data:{...homepage.data,links:[{url:'https://x.com/arc/status/123'}]}}]),false,'a quoted post is not a profile endorsement');
});

test('content proof and source identity stay separate; official cross-link proof must be cited',()=>{
  const run=fresh();
  run.evidence=[ev('E1','https://x.com/arc',{text:quote,official:false}),ev('E2','https://www.arc.io/',{text:'Arc homepage',official:true,projectId:'arc',links:[{url:'https://x.com/arc'}]})];
  const confirmed=parseReport(report,run);
  assert.equal(confirmed.verdict,'matches_reference');assert.equal(confirmed.sourceProof?.identity,'verified');
  const partial={...report,verdict:'source_supported',findings:[{text:'The supplied page contains this announcement; identity is not confirmed.',evidenceIds:['E1']}]};
  assert.equal(parseReport(partial,run).sourceProof?.identity,'unverified');
  assert.throws(()=>parseReport({...partial,verdict:'matches_reference'},run),/sourceQuote/);
  assert.throws(()=>parseReport({...partial,sourceQuote:'An invented announcement absent from the page.'},run),/sourceQuote/);
  run.input.query+=' https://unrelated-claim.example/';assert.throws(()=>parseReport(report,run),/every submitted URL/);
});

test('source errors preserve the failed URL and distinguish local rejection, HTTP, DNS and timeout without secret messages',async()=>{
  assert.equal(sourceFailure(new Error('Source returned HTTP 403.'),'https://example.com/').status,403);
  assert.equal(sourceFailure(Object.assign(new Error('secret request payload'),{code:'ENOTFOUND'})).kind,'dns');
  assert.equal(sourceFailure(new DOMException('secret','TimeoutError')).kind,'timeout');
  const run=fresh();let step=0;
  const call=(name:string,args:unknown):Completion=>({choices:[{message:{role:'assistant',tool_calls:[{id:String(step),type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
  await runAgent(run,new AbortController().signal,()=>{},{complete:async()=>++step===1?call('read_page',{url:'https://unseen.example/'}):call('finish_investigation',{...report,verdict:'unverified',findings:[{text:'A requested URL was not among the observed links.',evidenceIds:['E1']}]}),execute:async()=>{throw new SourceError({kind:'not_observed',url:'https://unseen.example/'});}});
  assert.equal(run.evidence[0].url,'https://unseen.example/');
  assert.deepEqual(run.evidence[0].data.failure,{kind:'not_observed',url:'https://unseen.example/'});
  assert.match(String(run.evidence[0].data.error),/did not send a web request/);
  assert.doesNotMatch(JSON.stringify(run.evidence),/secret/);
  assert.match(sourceFailureText({kind:'http',status:404},'zh'),/404/);
});

test('browser language defaults, generated reports, errors and exports use the selected language without translating original evidence',async()=>{
  assert.equal(detectLocale(['zh-HK','en-US']),'zh');assert.equal(detectLocale(['en-GB','zh-CN']),'en');assert.equal(detectLocale(['fr-FR']),'en');
  assert.equal(translate('重新核验','en'),'Check again');assert.match(applicationError('请粘贴要检查的内容，最多 6000 字。','en'),/6,000/);
  assert.match(resultLabel('source_supported','en'),/identity unverified/);
  const run=fresh();let step=0;
  const call=(name:string,args:unknown):Completion=>({choices:[{message:{role:'assistant',tool_calls:[{id:String(step),type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
  await runAgent(run,new AbortController().signal,()=>{},{complete:async(messages)=>{
    assert.match(messages[0].content || '',/Output language: English/);
    return ++step===1?call('read_page',{url:'https://x.com/arc',reason:'Read the supplied account.'}):call('finish_investigation',{...report,verdict:'source_supported',findings:[{text:'The source contains this announcement.',evidenceIds:['E1']}]});
  },execute:async()=>({title:'Page',url:'https://x.com/arc',data:{text:quote,official:false}})});
  assert.equal(run.status,'completed');assert.equal(run.report?.sourceProof?.quote,quote);
  const md=markdownReport(run,'en');assert.match(md,/## Findings/);assert.match(md,/identity unverified/);assert.doesNotMatch(md,/[\u4e00-\u9fff]/);
  assert.match(markdownReport(run,'zh'),/英文原文/);
});
