import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

export function chatEndpoint(base: string) {
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  )
    throw new Error("The model endpoint must use HTTPS.");
  const path = url.pathname.replace(/\/$/, "");
  url.pathname = path.endsWith("/chat/completions")
    ? path
    : `${path || "/v1"}/chat/completions`;
  return url.toString();
}
export const config = {
  provider: process.env.AI_PROVIDER === "orbio" ? "Orbio" : "Development",
  baseUrl: process.env.AI_BASE_URL || "https://ai.hdd.sb/v1",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "deepseek-v4.1-flash",
  rpc: process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com",
  maxSteps: 8,
  port: Number(process.env.PORT || 4173),
};
export const publicConfig = () => ({
  provider: config.provider,
  model: config.model,
  configured: Boolean(config.apiKey),
  maxSteps: config.maxSteps,
  chain: "Ethereum mainnet",
});
