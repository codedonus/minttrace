import { sourceFailureText, type SourceFailure } from '../src/i18n.js';

export class SourceError extends Error {
  constructor(public failure: SourceFailure) {
    super(failure.kind === 'not_observed' ? 'Source URL must come from the input, official directory or collected evidence.' : sourceFailureText(failure, 'en'));
  }
}
export function safeSourceUrl(raw: unknown): string | undefined {
  try {
    const u = new URL(String(raw));
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return;
    return u.toString();
  } catch { return; }
}
export function sourceFailure(error: unknown, raw?: unknown): SourceFailure {
  if (error instanceof SourceError) return error.failure;
  const e = error as { message?: string; code?: string; name?: string; cause?: {code?: string; name?: string} };
  const message = e?.message || '';
  const code = e?.code || e?.cause?.code || '';
  const status = message.match(/Source returned HTTP (\d{3})/);
  let kind: SourceFailure['kind'] = 'unknown';
  if (status) kind = 'http';
  else if (/Source URL must/.test(message)) kind = 'not_observed';
  else if (/Private and local/.test(message)) kind = 'private_address';
  else if (/Source exceeds/.test(message)) kind = 'too_large';
  else if (/Too many source redirects/.test(message)) kind = 'redirects';
  else if (/ENOTFOUND|EAI_AGAIN/.test(code) || /resolve the public/.test(message)) kind = 'dns';
  else if (e?.name === 'TimeoutError' || e?.cause?.name === 'TimeoutError' || /timed out|timeout/i.test(message) || code === 'ETIMEDOUT' || e?.name === 'AbortError') kind = 'timeout';
  else if (/ECONN|EHOST|ENET|TLS|CERT|UND_ERR/.test(code) || /fetch failed/.test(message)) kind = 'connection';
  return { kind, url: safeSourceUrl(raw), ...(status ? {status: Number(status[1])} : {}) };
}
