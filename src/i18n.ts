import type { Evidence, Locale, Verdict } from './types';

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return 'en';
}
export const localize = (locale: Locale, zh: string, en: string) => locale === 'zh' ? zh : en;
export function resultLabel(verdict: Verdict, locale: Locale) {
  const labels = {
    matches_reference: ['找到官方出处', 'Official source confirmed'],
    source_supported: ['页面有此消息 · 身份待核实', 'Claim found · identity unverified'],
    conflict_found: ['发现具体冲突 / 风险', 'Conflict or risk found'],
    unverified: ['还不能确认', 'Not enough evidence'],
  };
  return labels[verdict][locale === 'zh' ? 0 : 1];
}
export type SourceFailure = { kind: 'not_observed' | 'http' | 'timeout' | 'dns' | 'connection' | 'private_address' | 'too_large' | 'redirects' | 'unknown'; url?: string; status?: number };
export function sourceFailureText(f: SourceFailure, locale: Locale) {
  const t = (zh: string, en: string) => localize(locale, zh, en);
  switch (f.kind) {
    case 'not_observed': return t('程序未在已收集资料中找到这个网址，因此没有发出网页请求。', 'This URL was not found in the collected evidence, so the app did not send a web request.');
    case 'http': return t(`该网址返回 HTTP ${f.status}，未能取得可用正文。`, `This URL returned HTTP ${f.status}; no usable page text was retrieved.`);
    case 'timeout': return t('读取这个网址时超过了等待时限。', 'The request to this URL exceeded its time limit.');
    case 'dns': return t('无法解析这个网址的域名。', 'The domain name could not be resolved.');
    case 'connection': return t('连接该网站时失败，未能收到完整页面。', 'The connection failed before the complete page was received.');
    case 'private_address': return t('该网址指向本地或非公开网络，程序已阻止访问。', 'The URL resolves to a local or non-public network, so access was blocked.');
    case 'too_large': return t('页面超过本次读取的大小上限。', 'The page exceeded the reading size limit.');
    case 'redirects': return t('该链接的跳转次数超过读取上限。', 'The link exceeded the redirect limit.');
    default: return t('本次未能读取页面，未获得更具体的失败原因。', 'The page could not be read; no more specific cause was available.');
  }
}
export function evidenceTitle(e: Evidence, locale: Locale) {
  const t = (zh: string, en: string) => localize(locale, zh, en);
  if (e.data.error) return t('未取得这条来源', 'Source unavailable');
  if (e.tool === 'read_page') return String(e.data.pageTitle || t('网页内容', 'Webpage'));
  if (e.tool === 'find_official_sources') return t('查找并读取官方入口', 'Find and read official sources');
  if (e.tool === 'check_domains') return t('已知钓鱼域名核对', 'Known phishing domain check');
  if (e.tool === 'inspect_nft') return t('NFT 身份与描述', 'NFT identity and description');
  return e.title;
}

// These are application errors, not source text or model-generated findings.
const errors: Record<string, string> = {
  '请粘贴 NFT 商品链接，例如 OpenSea 或 Etherscan 的单件 NFT 页面。': 'Paste a link to an individual NFT on OpenSea or Etherscan.',
  '请使用不含密码的公开 NFT 链接。': 'Use a public NFT link without credentials.',
  '请复制单件 NFT 的商品链接，而不是系列首页。': 'Paste an individual NFT item link, rather than a collection homepage.',
  '目前 NFT 查询支持 Ethereum 主网；其他链的链接暂时不能核验。': 'NFT checks currently support Ethereum mainnet. Other networks are not supported yet.',
  '目前支持 OpenSea、Etherscan 的 Ethereum 单件 NFT 链接。活动网页请用「活动消息」入口。': 'Use an Ethereum NFT item link from OpenSea or Etherscan. For other webpages, choose Check a message.',
  '这个链接里没有完整的 NFT 信息，请复制单件 NFT 页面地址。': 'This link does not contain complete NFT details. Paste the individual item URL.',
  '请选择要核验的内容。': 'Choose a check type.',
  '请粘贴要检查的内容，最多 6000 字。': 'Paste the content to check, up to 6,000 characters.',
  '请先移除链接中的登录信息。': 'Remove login credentials from the link first.',
  '请粘贴 Ethereum 钱包的公开地址（0x 开头），不需要连接钱包。': 'Paste a public Ethereum wallet address starting with 0x. No wallet connection is needed.',
  '翻页信息已失效，请重新读取钱包。': 'The page cursor is invalid. Load the wallet again.',
  '钱包索引暂时不可用，请稍后重试或直接粘贴 NFT 链接。': 'The wallet index is unavailable. Try again later or paste an NFT item link.',
  '钱包数据暂时无法读取，请稍后重试或直接粘贴 NFT 链接。': 'Wallet data could not be read. Try again later or paste an NFT item link.',
  '核验服务尚未配置好，请联系产品提供者。': 'The checking service is not configured. Contact the product provider.',
  'An investigation is already running. Finish or stop it before starting another.': 'An investigation is already running. Finish or stop it before starting another.',
  'Investigation not found.': 'Investigation not found.',
};
export function applicationError(message: string, locale: Locale) {
  if (locale === 'en') return errors[message] || (/[一-鿿]/.test(message) ? 'The request could not be completed. Check your input and try again.' : message);
  const zh: Record<string, string> = {
    'An investigation is already running. Finish or stop it before starting another.': '已有一项核验正在进行，请等待完成或先停止它。',
    'Investigation not found.': '找不到这条核验记录。',
    'The previous investigation was not found.': '找不到要复查的记录。',
    'The investigation service is not configured.': '核验服务尚未配置好，请联系产品提供者。',
    'The investigation service is unavailable.': '核验服务暂时不可用，请稍后重试。',
    'The investigation service returned an unexpected response.': '核验接口返回异常，请稍后重试。',
    'The connection ended before the investigation finished.': '连接提前中断，已获得的线索仍然保留。可以重新核验。',
    'Failed to fetch': '无法连接核验服务，请稍后重试。',
    'The request could not be processed.': '暂时无法处理请求，请稍后重试。',
  };
  return zh[message] || message;
}
