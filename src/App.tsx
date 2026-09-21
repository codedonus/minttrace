import { LanguagePicker, useLanguage } from './use-language';
import { applicationError, evidenceTitle, resultLabel, sourceFailureText, type SourceFailure } from './i18n';
import { translate } from './ui-copy';
import { failureFeedback, hasCoverageGap } from './run-feedback';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { consumeRunStream, readBrowserRuns, saveBrowserRuns } from './browser-runs';
import { markdownReport } from './report';
import { ArrowUpRight, ArrowRight, ArrowLeft, Check, CircleHelp, Copy, Download, FileSearch, Fingerprint, History, Inbox, Link2, LoaderCircle, Search, ShieldCheck, Square, X, AlertTriangle } from 'lucide-react';
import type { Flow, Investigation, PublicConfig, WalletPage, Evidence } from './types';

const makeFlows = (t: (key: string) => string) => ({
  wallet: { title: t("收到陌生 NFT"), sub: t("突然出现在钱包里，要管吗？"), icon: Inbox, label: t("钱包公开地址，或 NFT 链接"), placeholder: t("粘贴 0x 开头的钱包地址，或单件 NFT 的链接"), helper: t("先列出钱包中的 NFT，由你选出不认识的那一个。不用连接钱包。") },
  purchase: { title: t("购买前查出处"), sub: t("这个藏品，真是那个系列的吗？"), icon: Fingerprint, label: t("NFT 商品链接"), placeholder: t("粘贴 OpenSea 或 Etherscan 的单件 NFT 链接"), helper: t("我们从链接读取藏品信息，再独立核对官方出处。你不需要知道合约是什么。") },
  message: { title: t("核验活动消息"), sub: t("空投、白名单、奖励，是真的吗？"), icon: FileSearch, label: t("收到的原始消息或链接"), placeholder: t("把群聊、私信或邮件里的活动内容粘贴到这里，保留其中的链接…"), helper: t("最好保留项目名字、活动时间和领取链接，方便逐条核对。") },
});
const loot = 'https://opensea.io/assets/ethereum/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/1';
async function api<T>(url:string, options?: RequestInit): Promise<T> {
  const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options?.headers}});
  const data=await res.json(); if(!res.ok) throw new Error(data.error || 'The request could not be processed.'); return data;
}

const short=(s:string)=>s.length>36 ? `${s.slice(0,18)}…${s.slice(-10)}` : s;
function sourceLink(e:Evidence, run?:Investigation) {
  if(!e.url) return false;
  try { const u=new URL(e.url); return u.protocol==='https:' && (e.data.official===true || (run?.report?.sourceProof?.identity==='verified' && run.report.sourceProof.url===e.url) || ['etherscan.io','github.com'].includes(u.hostname)); } catch{return false;}
}

