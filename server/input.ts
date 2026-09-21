import { consumerInput } from "./consumer.js";
import type { CaseInput, Scenario } from "../src/types.js";
import { sampleInput } from "./fixtures.js";

export function validateInput(body: unknown): CaseInput {
  if (!body || typeof body !== "object")
    throw new Error("Provide investigation details.");
  const raw = body as Record<string, unknown>;
  if (raw.flow) return consumerInput(raw);
  if (raw.mode === "sample") {
    if (
      !["lookalike", "same-contract", "unresolved"].includes(
        String(raw.scenario),
      )
    )
      throw new Error("Choose a supported example.");
    return sampleInput(raw.scenario as Scenario);
  }
  if (raw.mode !== "live") throw new Error("Choose live or example data.");
  const string = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
  const name = string("name"),
    referenceAddress = string("referenceAddress"),
    candidateAddress = string("candidateAddress"),
    tokenId = string("tokenId"),
    sourceUrl = string("sourceUrl");
  if (!name || name.length > 80)
    throw new Error("Use a case name of 1–80 characters.");
  if (
    ![referenceAddress, candidateAddress].every((address) =>
      /^0x[\da-fA-F]{40}$/.test(address),
    )
  )
    throw new Error(
      "Both contracts must be Ethereum addresses (0x + 40 hexadecimal characters).",
    );
  if (!/^\d{1,78}$/.test(tokenId) || BigInt(tokenId) >= 2n ** 256n)
    throw new Error("Enter a valid, non-negative token ID.");
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Enter the full official reference URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    sourceUrl.length > 2000
  )
    throw new Error(
      "Use a public HTTP or HTTPS reference URL without credentials.",
    );
  return {
    name,
    referenceAddress,
    candidateAddress,
    tokenId,
    sourceUrl,
    mode: "live",
  };
}
