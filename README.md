# MintTrace · 不确定，先查出处

A consumer Web3 source-checking agent, built by codedonus for Orbio Build Week. Three entry points, one evidence-driven investigation:

- **Unfamiliar NFT:** paste a public Ethereum wallet address, select an asset, or paste an NFT link. Read the NFT's claim and check its destination links. Receiving an NFT alone is not evidence of a compromised wallet.
- **Before buying:** paste an OpenSea or Etherscan item link. Resolve the asset, confirm its existence, independently discover supported official sources and compare identity.
- **Activity message:** paste a message or URL. Find the project's official source, follow relevant announcement links, check dates, claims and destination.

No wallet connection. No trusted contract or official URL fields. Chinese and English interfaces, expandable evidence, recent history, cancellation, manual recheck and report export.

Read [PRODUCT_POSITIONING.md](./PRODUCT_POSITIONING.md) and [DEMAND_RESEARCH.md](./DEMAND_RESEARCH.md) for public demand evidence and its limits. Observed requests for help are not proof of market size or willingness to pay.

## Run locally

Requires Node.js 22.12+ (tested with Node 24).

```sh
npm ci
cp .env.example .env.local
# Set the server-side Orbio key. Never commit it.
npm run dev
```

Open http://127.0.0.1:4173 for the product homepage, or http://127.0.0.1:4173/app for the investigation workspace. For a production build locally: `npm run build`, then `npm start`. On macOS, double-click `start.command` to locate Node, build and start.

The local server listens only on localhost and keeps one local history in `data/investigations.json` (ignored by git). Vercel uses the separate request-scoped API described below.

## Deploy on Vercel

Import this repository with its root as the project root. `vercel.json` selects Vite, builds `dist`, routes `/app` to the React application and `/api/*` to the Node function. Configure these **server-side** environment variables for Production (and Preview if needed), then deploy:

```dotenv
AI_PROVIDER=orbio
AI_BASE_URL=https://api.orbio.so/api/v1
AI_MODEL=deepseek/deepseek-v4.1-flash
AI_API_KEY=<your Orbio-issued key>
```

No `VITE_` key and no uploaded `.env.local` file are needed. Environment changes require a redeploy. Open `/api/config` to check `configured: true`, `provider: "Orbio"` and `storage: "browser"`; this endpoint never returns credentials.

The cloud API streams each investigation while the function is running. It does not use a local JSON file or launch work after returning a response. Fluid compute is enabled with a 300-second function duration and a 270-second investigation deadline; the existing 90-second individual model timeout still applies. Closing the page or choosing Stop cancels the request. Refreshing shows the interrupted run with its collected evidence.

Reports remain in the visitor's browser (up to 20 recent reports, trimmed for storage size), separate from other visitors. Clearing browser data removes them; download a report to keep/share it. Case links only work in the browser holding that record. There is no cloud account or cross-device history. Public investigations use the deployment owner's model credits, with the existing 8-turn/12-evidence-call per-run limits. No deployment-wide credit cap or authentication is built in; configure provider spending limits and Vercel traffic rules for a public demo.

## Try all three

1. Select **收到陌生 NFT** and paste a public Ethereum wallet address. Pick one NFT from the returned list, or paste its Etherscan/OpenSea item link directly. Each page contains up to 50 indexed assets; “继续加载” fetches the next page. The list is not ordered by newest arrival and is not a risk list.
2. Select **购买前查出处**, then **试填真实 NFT 链接**. This fills the real Loot #1 link. Click **帮我查一下** to run an actual network/model check. No correct reference address is needed.
3. Select **核验活动消息** and **试填真实活动链接** for Orbio Build Week. To test claim conflict, enter a message claiming $500 of inference and compare it against the official page.

Example-fill buttons only fill the input. Investigations make actual model calls and consume credits from the configured provider when submitted. Legacy synthetic/reference comparison records remain stored and their old deep links display a clear legacy label. New consumer history does not present old research as independent verification.

## Evidence and coverage

