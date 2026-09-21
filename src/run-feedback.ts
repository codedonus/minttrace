import type { Investigation, Locale } from './types';
import { localize } from './i18n';

export function failureFeedback(run: Pick<Investigation, 'status' | 'error' | 'failure' | 'evidence' | 'actions' | 'modelCalls'>, locale: Locale = 'zh') {
  const t=(zh:string,en:string)=>localize(locale,zh,en);
  const collected=run.evidence.length;
  const progress=collected?t(`已保留 ${collected} 条资料，但还没有生成最终判断。`,`${collected} evidence records were kept, but no final assessment was produced. `):t('本次尚未取得任何调查资料，不能据此判断消息真假。','No evidence has been collected, so this does not establish whether the claim is true. ');
  if(run.status==='stopped')return{title:t('核验已停止','Check stopped'),description:collected?t(`已查到的 ${collected} 条资料仍保留在下面。`,`${collected} collected evidence records are kept below.`):t('本次没有取得调查资料。可以重新发起核验。','No evidence was collected. You can start a new check.')};
  if(run.failure?.kind==='investigation_timeout')return{title:t('本次核验已达到时间上限','Investigation time limit reached'),description:progress+t('可以查看已有资料，或稍后重新核验。','Review the collected sources or try again later.')};
  const legacyTimeout=!run.failure&&run.modelCalls===0&&run.actions.length===0&&/timed out|timeout/i.test(run.error||'');
  if(run.failure?.kind==='model_timeout'||legacyTimeout){
    const seconds=Math.round((run.failure?.timeoutMs||90_000)/1000);
    return{title:t('模型响应超时','Model response timed out'),description:t(`${run.modelCalls===0?'第一次':'这次'}模型请求等待了 ${seconds} 秒，仍未拿到完整响应。`,`${run.modelCalls===0?'The first':'The latest'} model request did not return a complete response within ${seconds} seconds. `)+progress+t('可以稍后重试。','Try again later.')};
  }
  const httpStatus=run.failure?.httpStatus||Number(run.error?.match(/^Model provider returned HTTP (\d{3})\b/)?.[1]);
  if(httpStatus)return{title:t('模型服务未接受请求','Model request not accepted'),description:t(`模型服务返回 HTTP ${httpStatus}，需要检查推理服务的配置或可用状态。`,`The model service returned HTTP ${httpStatus}. Check its configuration or availability. `)+progress};
  return{title:t('未能取得模型结果','No model result received'),description:t('这次没有收到可用的模型结果。','No usable model result was received. ')+progress+t('可以稍后重试。','Try again later.')};
}
export function hasCoverageGap(run: Pick<Investigation, 'input' | 'report' | 'evidence'>) {
  return Boolean(run.input.flow && ['unverified','source_supported'].includes(run.report?.verdict || '') && run.report?.sourceProof?.identity!=='verified' && run.evidence.some(e=>e.tool==='find_official_sources'&&Array.isArray(e.data.sources)&&e.data.sources.length===0));
}
