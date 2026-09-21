import { verdictLabels, type Investigation, type Locale } from './types.js';
import { evidenceTitle, localize, resultLabel, sourceFailureText, type SourceFailure } from './i18n.js';

export function markdownReport(run: Investigation, locale: Locale = run.input.locale || (run.input.flow ? 'zh' : 'en')) {
  const t=(zh:string,en:string)=>localize(locale,zh,en),input=run.input;
  const lines=[`# MintTrace · ${input.name}`,'',`- ${t('状态','Status')}: ${run.status}`,`- ${t('数据','Data')}: ${input.mode==='sample'?t('合成示例','Synthetic example'):t('公开来源实时读取','Live public sources')}`,`- ${t('推理服务','Provider')}: ${run.provider} · ${run.model}`,`- ${t('开始时间','Started')}: ${run.createdAt}`];
  if(input.flow)lines.push(`- ${t('场景','Check type')}: ${{wallet:t('陌生 NFT','Unknown NFT'),purchase:t('购买前查出处','Before buying'),message:t('活动消息','Message check')}[input.flow]}`,`- ${t('用户提交','Submitted')}: ${(input.query || '').replace(/\n/g,' ')}`,`- ${t('范围','Scope')}: ${t('公开来源核验；不验证交易或签名安全','Public source check; does not establish transaction or signature safety')}`);
  else lines.push(`- Reference: ${input.referenceAddress}`,`- Candidate: ${input.candidateAddress}`,`- Token ID: ${input.tokenId}`,`- User-designated source: ${input.sourceUrl}`);
  lines.push(`- ${t('模型调用','Model calls')}: ${run.modelCalls} · ${t('已报告用量','Reported total tokens')}: ${run.tokenUsage}`,'');
  if(run.sampleReport)lines.push('**Illustrative, hand-authored walkthrough. No model was called.**','');
  if(input.flow && (input.locale || 'zh')!==locale)lines.push(t('以下保留了报告生成时的英文原文。','The report text below is preserved in its original Chinese.'),'');
  if(run.report){
    const r=run.report;
    lines.push(`## ${input.flow?resultLabel(r.verdict,locale):verdictLabels[r.verdict]}`,'',r.summary,'');
    if(r.sourceProof)lines.push(`- ${t('来源身份','Source identity')}: ${r.sourceProof.identity==='verified'?t('已核对官方出处','Official source cross-checked'):t('尚未独立确认','Not independently confirmed')}`,`- ${t('引用网址','Quoted source')}: ${r.sourceProof.url}`,'',`> ${r.sourceProof.quote}`,'');
    lines.push(`## ${t('判断依据','Findings')}`,'',...r.findings.map(f=>`- ${f.text} [${f.evidenceIds.join(', ')}]`),'',`## ${t('没有确认的部分','Limitations')}`,'',...r.limitations.map(x=>`- ${x}`),'',`## ${t('下一步','Next step')}`,'',r.nextStep,'');
  }
  if(run.error)lines.push(`${t('运行说明','Run note')}: ${run.error}`,'');
  lines.push(`## ${t('原始依据','Evidence')}`,'');
  for(const e of run.evidence)lines.push(`### ${e.id} · ${evidenceTitle(e,locale)}`,'',`${t('采集时间','Collected')}: ${e.createdAt}`,...(e.url?[`${t('网址','Source')}: ${e.url}`]:[]),...(e.data.failure?[sourceFailureText(e.data.failure as SourceFailure,locale)]:[]),'','```json',JSON.stringify(e.data,null,2).replace(/```/g,'` ` `'),'```','');
  lines.push(`## ${t('调查经过','Action log')}`,'',...run.actions.map((a,i)=>`${i+1}. ${a.reason} — ${a.status}${a.evidenceId?` [${a.evidenceId}]`:''}`),'',t('为 Orbio Build Week 构建。核对公开出处，不保证资产真实性，也不提供投资建议。','Built for Orbio Build Week. Source attribution research; not a guarantee of authenticity or an investment recommendation.'));
  return lines.join('\n');
}