- NFT links: OpenSea `/assets/ethereum/...`, `/item/ethereum/...`; Etherscan `/nft/...` and `/token/...?a=...`. Ethereum mainnet only. Unsupported chains and collection homepages get a useful input error.
- Wallet inventory: [Blockscout public API](https://docs.blockscout.com/api-reference/get-list-of-nft-owned-by-address), ERC-721 and ERC-1155. No additional API key required in the tested configuration. Indexing can lag.
- NFT details: Ethereum public RPC plus Blockscout metadata fallback. Positive ERC-721 item confirmation requires an `ownerOf` result and independently read official source identity. Some RPC or JavaScript-only pages are unavailable.
- Official entry directory: Arc, Loot, Nouns, Pudgy Penguins, Uniswap, Orbio. It establishes starting points independently of the submitted claim; conclusions still require current page evidence. Tools follow links found in input/evidence. This is bounded source discovery, not general web search. Unknown projects remain unverified.
- Known domain intelligence: [Scam Sniffer public database](https://github.com/scamsniffer/scam-database), GPL-3.0, fetched at runtime, cached in memory for one hour, public data delayed by about 7 days. No source or dataset is bundled. A miss is not proof of safety. Database source/license attribution is preserved in evidence; see [THIRD_PARTY.md](./THIRD_PARTY.md).
- Verdicts: independently confirmed source; supporting page content with unverified identity; concrete conflict/known risk; insufficient evidence. Positive activity conclusions require a cited official page, exact quotation and supported input destination. Semantic claim/date comparison remains model interpretation and can be wrong. No transaction simulation, investment recommendation, eligibility check or guarantee.

## Agent and Orbio

The model actually chooses `inspect_nft`, `find_official_sources`, `read_page`, `check_domains`, and `finish_investigation`. It follows gaps in evidence and cites returned evidence IDs. Max 8 model turns / 12 evidence calls; user can stop. The application stores public action descriptions, not private chain-of-thought. Deterministic URL, domain and citation checks support the agent.

On 2026-09-21, the actual Orbio-issued key passed authentication, chat and live tool-call checks using the configuration below. One activity investigation completed in 47 seconds, but it confused the build deadline with submission status; after tightening the investigation instructions, a further run read the real submission page but timed out while generating its report. Two live runs hit the existing 90-second model timeout. A subsequent Vercel activity check completed with 3 real Orbio calls and a downloadable, cited report. Connectivity and one cloud activity flow are verified; full three-flow Orbio acceptance remains incomplete. Earlier three-flow acceptance used the substitute development provider. See [ACCEPTANCE.md](./ACCEPTANCE.md) for the exact runs. Edit `.env.local` and restart:

```dotenv
AI_PROVIDER=orbio
AI_BASE_URL=https://api.orbio.so/api/v1
AI_API_KEY=<your Orbio-issued key>
AI_MODEL=deepseek/deepseek-v4.1-flash
```

The current [Orbio gateway](https://www.orbio.so/) uses `https://api.orbio.so/api/v1` for OpenAI-compatible chat. `/api` alone is the Anthropic-compatible base. Older OpenRouter-issued keys described in the [starter](https://github.com/aster2709/orbio-starter) use `https://openrouter.ai/api/v1` instead; match the endpoint to the issuer of your key. Both base URL and full `/chat/completions` URL are accepted. Switching configuration changes all model inference, not just branding. The adapter omits `parallel_tool_calls`: sending `false` caused this Orbio/model combination to return HTTP 404, while the same request without it succeeded. Returned tool calls are executed sequentially by the application.

## Data handling and implementation

Keys remain in ignored server-side `.env.local`; never use `VITE_` for secrets. Submitted messages, selected NFT metadata and evidence go to the configured model. Wallet inventory queries go to Blockscout. Untrusted asset images are not loaded into the user's browser, and unverified destination URLs are not promoted into clickable source links.

Public URL reads block local/private destinations and check/pin DNS through redirects. A compatibility fallback resolves VPN fake-IP DNS via Cloudflare DoH. Ordinary pages are limited to 1 MB; the fixed public threat-feed URL has a 16 MB cap. No arbitrary page content is executed.

`src/` UI · `server/consumer.ts` inputs/discovery/wallet/tools · `server/agent.ts` tool loop and evidence validation · `server/network.ts` source reader · `server/store.ts` local history · `tests/` behavior checks.

Keep it simple: one React app and Node API; local JSON for local use, browser history for Vercel. Rules are in [agent.md](./agent.md). The interface was developed using the UI/UX Pro Max workflow. Local agent tooling is excluded from the repository and is not needed to install, test or run the app.

## Validate

```sh
npm test
npm run build
```

Unit/behavior tests use fixtures, do not spend model credits, and cover input resolution, independent provenance requirements, failed source reads, exact domain matching, citation validation, cancellation and persistence. Live acceptance results and untested boundaries are recorded in [ACCEPTANCE.md](./ACCEPTANCE.md).


## Language and source follow-up (2026-09-17)

The interface defaults to the browser's preferred supported language (Chinese or English, English fallback). A header selector allows a saved override or a return to browser defaults. Each new run saves its output language; rechecks use the current selection. Historical reports and source quotations keep their original text. Switching the interface language does not call the model.

Message checks distinguish page content from source identity. A page with a matching statement but no independently confirmed identity can return `source_supported`. An official homepage linking to an exact X/Twitter profile can authenticate that profile and its posts when the report cites both sources. The official directory now includes Arc, independently checked against [Circle's introduction](https://www.circle.com/blog/introducing-arc-an-open-layer-1-blockchain-purpose-built-for-stablecoin-finance). No general web-search service is connected.

The eight-URL limit applies to original input only. Extracted page links are retained for follow-up, including links in navigation. Source failures save the attempted URL and a typed cause (local URL rejection, HTTP status, DNS, connection, timeout, size or redirect limit). Historic errors that did not save this information are not retroactively assigned a cause.


## Pages

- `/`: bilingual product homepage with an animated evidence sphere, three intent cards, interactive process illustration and FAQ.
- `/app`: the investigation workspace. `/app?flow=wallet`, `purchase` or `message` selects an initial intent.
- `/app?case=<id>`: a saved report. Existing `/?case=<id>` links redirect without changing the case.

The landing page uses native Canvas/CSS/SVG, respects reduced motion and has a pause control. It makes no API or model requests. Homepage and app share the browser-default/saved language preference and load as separate route chunks. No additional package is required.
