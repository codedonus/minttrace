export type Locale = "zh" | "en";
export type Verdict = "matches_reference" | "source_supported" | "conflict_found" | "unverified";
export type RunStatus = "running" | "completed" | "stopped" | "failed";
export type Scenario = "lookalike" | "same-contract" | "unresolved";
export type Flow = "wallet" | "purchase" | "message";
export interface WalletAsset { address: string; tokenId: string; name: string; collection: string; description: string; type: string; url: string }
export interface WalletPage { address: string; items: WalletAsset[]; cursor?: string; fetchedAt: string }
export interface CaseInput {
  locale?: Locale;
  flow?: Flow;
  query?: string;
  walletAddress?: string;
  name: string;
  referenceAddress: string;
  candidateAddress: string;
  tokenId: string;
  sourceUrl: string;
  mode: "live" | "sample";
  scenario?: Scenario;
}
export interface Evidence {
  id: string;
  tool: string;
  title: string;
  url?: string;
  data: Record<string, unknown>;
  createdAt: string;
}
export interface Action {
  id: string;
  tool: string;
  reason: string;
  status: "running" | "done" | "error";
  evidenceId?: string;
  error?: string;
  at: string;
}
export interface Finding {
  text: string;
  evidenceIds: string[];
}
export interface Report {
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  limitations: string[];
  nextStep: string;
  sourceProof?: { url: string; quote: string; identity: "verified" | "unverified" };
}
export interface ModelFailure {
  kind: "model_timeout" | "model_unavailable" | "investigation_timeout";
  timeoutMs?: number;
  httpStatus?: number;
}
export interface Investigation {
  failure?: ModelFailure;
  id: string;
  input: CaseInput;
  status: RunStatus;
  createdAt: string;
  finishedAt?: string;
  provider: string;
  model: string;
  actions: Action[];
  evidence: Evidence[];
  report?: Report;
  error?: string;
  watch: boolean;
  previousId?: string;
  tokenUsage: number;
  modelCalls: number;
  sampleReport?: boolean;
}
export interface PublicConfig {
  storage?: "browser";
  provider: string;
  model: string;
  configured: boolean;
  maxSteps: number;
  chain: string;
}
export const verdictLabels: Record<Verdict, string> = {
  source_supported: "Claim found; identity unverified",
  matches_reference: "Reference match",
  conflict_found: "Identity conflict",
  unverified: "Needs more evidence",
};
