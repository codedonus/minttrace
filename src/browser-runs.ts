import type { Investigation } from './types.js';

const historyKey = 'minttrace.runs.v1';
export function readBrowserRuns(storage: Pick<Storage, 'getItem'>): Investigation[] {
  const saved = JSON.parse(storage.getItem(historyKey) || '[]') as Investigation[];
  return saved.map(run => run.status === 'running' ? {
    ...run, status: 'stopped' as const, finishedAt: new Date().toISOString(),
    error: 'The page was closed or refreshed. Collected evidence is still available.',
    actions: run.actions.map(a => a.status === 'running' ? { ...a, status: 'error' as const } : a),
  } : run);
}
export function saveBrowserRuns(storage: Pick<Storage, 'setItem'>, runs: Investigation[]) {
  // Keep recent reports within typical browser storage limits. The current report stays in memory.
  const recent = runs.slice(0, 20);
  while (recent.length > 1 && JSON.stringify(recent).length > 1500000) recent.pop();
  storage.setItem(historyKey, JSON.stringify(recent));
}
export async function consumeRunStream(response: Response, receive: (run: Investigation) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'The investigation service is unavailable.');
  }
  if (!response.body || !response.headers.get('content-type')?.includes('application/x-ndjson')) {
    throw new Error('The investigation service returned an unexpected response.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let last: Investigation | undefined;
  const emit = (line: string) => {
    if (!line.trim()) return;
    last = JSON.parse(line) as Investigation;
    receive(last);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        emit(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
      }
      if (done) break;
    }
    if (pending.trim()) emit(pending);
    if (!last || last.status === 'running') throw new Error('The connection ended before the investigation finished.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
