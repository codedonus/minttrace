import express from 'express';
import { randomUUID } from 'node:crypto';
import { config, publicConfig } from './config.js';
import { runAgent } from './agent.js';
import { validateInput } from './input.js';
import { walletPage } from './consumer.js';
import { detectLocale, localize } from '../src/i18n.js';
import type { Investigation } from '../src/types.js';

// Each request owns its investigation. Vercel has no shared history file or background worker.
export function createCloudApi(options: {
  investigate?: typeof runAgent;
  configured?: boolean;
  deadlineMs?: number;
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' ||
        (origin && origin !== `${req.protocol}://${req.get('host')}`)) {
      return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/config', (_req, res) => res.json({ ...publicConfig(),
    configured: options.configured ?? Boolean(config.apiKey), storage: 'browser' }));
  app.get('/api/wallet', async (req, res) => {
    try {
      res.json(await walletPage(String(req.query.address || ''),
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
        AbortSignal.timeout(25000)));
    } catch {
      const locale = detectLocale((req.get('accept-language') || '').split(','));
      res.status(400).json({ error: localize(locale,
        '钱包数据暂时无法读取，请稍后重试或直接粘贴 NFT 链接。',
        'Wallet data is temporarily unavailable. Try again or paste an NFT link.') });
    }
  });
  app.post('/api/runs', async (req, res) => {
    if (!(options.configured ?? Boolean(config.apiKey))) {
      return res.status(503).json({ error: 'The investigation service is not configured.' });
    }
    let input;
    try {
      input = validateInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Check the input.' });
    }
    const run: Investigation = {
      id: randomUUID(), input, status: 'running', createdAt: new Date().toISOString(),
      provider: config.provider, model: config.model, actions: [], evidence: [],
      watch: false, tokenUsage: 0, modelCalls: 0,
    };
    const controller = new AbortController();
    let expired = false;
    const deadlineMs = options.deadlineMs ?? 270000;
    const deadline = setTimeout(() => { expired = true; controller.abort(); }, deadlineMs);
    const cancel = () => controller.abort();
    req.on('error', cancel);
    res.on('close', cancel);
    res.status(200).type('application/x-ndjson');
    res.flushHeaders();
    const publish = () => {
      if (expired) {
        run.status = 'failed';
        run.failure = { kind: 'investigation_timeout', timeoutMs: deadlineMs };
        run.error = 'The investigation reached its time limit. Collected evidence is still available.';
      }
      if (!res.destroyed && !res.writableEnded) res.write(JSON.stringify(run) + '\n');
    };
    publish();
    // Keep the function alive until inference finishes; do not launch a detached task.
    try {
      await (options.investigate ?? runAgent)(run, controller.signal, publish);
    } catch {
      run.status = controller.signal.aborted ? 'stopped' : 'failed';
      run.error = 'The investigation could not be completed. Collected evidence is still available.';
      run.finishedAt = new Date().toISOString();
    } finally {
      publish();
      clearTimeout(deadline);
      req.off('error', cancel);
      res.off('close', cancel);
      res.end();
    }
  });
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found. Reports are stored in your browser.' }));
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: 'The request must be valid JSON, no larger than 16 KB.' });
  });
  return app;
}
