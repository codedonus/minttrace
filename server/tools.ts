import { createPublicClient, http, parseAbi, type Address } from "viem";
import { mainnet } from "viem/chains";
import { load } from "cheerio";
import { createHash } from "node:crypto";
import type { CaseInput } from "../src/types.js";
import { config } from "./config.js";
import { fixtureTool } from "./fixtures.js";
import { readPublicUrl, resolveTokenUri } from "./network.js";

export type ToolResult = {
  title: string;
  url?: string;
  data: Record<string, unknown>;
};
export type ExecuteTool = (
  input: CaseInput,
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<ToolResult>;
const abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function supportsInterface(bytes4) view returns (bool)",
  "function tokenURI(uint256) view returns (string)",
]);

export const executeTool: ExecuteTool = async (input, name, args, signal) => {
  signal.throwIfAborted();
  if (
    ![
      "inspect_contract",
      "read_token_metadata",
      "read_official_source",
    ].includes(name)
  )
    throw new Error("Unknown tool.");
  if (
    name !== "read_official_source" &&
    !["candidate", "reference"].includes(String(args.target))
  )
    throw new Error("Select candidate or reference.");
  if (input.mode === "sample")
    return fixtureTool(input, name, String(args.target));
  const address = (
    args.target === "reference"
      ? input.referenceAddress
      : input.candidateAddress
  ) as Address;
  const client = createPublicClient({
    chain: mainnet,
    transport: http(config.rpc, {
      timeout: 12_000,
      retryCount: 0,
      fetchOptions: { signal },
    }),
  });
  if (name === "inspect_contract") {
    const [chainId, code] = await Promise.all([
      client.getChainId(),
      client.getCode({ address }),
    ]);
    if (chainId !== 1)
      throw new Error("The configured RPC is not Ethereum mainnet.");
    const values = await Promise.allSettled([
      client.readContract({ address, abi, functionName: "name" }),
      client.readContract({ address, abi, functionName: "symbol" }),
      client.readContract({
        address,
        abi,
        functionName: "supportsInterface",
        args: ["0x80ac58cd"],
      }),
    ]);
    const value = (index: number) =>
      values[index].status === "fulfilled"
        ? values[index].value
        : "unavailable";
    return {
      title: `${args.target === "reference" ? "Reference" : "Candidate"} contract`,
      url: `https://etherscan.io/address/${address}`,
      data: {
        chain: "Ethereum mainnet",
        address,
        codePresent: Boolean(code && code !== "0x"),
        name: value(0),
        symbol: value(1),
        erc721: value(2),
        note: "Names are self-reported. Code presence and ERC-721 support do not prove authenticity.",
      },
    };
  }
  if (name === "read_token_metadata") {
    if ((await client.getChainId()) !== 1)
      throw new Error("The configured RPC is not Ethereum mainnet.");
    const tokenURI = await client.readContract({
      address,
      abi,
      functionName: "tokenURI",
      args: [BigInt(input.tokenId)],
    });
    let body: string;
    let url: string | undefined;
    if (tokenURI.startsWith("data:application/json")) {
      const comma = tokenURI.indexOf(",");
      body = tokenURI.slice(0, comma).includes(";base64")
        ? Buffer.from(tokenURI.slice(comma + 1), "base64").toString("utf8")
        : decodeURIComponent(tokenURI.slice(comma + 1));
      if (body.length > 1_000_000)
        throw new Error("Metadata exceeds the reading limit.");
    } else {
      const result = await readPublicUrl(resolveTokenUri(tokenURI), signal);
      body = result.body;
      url = result.url;
    }
    const metadata = JSON.parse(body);
    const field = (key: string) =>
      typeof metadata[key] === "string"
        ? metadata[key].slice(0, 2500)
        : undefined;
    return {
      title: `${args.target === "reference" ? "Reference" : "Candidate"} token #${input.tokenId}`,
      url,
      data: {
        address,
        tokenId: input.tokenId,
        tokenURI: tokenURI.startsWith("data:")
          ? "On-chain JSON data URI"
          : tokenURI,
        name: field("name"),
        description: field("description"),
        image:
          typeof metadata.image === "string" &&
          metadata.image.startsWith("data:")
            ? `Embedded artwork (${metadata.image.length} characters; not visually compared)`
            : field("image"),
        imageReferenceHash:
          typeof metadata.image === "string"
            ? createHash("sha256").update(metadata.image).digest("hex")
            : undefined,
        external_url: field("external_url"),
        note: "Metadata is untrusted and self-reported. Images are not visually compared.",
      },
    };
  }
  const result = await readPublicUrl(input.sourceUrl, signal);
  const $ = load(result.body);
  $("script, style, noscript, nav").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 14_000);
  const links = $("a[href]")
    .map((_, element) => $(element).attr("href") || "")
    .get();
  const addresses = [
    ...new Set(
      (text + " " + links.join(" ")).match(/0x[a-fA-F0-9]{40}/g) || [],
    ),
  ];
  return {
    title: "User-supplied official reference",
    url: result.url,
    data: {
      title: $("title").text().slice(0, 200),
      text,
      addresses: addresses.slice(0, 40),
      note: "User-designated source. Ownership is not independently verified. Text may be incomplete on JavaScript-only websites.",
    },
  };
};
