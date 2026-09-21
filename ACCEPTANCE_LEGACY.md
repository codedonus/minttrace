# Acceptance — 2026-09-17

Development backend: the user-provided gateway with `deepseek-v4.1-flash`. Credentials are excluded from this report and remain in `.env.local`.

## Completed

- TypeScript check and Vite production build pass.
- 11 automated behavior tests pass: model-selected tool loop, citation checks, false-match rejection, budget stop, cancellation, safe provider failures, unavailable sources, persistence/restart, input/network checks, development gateway response normalization, and same-address query deduplication.
- Real model + synthetic lookalike evidence: completed in 3 model calls, 5 evidence records, verdict `conflict_found`.
- Real model + live Loot #1: completed in 2 model calls, 5 evidence records, verdict `matches_reference`. Contract, ERC-721 metadata and website were fetched from the live network.
- Real model + synthetic companion evidence: completed with `unverified`. The source announces a companion but gives no address; the model did not declare fraud or claim authorization.
- Browser: live form submission, sample scenario selection, citation navigation, watchlist saving/filtering, stop, recheck and keyboard arrow navigation between tabs verified.
- Markdown and JSON exports return the saved evidence and actual provider details.
- Responsive layout checked at 375, 768, 1024 and 1440px; no page-level horizontal overflow. Mobile investigation form visually checked.
- Browser console has no errors in the final production session.
- Public API configuration and built browser assets contain no model key. `.env.local` has mode 0600. Only Codex's UI/UX skill configuration is installed.

## Findings addressed

The development gateway wraps responses in `data`; the adapter now supports it as well as standard OpenAI-compatible responses. Request headers use ASCII. VPN fake-IP DNS answers are resolved to checked public addresses. A public IPFS gateway returned HTTP 429, so the default was changed to a successfully tested gateway and made configurable. Duplicate requests for the same contract are suppressed; embedded artwork is represented by its reference hash to avoid unnecessary model tokens.

## Deliberate limits and remaining acceptance

Actual Orbio-key testing is pending the key and matching endpoint, as requested. The application currently shows Development, and no sponsor-funded inference has been claimed.

Source ownership is user-designated, and image pixels are not compared. Some JavaScript-only websites provide little readable evidence; expensive on-chain metadata methods can be rejected by a public RPC. These conditions are reported as evidence gaps. A metadata read for Nouns was rejected by the public RPC; the working live acceptance case uses Loot. Watchlist checks are manual, with no background spending.

Local QA case records are in the ignored `data/` directory, including an early failed run and the deliberately stopped run. They are kept as an honest test history.
