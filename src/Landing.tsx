import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp, FileSearch, Fingerprint, Globe2, Inbox, Link2, Menu, MessageSquare, Pause, Play, ScanLine, ShieldCheck, X } from 'lucide-react';
import { LanguagePicker, useLanguage } from './use-language';
import TraceScene from './TraceScene';
import './landing.css';

export default function Landing() {
  const language = useLanguage(), { pair, locale } = language;
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [stage, setStage] = useState(2);
  const [step, setStep] = useState(0);
  useEffect(() => {
    document.title=pair('MintTrace · 每条消息，都有迹可循','MintTrace · Follow the trail. Find the source.');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#101a15');
  },[locale]);
  useEffect(() => {
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const changed=()=>setReduced(media.matches);changed();media.addEventListener('change',changed);
    const elements=root.current!.querySelectorAll('[data-reveal]');
    root.current!.classList.add('reveal-ready');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12});
    elements.forEach(element=>observer.observe(element));
    return()=>{observer.disconnect();media.removeEventListener('change',changed);};
  },[]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(false);};addEventListener('keydown',escape);return()=>removeEventListener('keydown',escape);},[]);
  const steps=[
    {title:pair('从你看到的开始','Start with what you saw'),description:pair('一条消息、一个商品链接，或钱包里突然出现的 NFT。给出线索，调查就有了起点。','A message, an item link, or an NFT that appeared in your wallet. That’s the starting point.'),label:pair('读取线索','Read the lead')},
    {title:pair('顺着线索，找到出处','Follow the source trail'),description:pair('Agent 读取页面，跟进公告，核对官网与账号之间的关联，把散落的信息连起来。','The agent reads pages, follows announcements and checks links between websites and accounts.'),label:pair('核对来源','Cross-check sources')},
    {title:pair('让每个判断，都有依据','See what supports the answer'),description:pair('把结论、原文和仍未确认的部分放在一起。你能看懂判断，也能回到它的出处。','See the conclusion, original text and remaining gaps together. Every finding leads back to its evidence.'),label:pair('呈现证据','Show the evidence')},
  ];
  const scenarios=[
    {flow:'wallet',icon:Inbox,tag:'01 / THE UNEXPECTED',title:pair('这个 NFT，哪来的？','An NFT you didn’t ask for.'),text:pair('钱包里多了一个陌生藏品。先看描述与来源，弄清它想让你做什么。','Something new appeared in your wallet. Check where it came from and what it’s asking you to do.'),cta:pair('核对陌生 NFT','Check an unfamiliar NFT'),art:'wallet'},
    {flow:'purchase',icon:Fingerprint,tag:'02 / THE ALMOST REAL',title:pair('喜欢之前，先认清。','The right art. The right source?'),text:pair('名字和图片很像，还不够。购买前，核对这个 NFT 与官方系列的关系。','A familiar name or image is only a start. Check the item’s connection to the official collection.'),cta:pair('查看藏品出处','Check an NFT’s source'),art:'purchase'},
    {flow:'message',icon:MessageSquare,tag:'03 / THE TOO GOOD',title:pair('群里都在转，是真的吗？','Everyone’s sharing it. Is it real?'),text:pair('上线公告、白名单、空投消息。把原文贴过来，看看消息能否对上出处。','A launch, an allowlist, an airdrop. Bring the original message and see whether the source backs it up.'),cta:pair('核验一条消息','Check a message'),art:'message'},
  ];
  return <div ref={root} className={`landing ${paused||reduced?'motion-paused':''}`}>
    <a className="skip" href="#landing-main">{pair('跳到主要内容','Skip to main content')}</a>
    <header className="lp-header lp-container">
      <a className="lp-brand" href="/" aria-label="MintTrace"><Fingerprint size={29} strokeWidth={1.65} aria-hidden="true"/>MintTrace</a>
      <nav className="lp-desktop-nav" aria-label={pair('主导航','Main navigation')}><a href="#use-cases">{pair('使用场景','Use cases')}</a><a href="#how-it-works">{pair('如何核验','How it works')}</a><a href="#questions">{pair('常见问题','Good to know')}</a></nav>
      <div className="lp-nav-actions"><LanguagePicker {...language}/><a href="/app" className="lp-nav-launch">{pair('打开应用','Launch app')}<ArrowUpRight size={15} aria-hidden="true"/></a><button className="lp-menu-button" aria-label={pair(menu?'关闭菜单':'打开菜单',menu?'Close menu':'Open menu')} aria-expanded={menu} aria-controls="landing-menu" onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button></div>
      {menu&&<nav id="landing-menu" className="lp-mobile-nav" aria-label={pair('移动导航','Mobile navigation')} onClick={()=>setMenu(false)}><a href="#use-cases">{pair('使用场景','Use cases')}</a><a href="#how-it-works">{pair('如何核验','How it works')}</a><a href="#questions">{pair('常见问题','Good to know')}</a><a href="/app">{pair('打开应用','Launch app')}<ArrowUpRight size={17}/></a></nav>}
    </header>
    <main id="landing-main">
      <section className="lp-hero lp-container">
        <div className="lp-hero-copy">
          <p className="lp-kicker"><span className="lp-status-dot"/>{pair('信任，从出处开始','TRUST STARTS AT THE SOURCE')}</p>
          <h1>{pair('每条消息，','Follow the trail.')}<br/><em>{pair('都有迹可循。','Find the source.')}</em></h1>
          <p className="lp-intro">{pair('从一枚陌生 NFT，到一条刷屏的消息。让 AI Agent 追踪公开出处，把判断的依据交到你手里。','From an unexpected NFT to a message everyone’s sharing. An AI agent follows public sources and puts the evidence in your hands.')}</p>
          <div className="lp-hero-actions"><a className="lp-button" href="/app">{pair('开始追踪线索','Start a source check')}<ArrowUpRight size={20} aria-hidden="true"/></a><a className="lp-text-link" href="#how-it-works">{pair('看它如何调查','See how it works')}<ArrowDown size={16} aria-hidden="true"/></a></div>
          <div className="lp-reassurance"><ShieldCheck size={16} aria-hidden="true"/><span>{pair('无需连接钱包','No wallet connection')}</span><i/><span>{pair('每条判断，可溯源','Evidence you can follow')}</span></div>
        </div>
        <figure className={`lp-scene stage-${stage}`} aria-label={pair('流程示意：从消息线索追踪到原始出处，再形成带引用的判断。','Illustration: trace a message to its original source, then form a cited assessment.')}>
          <div className="lp-scene-top"><span><span className="lp-tiny-cross">+</span> {pair('调查过程示意','A TRACE, ILLUSTRATED')}</span><button onClick={()=>setPaused(!paused)} disabled={reduced} aria-label={pair(paused?'播放动画':'暂停动画',paused?'Play animation':'Pause animation')} aria-pressed={paused||reduced}>{paused||reduced?<Play size={13} aria-hidden="true"/>:<Pause size={13} aria-hidden="true"/>}{reduced?pair('静态','STATIC'):paused?pair('播放','PLAY'):pair('暂停','PAUSE')}</button></div>
          <TraceScene paused={paused||reduced}/>
          <div className="lp-fingerprint"><Fingerprint size={136} strokeWidth={.7} aria-hidden="true"/><span>MINTTRACE</span></div>
          <div className="lp-orbit-label lp-coordinate-one">ORIGIN / 001</div><div className="lp-orbit-label lp-coordinate-two">EVIDENCE / 003</div>
          <div className="lp-signal-card"><span className="lp-signal-icon"><MessageSquare size={17} aria-hidden="true"/></span><div><small>{pair('你看到的消息','THE MESSAGE')}</small><strong>{pair('“新活动开始了？”','“A new drop just launched?”')}</strong></div><span className="lp-card-dot"/></div>
          <div className="lp-source-card"><div className="lp-source-card-top"><Globe2 size={15} aria-hidden="true"/><span>{pair('追踪原始出处','FOLLOWING THE SOURCE')}</span><ArrowUpRight size={13} aria-hidden="true"/></div><div className="lp-source-lines"><i/><i/><i/></div><div className="lp-source-state">{stage===2?<Check size={14}/>:<ScanLine size={14}/>}<span>{stage===2?pair('原文与引用，连在一起','SOURCE + CITATION, CONNECTED'):pair('从线索继续调查','FOLLOW THE NEXT LEAD')}</span></div></div>
          <figcaption className="lp-scene-steps">{steps.map((s,i)=><button key={i} onClick={()=>setStage(i)} aria-pressed={stage===i}><span>0{i+1}</span>{s.label}<i/></button>)}</figcaption>
        </figure>
      </section>
      <div className="lp-source-strip lp-container"><p>{pair('把公开信息，连成证据','PUBLIC INFORMATION. CONNECTED.')}</p><div><span><Globe2 size={18}/> {pair('官方网站','Official websites')}</span><span><Link2 size={18}/> {pair('公告与社交渠道','Announcements')}</span><span className="lp-ethereum">◇ Ethereum</span><span>Blockscout <ArrowUpRight size={12}/></span></div></div>
      <section id="use-cases" className="lp-cases lp-container">
        <div className="lp-section-heading" data-reveal><div><p className="lp-kicker">01 — {pair('从你的疑问开始','START WITH A QUESTION')}</p><h2>{pair('犹豫的那一刻，','That moment of doubt.')}<br/><em>{pair('先查一查。','Make it a starting point.')}</em></h2></div><p>{pair('不用研究合约，也不用先找到官网。把你看到的交给 MintTrace。','No need to understand contracts or find the official site first. Bring what you saw to MintTrace.')}</p></div>
        <div className="lp-case-grid">{scenarios.map((s,i)=><a href={`/app?flow=${s.flow}`} className={`lp-case lp-case-${s.art}`} key={s.flow} data-reveal style={{'--reveal-delay':`${i*80}ms`} as CSSProperties}><div className="lp-case-top"><span>{s.tag}</span><ArrowUpRight size={22} aria-hidden="true"/></div><div className={`lp-case-art art-${s.art}`} aria-hidden="true">{s.art==='wallet'?<><div className="lp-mini-nft nft-back"><Fingerprint/></div><div className="lp-mini-nft nft-front"><span>?</span><small>UNKNOWN ORIGIN</small></div><i className="lp-art-orbit"/></>:s.art==='purchase'?<><div className="lp-art-print"><Fingerprint size={100} strokeWidth={.6}/></div><div className="lp-art-scan"/><span className="lp-art-bracket bracket-left"/><span className="lp-art-bracket bracket-right"/></>:<><div className="lp-chat chat-back"><i/><i/></div><div className="lp-chat chat-front"><MessageSquare size={19}/><i/><CircleHelp size={17}/></div><span className="lp-chat-thread"/></>}</div><s.icon size={20} className="lp-case-icon" aria-hidden="true"/><h3>{s.title}</h3><p>{s.text}</p><span className="lp-case-cta">{s.cta}<ArrowRight size={17} aria-hidden="true"/></span></a>)}</div>
      </section>
      <section id="how-it-works" className="lp-process">
        <div className="lp-container lp-process-grid">
          <div data-reveal><p className="lp-kicker">02 — {pair('看得见的调查','AN INVESTIGATION YOU CAN FOLLOW')}</p><h2>{pair('结论背后，','Behind every finding,')}<br/><em>{pair('依据都在。','a trail of evidence.')}</em></h2><div className="lp-process-steps">{steps.map((s,i)=><button key={i} className={step===i?'active':''} aria-pressed={step===i} onClick={()=>setStep(i)}><span className="lp-step-number">0{i+1}</span><div><h3>{s.title}</h3><p>{s.description}</p></div><ArrowRight size={18} aria-hidden="true"/></button>)}</div></div>
          <div className="lp-report-stage" data-reveal>
            <div className="lp-report-stage-label"><span>MINTTRACE / FIELD NOTES</span><span>{pair('报告示意','ILLUSTRATIVE REPORT')}</span></div>
            <div className={`lp-paper step-${step}`}>
              <div className="lp-paper-header"><Fingerprint size={22} aria-hidden="true"/><strong>MintTrace</strong><span>CASE / 001</span></div>
              <div className={`lp-paper-input ${step===0?'emphasized':''}`}><MessageSquare size={15} aria-hidden="true"/><span>{pair('这条活动公告，真的是官方发的吗？','Did the project actually announce this?')}</span></div>
              <div className="lp-paper-verdict"><span><Check size={16} aria-hidden="true"/>{pair('找到对应的原始公告','Original announcement found')}</span><h3>{pair('有出处，','A source.')}<br/>{pair('也有据可查。','And the evidence to match.')}</h3></div>
              <div className={`lp-paper-evidence ${step===1?'emphasized':''}`}><span>E1</span><div><strong>{pair('官网 → 官方账号','Website → official account')}</strong><p>{pair('官网公开链接指向同一个发布账号。','The website links to the same publishing account.')}</p></div><Link2 size={17} aria-hidden="true"/></div>
              <div className={`lp-paper-evidence ${step===2?'emphasized':''}`}><span>E2</span><div><strong>{pair('官方账号 → 公告原文','Official account → announcement')}</strong><p>{pair('原文、发布时间与这条消息逐一对应。','The original text and publication date support the message.')}</p></div><FileSearch size={17} aria-hidden="true"/></div>
              <div className="lp-paper-note"><CircleHelp size={15} aria-hidden="true"/><p>{pair('已确认来源。交易安全与个人领取资格不在本次核验范围。','Source confirmed. Transaction safety and personal eligibility are outside this check.')}</p></div>
              <div className="lp-paper-bottom"><span>TRACEABLE BY DESIGN</span><span>01 — 02</span></div>
            </div>
            <p className="lp-report-caption"><Link2 size={16} aria-hidden="true"/>{pair('点开任一引用，回到原始依据。','Follow any citation back to its evidence.')}</p>
          </div>
        </div>
      </section>
      <section className="lp-principles lp-container" data-reveal><span className="lp-principle-mark"><Fingerprint size={36} strokeWidth={1}/></span><h2>{pair('查清的，说清楚。','Clear about what we find.')}<br/><em>{pair('没查清的，也说清楚。','Honest about what we don’t.')}</em></h2><p>{pair('找到出处、发现冲突、证据不足，是三种不同的结果。MintTrace 把来源身份与消息内容分开核对，保留每一次调查的证据和边界。','A source match, a conflict and an evidence gap are different outcomes. MintTrace checks source identity and message content separately, keeping the evidence and the limits visible.')}</p><div className="lp-outcomes"><span><Check size={15}/>{pair('找到出处','Source confirmed')}</span><span><ScanLine size={15}/>{pair('发现冲突','Conflict found')}</span><span><CircleHelp size={15}/>{pair('仍待核实','Still unverified')}</span></div></section>
      <section id="questions" className="lp-faq lp-container" data-reveal><div><p className="lp-kicker">03 — {pair('开始之前','GOOD TO KNOW')}</p><h2>{pair('还有些事，','A little more')}<br/><em>{pair('值得说清楚。','before you begin.')}</em></h2></div><div className="lp-faq-list">{[
        [pair('需要连接钱包吗？','Do I need to connect my wallet?'),pair('不需要。粘贴公开钱包地址、单件 NFT 链接或原始消息即可。MintTrace 不要求钱包签名。','No. Paste a public wallet address, an NFT item link or the original message. MintTrace does not request wallet signatures.')],
        [pair('现在可以核验哪些内容？','What can it check today?'),pair('NFT 与钱包查询支持 Ethereum，单件资产链接支持 OpenSea 和 Etherscan。消息可以跟进已发现的链接；独立核对的官方入口目前包括 Arc、Loot、Nouns、Pudgy Penguins、Uniswap 和 Orbio。尚未接入全网搜索，其他来源可能无法确认身份。','NFT and wallet checks support Ethereum, including item links from OpenSea and Etherscan. Message checks follow observed links; the independently checked directory includes Arc, Loot, Nouns, Pudgy Penguins, Uniswap and Orbio. General web search is not connected, so other sources may remain unverified.')],
        [pair('找到官方出处，就可以放心交易吗？','Does an official source make a transaction safe?'),pair('来源核验回答的是“这条消息或这个藏品从哪里来”。它不检查交易签名、钱包授权、个人领取资格，也不提供购买建议。','Source checks establish where a message or item came from. They do not inspect transaction signatures, wallet approvals or personal eligibility, and do not provide buying advice.')],
        [pair('为什么有时会显示“无法确认”？','Why might a check be inconclusive?'),pair('有些页面需要登录、暂时无法访问，或还缺少能交叉核对的官方资料。报告会保留已找到的线索，并说明缺了什么；无法确认不等于发现诈骗。','Some pages require sign-in, cannot be reached, or lack an official source to cross-check. The report keeps the leads it found and explains the gaps. An inconclusive check does not mean a scam was found.')],
      ].map(([question,answer],i)=><details key={i}><summary>{question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-final lp-container" data-reveal><div className="lp-final-rings" aria-hidden="true"/><p className="lp-kicker">YOUR NEXT CLICK, WITH CONTEXT.</p><h2>{pair('先找到出处。','Find the source.')}<br/><em>{pair('再做下一步。','Then make your next move.')}</em></h2><a href="/app" className="lp-button">{pair('打开 MintTrace','Open MintTrace')}<ArrowUpRight size={20} aria-hidden="true"/></a><span className="lp-final-note">{pair('一条线索，就是起点。','One lead is all it takes to begin.')}</span></section>
    </main>
    <footer className="lp-footer lp-container"><a className="lp-brand" href="/" aria-label="MintTrace"><Fingerprint size={25} aria-hidden="true"/>MintTrace</a><span>{pair('有依据，再决定。','Evidence before decisions.')}</span><a className="lp-orbio" href="https://sellers.orbio.so/build" target="_blank" rel="noopener noreferrer">Built for <b>Orbio</b> Build Week <ArrowUpRight size={13} aria-hidden="true"/></a><span className="lp-footer-year">© {new Date().getFullYear()} MintTrace</span></footer>
  </div>;
}
