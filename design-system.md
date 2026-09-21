# MintTrace design system

Based on the Codex UI/UX Pro Max skill. The product now has two deliberate surfaces sharing its fingerprint identity, forest green palette and evidence-first language.

## Product homepage · `/`

Dark forest (#101a15), pale lime (#cef59b), warm white (#f1f1e7). Large system-sans headlines with a serif second line; no external fonts or visual libraries. Use a slow Canvas evidence sphere around the fingerprint, source cards, scroll reveals and a clearly labeled illustrative report. Never present the illustration as a live investigation or start model calls from the landing page. Pause controls and reduced-motion preferences stop ambient motion; the Canvas also stops offscreen and in hidden tabs.

The homepage introduces the three consumer use cases, explains the investigation, discloses current coverage in the FAQ, and sends visitors to `/app`. Each use-case card selects its corresponding flow. Avoid invented customer counts, sponsor endorsements or security guarantees. Built for Orbio Build Week is attribution, not a claim of completed Orbio acceptance.

## Investigation app · `/app`

Warm paper background (#f6f5f2), white surfaces, ink (#202c26), forest (#315640), pale lime (#d5ee9d), amber/red only for semantic states. Restrained typography, visible focus and compact evidence layout. Green is never the only carrier of a verdict.

One input per intent, progressive wallet asset picker, verdict/next action before findings, expandable source details and recent history. No expert-input dialog or mandatory contract knowledge. Preserve development provider disclosure and mark synthetic examples explicitly.

## Shared behavior

Browser-default Chinese/English with a persistent manual override. SVG icons, visible keyboard focus, mobile menus with Escape dismissal, reduced motion and no hover-only functionality. Responsive checks at 375, 768, 1024 and 1440px. Old `/?case=…` URLs redirect in place to `/app?case=…`; existing report data is preserved. Route-level lazy loading keeps the homepage separate from the application bundle.