export default function App() {
  const language = useLanguage();
  const { locale, pair } = language;
  const t=(key:string)=>translate(key,locale);
  const flows=makeFlows(t);
  const labels={matches_reference:resultLabel('matches_reference',locale),source_supported:resultLabel('source_supported',locale),conflict_found:resultLabel('conflict_found',locale),unverified:resultLabel('unverified',locale)};
  const date=(s:string)=>new Date(s).toLocaleString(locale==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  useEffect(()=>{document.title=pair('MintTrace · 核验工作台','MintTrace · Source checker');document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#f6f5f2');},[locale]);
  const [flow,setFlow]=useState<Flow>(()=>{const f=new URLSearchParams(location.search).get('flow');return f==='wallet'||f==='purchase'?f:'message';});
  const [query,setQuery]=useState('');
  const [runs,setRuns]=useState<Investigation[]>([]);
  const [config,setConfig]=useState<PublicConfig>();
  const streaming=useRef<AbortController|null>(null);
  const cloud=config?.storage==='browser';
  const [selected,setSelected]=useState<string|null>(new URLSearchParams(location.search).get('case'));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [wallet,setWallet]=useState<WalletPage|null>(null);
  const [showHistory,setShowHistory]=useState(false);
  const [openEvidence,setOpenEvidence]=useState<string|null>(null);
  const run=runs.find(r=>r.id===selected);
  const failure = run ? failureFeedback(run,locale) : null;
  const active=runs.find(r=>r.status==='running');
  async function refresh(){setRuns(await api<Investigation[]>('/api/runs'));}
  useEffect(()=>{
    let mounted=true;
    void (async()=>{
      try {
        const settings=await api<PublicConfig>('/api/config');
        let history:Investigation[]=[];
        if(settings.storage==='browser'){
          try{history=readBrowserRuns(localStorage);}catch{if(mounted)setError(pair('浏览器无法读取历史记录，仍可开始新核验并下载报告。','Browser history could not be read. You can still start a new check and download its report.'));}
        }else history=await api<Investigation[]>('/api/runs');
        if(mounted){setRuns(history);setConfig(settings);}
      }catch(e){if(mounted)setError((e as Error).message);}
    })();
    return()=>{mounted=false;streaming.current?.abort();};
  },[]);
  useEffect(()=>{
    if(!cloud)return;
    try{saveBrowserRuns(localStorage,runs);}catch{setError(pair('浏览器未能保存记录，请下载报告留存。','Your browser could not save this history. Download the report to keep it.'));}
  },[cloud,runs]);
  useEffect(()=>{if(!active||cloud)return; const timer=setInterval(()=>void refresh().catch(e=>setError(e.message)),1800);return()=>clearInterval(timer);},[active?.id,cloud]);
  useEffect(()=>{const handler=()=>setSelected(new URLSearchParams(location.search).get('case'));addEventListener('popstate',handler);return()=>removeEventListener('popstate',handler);},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
  function navigate(id:string|null){setSelected(id);setError('');setOpenEvidence(null);history.pushState({},'',id?`/app?case=${id}`:'/app');window.scrollTo({top:0,behavior:'instant'});}
  function choose(f:Flow){setFlow(f);setQuery('');setWallet(null);setError('');}
  async function start(body:Record<string,unknown>){
    if(streaming.current)return;
    setBusy(true);setError('');
    let latest:Investigation|undefined;
    const controller=new AbortController();
    if(cloud)streaming.current=controller;
    const receive=(r:Investigation)=>{
      const first=!latest;latest=r;
      setRuns(prev=>[r,...prev.filter(item=>item.id!==r.id)]);
      if(first){navigate(r.id);setBusy(false);}
    };
    try{
      const previous=typeof body.previousId==='string'?runs.find(r=>r.id===body.previousId):undefined;
      const input=cloud&&previous?previous.input:body;
      const response=await fetch('/api/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,locale}),signal:controller.signal});
      if(cloud)await consumeRunStream(response,receive);
      else{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'The request could not be processed.');
        receive(data);
      }
    }catch(e){
      if(latest?.status==='running'){
        const message=controller.signal.aborted?'Stopped. Evidence already collected is still available.':pair('连接中断，已获得的资料仍然保留。请重新核验。','The connection was interrupted. Collected evidence is kept. Start a new check.');
        receive({...latest,status:controller.signal.aborted?'stopped':'failed',error:message,finishedAt:new Date().toISOString(),actions:latest.actions.map(a=>a.status==='running'?{...a,status:'error',error:message}:a)});
      }
      if(!controller.signal.aborted)setError((e as Error).message);
    }finally{streaming.current=null;setBusy(false);}
  }
  async function listWallet(more=false){
    setBusy(true);setError('');
    try{const address=more?wallet!.address:query.trim();const w=await api<WalletPage>(`/api/wallet?address=${encodeURIComponent(address)}${more&&wallet?.cursor?`&cursor=${encodeURIComponent(wallet.cursor)}`:''}`);setWallet(more?{...w,items:[...wallet!.items,...w.items].filter((x,i,a)=>a.findIndex(v=>v.address===x.address&&v.tokenId===x.tokenId)===i)}:w);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function submit(e:FormEvent){e.preventDefault();if(flow==='wallet'&&!query.trim().startsWith('http'))void listWallet();else void start({flow,query});}
  async function stop(){if(!run)return;if(cloud){streaming.current?.abort();return;}setBusy(true);try{await api(`/api/runs/${run.id}/stop`,{method:'POST'});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function copy(){if(!run?.report)return;try{await navigator.clipboard.writeText([`MintTrace · ${labels[run.report.verdict]}`,`${pair('核验于','Checked')} ${date(run.createdAt)}`,run.report.summary,...run.report.findings.map(f=>`• ${f.text} [${f.evidenceIds.join(', ')}]`),`${pair('下一步：','Next step: ')}${run.report.nextStep}`,...run.report.limitations, ...run.evidence.filter(e=>sourceLink(e,run)).map(e=>`${e.id}: ${e.url}`)].join('\n'));setToast(t("已复制核验摘要"));}catch{setError(t("复制失败，可以下载报告保存。"));}}
  function download(){
    if(!run)return;
    const url=URL.createObjectURL(new Blob([markdownReport(run,locale)],{type:'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`minttrace-${run.id.slice(0,8)}.md`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const recent=runs.filter(r=>r.input.flow);
  return <div className="app-shell">
    <a className="skip" href="#main">{t("跳到主要内容")}</a>
    <header className="topbar">
      <a className="brand" href="/" aria-label={t("MintTrace 首页")}><span className="brand-icon"><Fingerprint aria-hidden="true" size={23}/></span>MintTrace<span className="beta">BETA</span></a>
      <div className="top-actions"><LanguagePicker {...language}/><span className="top-caption">{t("每一次核验，都有出处。")}</span><button className="text-button" onClick={()=>{navigate(null);setShowHistory(v=>!v);}}><History aria-hidden="true" size={17}/>{t("核验记录")}<span className="count">{recent.length}</span></button></div>
    </header>
    <main id="main">
      {!selected ? <>
        <section className="hero"><p className="eyebrow"><span/> {t("WEB3 来源核验助手")}</p><h1>{t("不确定，")}<em>{t("先查出处。")}</em></h1><p className="hero-sub">{t("陌生的 NFT、想买的藏品、刚收到的活动消息。")}<br/>{t("把你看到的交给我们，先查清，再决定。")}</p></section>
        <div className="workspace">
          <section className="checker" aria-label={t("发起核验")}>
            <div className="flow-picker" role="group" aria-label={t("选择场景")}>{(Object.keys(flows) as Flow[]).map((f,i)=>{const Icon=flows[f].icon;return <button key={f} className={`flow ${flow===f?'selected':''}`} aria-pressed={flow===f} onClick={()=>choose(f)} disabled={busy}><div className="flow-top"><Icon aria-hidden="true" size={22}/><span>0{i+1}</span></div><strong>{flows[f].title}</strong><small>{flows[f].sub}</small></button>;})}</div>
            <form onSubmit={submit} className="input-area">
              <div className="label-row"><label htmlFor="query">{flows[flow].label}</label><span>{t("只需要这一项")}</span></div>
              <textarea id="query" value={query} onChange={e=>{setQuery(e.target.value);setWallet(null);setError('');}} rows={flow==='message'?5:3} maxLength={6000} required placeholder={flows[flow].placeholder} aria-describedby="input-help input-error" disabled={busy}/>
              <p id="input-help" className="helper">{flows[flow].helper}</p>
              <div id="input-error" role="alert">{error&&<p className="error"><AlertTriangle aria-hidden="true" size={17}/>{applicationError(error,locale)}</p>}</div>
              {active&&<p className="notice">{t("有一项核验正在进行。")}<button type="button" onClick={()=>navigate(active.id)}>{t("查看进度")}</button></p>}
              {config&&!config.configured&&<p className="error">{t("核验服务尚未配置好，请联系产品提供者。")}</p>}
              <div className="form-bottom"><button type="button" className="text-button sample" disabled={busy} onClick={()=>{setQuery(flow==='message'?t("Orbio Build Week 活动是真的吗？https://sellers.orbio.so/build"):loot);setWallet(null);setError('');}}>{t("试填真实")}{flow==='message'?t("活动"):'NFT'}{t("链接")}<ArrowUpRight aria-hidden="true" size={15}/></button><button type="submit" className="primary" disabled={busy||!!active||!query.trim()||!config?.configured}>{busy?<LoaderCircle aria-hidden="true" className="spin" size={18}/>:<Search aria-hidden="true" size={18}/>} {busy?t("正在读取…"):flow==='wallet'&&!query.trim().startsWith('http')?t("查看钱包里的 NFT"):t("帮我查一下")}<ArrowRight aria-hidden="true" size={17}/></button></div>
            </form>
            {wallet&&<section className="wallet-results"><div className="section-title"><h2>{t("哪一个是你不认识的？")}</h2><span>{t("已读取")}{wallet.items.length} {t("件")}</span></div><p className="helper">{short(wallet.address)} {t("· Ethereum · 数据来自 Blockscout。列表不是风险名单，也不保证最新到账排在前面。")}</p>{!wallet.items.length?<p className="empty">{t("索引中没有找到 NFT。若钱包里确实有，可以直接粘贴该 NFT 的链接。")}</p>:<div className="asset-grid">{wallet.items.map(a=><button className="asset" key={`${a.address}:${a.tokenId}`} disabled={busy||!!active} onClick={()=>void start({flow:'wallet',query:a.url,walletAddress:wallet.address})}><span className="asset-icon"><Inbox aria-hidden="true" size={20}/></span><strong>{a.name==='未命名 NFT'?pair('未命名 NFT','Unnamed NFT'):a.name}</strong><small>{a.collection==='未知系列'?pair('未知系列','Unknown collection'):a.collection} · #{short(a.tokenId)}</small><p>{a.description||t("发行者没有提供可读描述。")}</p><span className="asset-action">{t("查这个 NFT")}<ArrowRight aria-hidden="true" size={16}/></span></button>)}</div>}{wallet.cursor&&<button type="button" className="secondary load-more" disabled={busy} onClick={()=>void listWallet(true)}>{busy?t("读取中…"):t("继续加载 NFT")}</button>}<small className="helper">{date(wallet.fetchedAt)} {t("读取 · NFT 名称和描述来自发行者，尚未核实。")}</small></section>}
            <div className="privacy-line"><ShieldCheck aria-hidden="true" size={16}/><span>{t("无需连接钱包，也不会要求签名。")}</span><span>{t("仅提交公开信息")}</span></div>
          </section>
          <aside className="explainer"><div className="explain-top"><span className="eyebrow">{t("我们替你做的事")}</span><Link2 aria-hidden="true" size={20}/></div><h2>{t("你给线索，")}<br/>{t("我们找依据。")}</h2><ol><li><b>{t("读懂你看到的内容")}</b><span>{t("从商品链接、NFT 描述或消息里，提取需要核实的主张。")}</span></li><li><b>{t("找原始出处")}</b><span>{t("从已收录的官方入口继续查公告，同时检查已知钓鱼记录。")}</span></li><li><b>{t("给一个有依据的下一步")}</b><span>{t("说明哪里对得上、哪里有冲突，以及哪些暂时查不清。")}</span></li></ol><div className="scope"><CircleHelp aria-hidden="true" size={18}/><p>{t("“有出处”不等于“签名安全”。")}<br/>{t("查不到时，我们会直接告诉你。")}</p></div></aside>
        </div>
        <details className="coverage"><summary>{t("现在能查什么？")}</summary><p>{t("NFT 链接支持 OpenSea、Etherscan 的 Ethereum 主网单件资产；钱包读取 Ethereum ERC-721 / ERC-1155。官方入口覆盖 Arc、Loot、Nouns、Pudgy Penguins、Uniswap、Orbio。会跟进已发现的公告链接，并核对官网指向的社交账号。尚未接入全网搜索；其他项目可能只能确认页面内容，无法确认官方身份。")}</p><p>{t("已知钓鱼记录来自 Scam Sniffer 公共数据，约有 7 天延迟。网页可能无法读取，钱包索引可能延迟。本产品核对公开出处，不检查交易、授权或个人领取资格。")}</p><p>{cloud?pair('提交的消息和 NFT 资料会发送给核验模型；钱包地址会用于查询 Blockscout。不要提交私钥、助记词或私人信息。最近记录仅保存在此浏览器中；清除浏览器数据会删除记录。','Submitted messages and NFT details are sent to the checking model; wallet addresses are queried through Blockscout. Never submit keys, seed phrases or private information. Recent reports are stored only in this browser; clearing browser data deletes them.'):t("提交的消息和 NFT 资料会发送给核验模型；钱包地址会用于查询 Blockscout。不要提交私钥、助记词或私人信息。当前预览仅供本机使用，核验记录保存在本机。")}</p></details>
        {(recent.length>0||showHistory)&&<section className="history-section"><div className="section-title"><h2>{t("最近查过的内容")}</h2><span>{t("当前设备的核验记录")}</span></div>{!recent.length?<p className="empty">{t("完成第一次核验后，记录会出现在这里。")}</p>:recent.slice(0,showHistory?recent.length:4).map(r=><button key={r.id} className="history-row" onClick={()=>navigate(r.id)}><span className="history-icon">{r.status==='running'?<LoaderCircle aria-hidden="true" className="spin" size={20}/>:<FileSearch aria-hidden="true" size={20}/>}</span><span className="history-name"><strong>{r.input.name}</strong><small>{flows[r.input.flow!].title} · {date(r.createdAt)}</small></span><span className={`history-verdict ${r.report?.verdict||''}`}>{r.status==='running'?t("正在核验"):r.report?labels[r.report.verdict]:r.status==='stopped'?t("已停止"):t("未完成")}</span><ArrowUpRight aria-hidden="true" size={19}/></button>)}</section>}
      </> : run ? <section className="report-page">
        <div className="report-top"><button className="text-button" onClick={()=>navigate(null)}><ArrowLeft aria-hidden="true" size={17}/> {t("再查一条")}</button><span>{date(run.createdAt)} · {run.input.flow?flows[run.input.flow].title:t("早期研究记录")}</span></div>
        {!run.input.flow&&<p className="notice">{t("这是改版前的合约比对记录，依赖当时由用户指定的参照，不能作为新版本的独立核验结果。")}</p>}
        <div className="submitted"><Link2 aria-hidden="true" size={17}/><span>{run.input.query||run.input.name}</span></div>
        {error&&<p role="alert" className="error">{error}</p>}
        {run.input.flow && (run.input.locale || 'zh')!==locale && <p className="notice">{pair('这份报告保留了生成时的英文原文。点击“重新核验”可生成中文新报告。','This report keeps its original Chinese text. Choose “Check again” to create a new English report.')}</p>}
        {run.status==='running'?<div className="running-panel"><span className="large-icon"><LoaderCircle aria-hidden="true" className="spin" size={30}/></span><p className="eyebrow">{t("正在核对公开来源")}</p><h1>{t("线索正在变成依据。")}</h1><p>{cloud?pair('请保持页面打开。刷新或关闭会中断核验；已获得的线索会保留在此浏览器中。','Keep this page open. Refreshing or closing interrupts the check; collected evidence stays in this browser.'):t("我们会按已有证据决定下一步。你可以留在这里，也可以稍后从记录继续查看。")}</p><div role="status" className="current-action">{run.actions.at(-1)?.reason||t("正在等待模型开始调查；尚未查询网页或链上资料。")}</div><button className="secondary" disabled={busy} onClick={()=>void stop()}><Square aria-hidden="true" size={14}/>{t("停止本次核验")}</button></div>:run.report?<>
          <div className={`verdict-panel ${run.report.verdict}`}><div className="verdict-label">{run.report.verdict==='matches_reference'?<Check aria-hidden="true" size={20}/>:run.report.verdict==='conflict_found'?<AlertTriangle aria-hidden="true" size={20}/>:<CircleHelp aria-hidden="true" size={20}/>} {labels[run.report.verdict]}</div><h1>{run.report.summary}</h1>{run.report.sourceProof&&<div className="source-proof"><div><strong>{pair('消息内容','Message content')}</strong><span>{run.report.verdict==='conflict_found'?pair('与引用内容有冲突','Conflicts with cited content'):pair('已读取对应原文','Supporting text retrieved')}</span></div><div><strong>{pair('来源身份','Source identity')}</strong><span>{run.report.sourceProof.identity==='verified'?pair('已核对官方出处','Official source cross-checked'):pair('尚未独立确认','Not independently confirmed')}</span></div><blockquote>{run.report.sourceProof.quote}</blockquote><span className="proof-url">{run.report.sourceProof.identity==='verified'?<a href={run.report.sourceProof.url} target="_blank" rel="noopener noreferrer">{run.report.sourceProof.url} <ArrowUpRight aria-hidden="true" size={12}/></a>:run.report.sourceProof.url}</span></div>}<p className="next-step"><span>{t("现在可以做的")}</span>{run.report.nextStep}</p></div>
          {hasCoverageGap(run)&&<p className="notice">{t("当前官方来源目录没有找到对应项目，也尚未接入全网搜索。这份结果不能确认该项目的官方身份。")}</p>}
          <div className="report-columns"><section><p className="eyebrow">{t("判断依据")}</p>{run.report.findings.map((f,i)=><article className="finding" key={i}><span className="finding-number">0{i+1}</span><div><p>{f.text}</p><div className="citations">{f.evidenceIds.map(id=><a href={`#evidence-${id}`} key={id} onClick={()=>setOpenEvidence(id)}>{id} <ArrowUpRight aria-hidden="true" size={12}/></a>)}</div></div></article>)}</section><aside className="limitations"><h2>{t("这次没有确认的部分")}</h2>{run.report.limitations.map((l,i)=><p key={i}>{l}</p>)}<p>{t("只核对公开出处，不代表交易安全，也不替你决定是否购买。")}</p></aside></div>
          <div className="report-actions"><button className="secondary" onClick={()=>void copy()}><Copy aria-hidden="true" size={16}/>{t("复制摘要")}</button><button className="secondary" onClick={download}><Download aria-hidden="true" size={16}/>{t("下载报告")}</button>{run.input.flow&&<button className="text-button" disabled={busy||!!active} onClick={()=>void start({previousId:run.id})}>{t("重新核验")}<ArrowRight aria-hidden="true" size={16}/></button>}</div>
        </>:<div className="running-panel"><CircleHelp aria-hidden="true" size={32}/><h1>{failure?.title}</h1><p role="status">{failure?.description}</p><button className="primary" disabled={busy||!!active} onClick={()=>void start({previousId:run.id})}>{t("重新核验")}</button></div>}
        <section className="evidence-section"><div className="section-title"><h2>{t("原始依据")}</h2><span>{run.evidence.length} {t("条 · 可追溯")}</span></div>{run.evidence.map(e=><details key={e.id} id={`evidence-${e.id}`} open={openEvidence===e.id} onToggle={event=>{if(event.currentTarget.open&&openEvidence!==e.id)setOpenEvidence(e.id);}}><summary onClick={event=>{event.preventDefault();setOpenEvidence(openEvidence===e.id?null:e.id);}}><span className="evidence-id">{e.id}</span><strong>{evidenceTitle(e,locale)}</strong><span className="evidence-time">{date(e.createdAt)}</span></summary><div className="evidence-body">{e.url&&(sourceLink(e,run)?<a href={e.url} target="_blank" rel="noopener noreferrer">{t("查看原始出处")}<ArrowUpRight aria-hidden="true" size={15}/></a>:<p className="untrusted-url">{t("待查网址（尚未确认身份）：")}{e.url}</p>)}{!!e.data.error&&<p className="error" role="status">{e.data.failure?sourceFailureText(e.data.failure as SourceFailure,locale):pair('这条历史记录没有保存失败网址和具体原因，无法追溯是哪一步失败。重新核验会记录具体原因。','This older record did not save the failed URL or its cause. A new check will record both.')}</p>}<pre>{JSON.stringify(e.data,null,2)}</pre></div></details>)}</section>
        <details className="action-log"><summary>{t("查看调查经过 ·")}{run.actions.length} {t("次行动")}</summary><ol>{run.actions.map(a=><li key={a.id}><span className={a.status==='running'?'pulse':''}>{a.status==='done'?<Check aria-hidden="true" size={16}/>:a.status==='error'?<X aria-hidden="true" size={16}/>:<LoaderCircle aria-hidden="true" className="spin" size={16}/>}</span><p>{a.reason}{a.status==='error'&&<small>{(()=>{const e=run.evidence.find(e=>e.id===a.evidenceId);return e?.data.failure?sourceFailureText(e.data.failure as SourceFailure,locale):pair('旧记录未保留具体原因；请查看对应资料或重新核验。','This older record has no specific cause. See its evidence or run a new check.');})()}</small>}</p></li>)}</ol></details>
      </section>:<section className="running-panel"><h1>{config?pair('此浏览器中没有这条记录','This report is not in this browser'):t("正在读取记录")}</h1>{error&&<p role="alert" className="error">{applicationError(error,locale)}</p>}<button className="secondary" onClick={()=>navigate(null)}>{t("返回首页")}</button></section>}
    </main>
    <footer><span className="footer-brand">MintTrace <span>·</span> {t("有依据，再决定。")}</span><span>Built for <a href="https://sellers.orbio.so/build" target="_blank" rel="noopener noreferrer">Orbio Build Week <ArrowUpRight aria-hidden="true" size={12}/></a><span className="provider-note">{config?.provider==='Orbio'?t("Orbio 推理"):t("开发测试版本")}</span></span></footer>
    {toast&&<div className="toast" role="status"><Check aria-hidden="true" size={17}/>{toast}</div>}
  </div>;
}
