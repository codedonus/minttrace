import { detectLocale } from '../src/i18n.js';
import { walletPage } from "./consumer.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config, publicConfig } from "./config.js";
import { Store } from "./store.js";
import { runAgent } from "./agent.js";
import { validateInput } from "./input.js";
import { markdownReport } from "./report.js";
import type { Investigation } from "../src/types.js";

const app = express();
const store = new Store();
const active = new Map<string, AbortController>();
app.disable("x-powered-by");
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("origin");
  if (origin && origin !== `${req.protocol}://${req.get("host")}`)
    return res
      .status(403)
      .json({ error: "Use the local MintTrace app to make this request." });
  if (req.get("sec-fetch-site") === "cross-site")
    return res
      .status(403)
      .json({ error: "Cross-site requests are not allowed." });
  next();
});
app.use(express.json({ limit: "16kb" }));
app.get("/api/config", (_req, res) => res.json(publicConfig()));
app.get("/api/wallet", async (req, res) => {
  try { res.json(await walletPage(String(req.query.address || ''), typeof req.query.cursor === 'string' ? req.query.cursor : undefined, AbortSignal.timeout(25000))); }
  catch(error) { res.status(400).json({error: error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : '钱包数据暂时无法读取，请稍后重试或直接粘贴 NFT 链接。'}); }
});
app.get("/api/runs", (_req, res) => res.json(store.runs));
app.get("/api/runs/:id", (req, res) => {
  const run = store.get(req.params.id);
  return run
    ? res.json(run)
    : res.status(404).json({ error: "Investigation not found." });
});
app.post("/api/runs", (req, res) => {
  if (!config.apiKey)
    return res
      .status(503)
      .json({
        error:
          "核验服务尚未配置好，请联系产品提供者。",
      });
  if (active.size)
    return res
      .status(409)
      .json({
        error:
          "An investigation is already running. Finish or stop it before starting another.",
      });
  try {
    const previous =
      typeof req.body.previousId === "string"
        ? store.get(req.body.previousId)
        : undefined;
    if (req.body.previousId && !previous)
      return res
        .status(404)
        .json({ error: "The previous investigation was not found." });
    const locale = req.body.locale === 'en' || req.body.locale === 'zh' ? req.body.locale : detectLocale((req.get('accept-language') || '').split(',').map(s=>s.split(';')[0]));
    const input = previous ? {...previous.input, locale} : validateInput({...req.body, locale});
    const run: Investigation = {
      id: randomUUID(),
      input,
      status: "running",
      createdAt: new Date().toISOString(),
      provider: config.provider,
      model: config.model,
      actions: [],
      evidence: [],
      watch: previous?.watch || false,
      ...(previous ? { previousId: previous.id } : {}),
      tokenUsage: 0,
      modelCalls: 0,
    };
    if (previous?.watch) previous.watch = false;
    store.add(run);
    const controller = new AbortController();
    active.set(run.id, controller);
    void runAgent(run, controller.signal, () => store.save()).finally(() =>
      active.delete(run.id),
    );
    return res.status(201).json(run);
  } catch (error) {
    return res
      .status(400)
      .json({
        error:
          error instanceof Error
            ? error.message
            : "Check the investigation details.",
      });
  }
});
app.post("/api/runs/:id/stop", (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Investigation not found." });
  active.get(run.id)?.abort();
  return res.json({ stopped: true });
});
app.patch("/api/runs/:id/watch", (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Investigation not found." });
  if (typeof req.body.watch !== "boolean")
    return res.status(400).json({ error: "Choose whether to save this case." });
  run.watch = req.body.watch;
  store.save();
  return res.json(run);
});
app.get("/api/runs/:id/export", (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Investigation not found." });
  const json = req.query.format === "json";
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="minttrace-${run.id.slice(0, 8)}.${json ? "json" : "md"}"`,
  );
  res.type(json ? "application/json" : "text/markdown");
  return res.send(json ? JSON.stringify(run, null, 2) : markdownReport(run, req.query.locale === 'en' ? 'en' : req.query.locale === 'zh' ? 'zh' : run.input.locale));
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get(/.*/, (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res
      .status(400)
      .json({
        error:
          error instanceof SyntaxError
            ? "The request is not valid JSON."
            : "The request could not be processed.",
      });
  },
);
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(
    `MintTrace is ready at http://127.0.0.1:${config.port} · ${config.provider} provider`,
  ),
);
for (const event of ["SIGINT", "SIGTERM"] as const)
  process.on(event, () => {
    for (const controller of active.values()) controller.abort();
    server.close(() => process.exit(0));
  });
