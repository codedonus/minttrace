import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  runAgent,
  parseReport,
  normalizeCompletion,
  type Completion,
} from "../server/agent.js";
import { sampleInput, initialSample, fixtureTool } from "../server/fixtures.js";
import { validateInput } from "../server/input.js";
import { Store } from "../server/store.js";
import { markdownReport } from "../server/report.js";
import { isPublicAddress, resolveTokenUri } from "../server/network.js";
import { chatEndpoint } from "../server/config.js";
import type { Investigation } from "../src/types.js";

function fresh(): Investigation {
  return {
    ...initialSample(),
    id: "test",
    input: sampleInput(),
    status: "running",
    actions: [],
    evidence: [],
    report: undefined,
    sampleReport: undefined,
    modelCalls: 0,
    tokenUsage: 0,
  };
}
const call = (name: string, args: unknown): Completion => ({
  choices: [
    {
      message: {
        role: "assistant",
        tool_calls: [
          {
            id: name,
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
  usage: { total_tokens: 10 },
});
const report = {
  verdict: "conflict_found",
  summary: "The contract conflicts with the supplied source.",
  findings: [
    { text: "Candidate uses a different address.", evidenceIds: ["E1", "E2"] },
  ],
  limitations: [
    "Source ownership is user-supplied, not independently authenticated.",
  ],
  nextStep: "Ask the team for confirmation.",
};

test("agent actually follows model-selected tools and finishes with validated evidence citations", async () => {
  const run = fresh();
  let turn = 0;
  const trace: string[] = [];
  await runAgent(run, new AbortController().signal, () => {}, {
    complete: async (messages) => {
      turn++;
      if (turn === 1)
        return call("inspect_contract", {
          target: "candidate",
          reason: "Read candidate identity.",
        });
      if (turn === 2) {
        assert.match(messages.at(-1)!.content!, /E1/);
        return call("read_official_source", {
          reason: "Resolve the identity claim against the source.",
        });
      }
      return call("finish_investigation", report);
    },
    execute: async (input, name, args) => {
      trace.push(name);
      return fixtureTool(input, name, String(args.target));
    },
  });
  assert.deepEqual(trace, ["inspect_contract", "read_official_source"]);
  assert.equal(run.report?.verdict, "conflict_found");
  assert.equal(run.status, "completed");
  assert.equal(run.modelCalls, 3);
  assert.equal(run.tokenUsage, 30);
});

test("unsupported citations and false reference matches are rejected", () => {
  const run = initialSample();
  assert.throws(
    () =>
      parseReport(
        {
          ...report,
          findings: [{ text: "Invented evidence", evidenceIds: ["E99"] }],
        },
        run,
      ),
    /existing evidence/,
  );
  assert.throws(
    () => parseReport({ ...report, verdict: "matches_reference" }, run),
    /identical contract/,
  );
  assert.throws(() => parseReport(report, fresh()), /Inspect the candidate/);
});

test("model that refuses tools stops at the budget without inventing a conclusion", async () => {
  const run = fresh();
  await runAgent(run, new AbortController().signal, () => {}, {
    maxSteps: 2,
    complete: async () => ({
      choices: [
        { message: { role: "assistant", content: "I will keep thinking." } },
      ],
    }),
  });
  assert.equal(run.modelCalls, 2);
  assert.equal(run.report?.verdict, "unverified");
  assert.match(run.report!.summary, /step limit/);
});

test("stop interrupts a provider request and preserves existing evidence", async () => {
  const run = fresh();
  const controller = new AbortController();
  run.evidence = initialSample().evidence.slice(0, 1);
  await runAgent(run, controller.signal, () => {}, {
    complete: async () => {
      controller.abort();
      throw new Error("Abort");
    },
  });
  assert.equal(run.status, "stopped");
  assert.equal(run.evidence.length, 1);
  assert.equal(run.report, undefined);
});

test("provider failures do not leak request secrets into the saved run", async () => {
  const run = fresh();
  await runAgent(run, new AbortController().signal, () => {}, {
    complete: async () => {
      throw new Error("request failed Authorization: Bearer private-key");
    },
  });
  assert.equal(run.status, "failed");
  assert.doesNotMatch(JSON.stringify(run), /private-key/);
});

test("missing source becomes evidence of a limitation and the model can continue", async () => {
  const run = fresh();
  let turn = 0;
  await runAgent(run, new AbortController().signal, () => {}, {
    complete: async () =>
      ++turn === 1
        ? call("read_official_source", { reason: "Consult the source." })
        : call("finish_investigation", {
            ...report,
            verdict: "unverified",
            findings: [
              {
                text: "The official source was unavailable.",
                evidenceIds: ["E1"],
              },
            ],
          }),
    execute: async () => {
      throw new Error("Source returned HTTP 403.");
    },
  });
  assert.equal(run.status, "completed");
  assert.equal(run.actions[0].status, "error");
  assert.equal(run.report?.verdict, "unverified");
  assert.match(String(run.evidence[0].data.error), /403/);
});

test("persistence keeps saved cases and marks interrupted runs stopped after restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "minttrace-test-"));
  try {
    const path = join(directory, "store.json");
    const first = new Store(path);
    const run = fresh();
    run.watch = true;
    first.add(run);
    const second = new Store(path);
    assert.equal(second.get("test")?.watch, true);
    assert.equal(second.get("test")?.status, "stopped");
    assert.match(
      markdownReport(second.get("example-lookalike")!),
      /hand-authored walkthrough/,
    );
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("input checks token bounds, addresses and source credentials, keeps examples synthetic", () => {
  const input = { ...sampleInput(), mode: "live" };
  assert.equal(validateInput(input).mode, "live");
  assert.throws(
    () => validateInput({ ...input, tokenId: (2n ** 256n).toString() }),
    /token ID/,
  );
  assert.throws(
    () => validateInput({ ...input, candidateAddress: "0x123" }),
    /Ethereum addresses/,
  );
  assert.throws(
    () =>
      validateInput({
        ...input,
        sourceUrl: "https://secret:password@example.com",
      }),
    /without credentials/,
  );
  assert.equal(
    validateInput({
      mode: "sample",
      scenario: "same-contract",
      candidateAddress: "malicious-override",
    }).candidateAddress,
    sampleInput("same-contract").referenceAddress,
  );
});

test("source reader rejects private networks, model adapter preserves configured API base", () => {
  for (const ip of [
    "127.0.0.1",
    "10.2.3.4",
    "172.31.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  assert.equal(
    resolveTokenUri("ipfs://ipfs/bafy/test"),
    "https://gateway.pinata.cloud/ipfs/bafy/test",
  );
  assert.equal(
    chatEndpoint("https://ai.hdd.sb/"),
    "https://ai.hdd.sb/v1/chat/completions",
  );
  assert.equal(
    chatEndpoint("https://openrouter.ai/api/v1"),
    "https://openrouter.ai/api/v1/chat/completions",
  );
  assert.equal(
    chatEndpoint("https://example.com/v1/chat/completions"),
    "https://example.com/v1/chat/completions",
  );
});

test("development gateway wrappers and standard Orbio-compatible responses keep their real usage", () => {
  const response = call("inspect_contract", {
    target: "candidate",
    reason: "Check it.",
  });
  assert.deepEqual(normalizeCompletion(response), response);
  assert.deepEqual(
    normalizeCompletion({
      data: response,
      success: true,
      usage: { total_tokens: 999 },
    }),
    response,
  );
  assert.equal(normalizeCompletion({ data: response }).usage?.total_tokens, 10);
  assert.throws(
    () => normalizeCompletion({ success: false }),
    /no usable response/,
  );
});

test("same-address candidate and reference reuse evidence instead of repeating RPC reads", async () => {
  const run = fresh();
  run.input = sampleInput("same-contract");
  let turn = 0;
  let reads = 0;
  await runAgent(run, new AbortController().signal, () => {}, {
    complete: async () => {
      turn++;
      if (turn === 1)
        return call("inspect_contract", {
          target: "candidate",
          reason: "Inspect the contract.",
        });
      if (turn === 2)
        return call("inspect_contract", {
          target: "reference",
          reason: "Check the same address.",
        });
      if (turn === 3)
        return call("read_official_source", {
          reason: "Confirm the published address.",
        });
      return call("finish_investigation", {
        ...report,
        verdict: "matches_reference",
        summary: "The candidate is the supplied reference contract.",
      });
    },
    execute: async (input, name, args) => {
      reads++;
      return fixtureTool(input, name, String(args.target));
    },
  });
  assert.equal(reads, 2);
  assert.equal(run.evidence.length, 2);
  assert.equal(run.report?.verdict, "matches_reference");
});
