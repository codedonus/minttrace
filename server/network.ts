import { SourceError, sourceFailure } from './source-error.js';
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  // Only globally routed IPv6 unicast. Excludes mapped IPv4 and local networks.
  return (
    isIP(address) === 6 &&
    /^[23]/i.test(address) &&
    !address.toLowerCase().startsWith("2001:db8:")
  );
}

async function readPublicUrlInternal(
  raw: string,
  signal: AbortSignal,
  redirects = 0,
  maxBytes = 1_000_000,
): Promise<{ body: string; url: string }> {
  const url = new URL(raw);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Use a public HTTP or HTTPS source.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses = await lookup(hostname, { all: true });
  // Some local VPNs synthesize 198.18/15 DNS answers. Resolve real public A
  // records over HTTPS in that case, rather than permitting private addresses.
  if (
    !isIP(hostname) &&
    addresses.length &&
    addresses.every(({ address }) => /^198\.(18|19)\./.test(address))
  ) {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      },
    );
    if (!response.ok) throw new Error("Could not resolve the public source.");
    const dns = (await response.json()) as {
      Answer?: { type: number; data: string }[];
    };
    addresses = (dns.Answer || [])
      .filter((record) => record.type === 1)
      .map((record) => ({ address: record.data, family: 4 }));
  }
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicAddress(address))
  )
    throw new Error("Private and local network sources are not allowed.");
  const pinned = addresses[0];
  // Pin the validated address for this request; redirects are checked separately.
  const result = await new Promise<{
    body: string;
    status: number;
    location?: string;
  }>((resolve, reject) => {
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
        headers: {
          "User-Agent": "MintTrace/0.1 provenance-research",
          Accept: "application/json,text/html,text/plain",
        },
        lookup: ((
          _hostname: string,
          _options: unknown,
          callback: (...args: any[]) => void,
        ) => {
          if ((_options as { all?: boolean })?.all) callback(null, [pinned]);
          else callback(null, pinned.address, pinned.family);
        }) as any,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let length = 0;
        response.on("data", (chunk) => {
          length += chunk.length;
          if (length > maxBytes)
            req.destroy(new Error(`Source exceeds the ${maxBytes / 1_000_000} MB reading limit.`));
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            status: response.statusCode || 0,
            location: response.headers.location,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
  if (result.status >= 300 && result.status < 400 && result.location) {
    if (redirects >= 3) throw new Error("Too many source redirects.");
    return readPublicUrl(
      new URL(result.location, url).toString(),
      signal,
      redirects + 1,
      maxBytes,
    );
  }
  if (result.status >= 400)
    throw new Error(`Source returned HTTP ${result.status}.`);
  return { body: result.body, url: url.toString() };
}

export async function readPublicUrl(raw: string, signal: AbortSignal, redirects = 0, maxBytes = 1_000_000): Promise<{body: string; url: string}> {
  try { return await readPublicUrlInternal(raw, signal, redirects, maxBytes); }
  catch (error) { signal.throwIfAborted(); throw new SourceError(sourceFailure(error, raw)); }
}

export function resolveTokenUri(uri: string) {
  if (uri.startsWith("ipfs://"))
    return (
      (
        process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"
      ).replace(/\/?$/, "/") + uri.slice(7).replace(/^ipfs\//, "")
    );
  if (uri.startsWith("ar://")) return "https://arweave.net/" + uri.slice(5);
  return uri;
}
