import type { CaseInput, Investigation, Scenario } from "../src/types.js";

export const REFERENCE = "0x1111111111111111111111111111111111111111";
export const CANDIDATE = "0x2222222222222222222222222222222222222222";
export function sampleInput(scenario: Scenario = "lookalike"): CaseInput {
  return {
    name:
      scenario === "same-contract"
        ? "Paper Gardens · original"
        : scenario === "unresolved"
          ? "Paper Gardens · companion"
          : "Paper Gardens · lookalike",
    referenceAddress: REFERENCE,
    candidateAddress: scenario === "same-contract" ? REFERENCE : CANDIDATE,
    tokenId: "42",
    sourceUrl: "https://paper-gardens.example/collection",
    mode: "sample",
    scenario,
  };
}

export function fixtureTool(input: CaseInput, tool: string, target?: string) {
  const candidate = target === "candidate";
  if (tool === "inspect_contract")
    return {
      title: `${candidate ? "Candidate" : "Reference"} contract`,
      data: {
        synthetic: true,
        chain: "Ethereum",
        address: candidate ? input.candidateAddress : input.referenceAddress,
        codePresent: true,
        name: "Paper Gardens",
        symbol: "GARDEN",
        erc721: true,
        note: "A collection name is self-reported and is not proof of affiliation.",
      },
    };
  if (tool === "read_token_metadata")
    return {
      title: `${candidate ? "Candidate" : "Reference"} token #42`,
      data: {
        synthetic: true,
        address: candidate ? input.candidateAddress : input.referenceAddress,
        tokenId: "42",
        tokenURI: `ipfs://${candidate && input.scenario !== "same-contract" ? "bafy-candidate" : "bafy-reference"}/42`,
        name: "Paper Gardens #42",
        description: "An on-chain garden of paper and light.",
        image: "ipfs://bafy-shared-artwork/42.svg",
        external_url: "https://paper-gardens.example",
        note: "Shared artwork and copied metadata alone do not prove authorization.",
      },
    };
  if (tool === "read_official_source")
    return {
      title: "User-supplied official reference",
      data: {
        synthetic: true,
        url: input.sourceUrl,
        text:
          input.scenario === "unresolved"
            ? "Paper Gardens is expanding. A companion collection is planned, but its contract has not been published. The original collection is at " +
              REFERENCE +
              "."
            : "Paper Gardens official collection. Our Ethereum contract is " +
              REFERENCE +
              ". This is the only collection address published on this page.",
        addresses: [REFERENCE],
        note: "The source was designated as official by the user; its ownership is not independently authenticated.",
      },
    };
  throw new Error("Unknown investigation tool.");
}

export function initialSample(): Investigation {
  const createdAt = new Date().toISOString();
  const input = sampleInput();
  const requests = [
    [
      "inspect_contract",
      "candidate",
      "Check the identity claimed by the candidate contract.",
    ],
    [
      "read_token_metadata",
      "candidate",
      "Read the token’s self-reported collection and artwork reference.",
    ],
    [
      "read_official_source",
      "",
      "Compare the candidate with the contract published by the supplied reference.",
    ],
  ];
  const evidence = requests.map(([tool, target], index) => ({
    id: `E${index + 1}`,
    tool,
    ...fixtureTool(input, tool, target),
    createdAt,
  }));
  return {
    id: "example-lookalike",
    input,
    status: "completed",
    createdAt,
    finishedAt: createdAt,
    provider: "Illustrative report",
    model: "No model call",
    actions: requests.map(([tool, , reason], index) => ({
      id: `sample-${index}`,
      tool,
      reason,
      status: "done",
      evidenceId: `E${index + 1}`,
      at: createdAt,
    })),
    evidence,
    report: {
      verdict: "conflict_found",
      summary: "The name matches. The contract does not.",
      findings: [
        {
          text: "The candidate calls itself Paper Gardens, but uses a different contract from the supplied reference.",
          evidenceIds: ["E1", "E3"],
        },
        {
          text: "The token repeats the collection name and points to shared artwork. These are self-reported claims, not proof of authorization.",
          evidenceIds: ["E2"],
        },
        {
          text: "The supplied source publishes only the reference contract. It does not establish any relationship with this candidate.",
          evidenceIds: ["E3"],
        },
      ],
      limitations: [
        "This is a hand-authored walkthrough using synthetic data, not a live investigation.",
        "A different address does not establish fraud. Source ownership and creator intent have not been verified.",
      ],
      nextStep:
        "Ask the collection team to confirm the candidate contract through an independently trusted channel.",
    },
    watch: false,
    tokenUsage: 0,
    modelCalls: 0,
    sampleReport: true,
  };
}
