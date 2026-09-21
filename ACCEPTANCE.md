# Consumer release acceptance · 2026-09-17

## Verified

- 17 behavior tests pass, including legacy loop/persistence/cancellation and new single-input parsing, independent source requirements, NFT existence, activity quotation/destination validation, exact domain matching, Markdown URLs, unknown sources and duplicate-read budget.
- TypeScript check and Vite production build pass.
- Actual browser: one input per task, scene switching, starting an activity investigation, progress/results, wallet inventory, loading the next 50 assets (50 → 100), selecting a real NFT, unsupported Base link error, report citation expansion and clipboard copy containing the official source URL.
- Responsive checks at 375, 768, 1024 and 1440px found no page-level horizontal overflow. Mobile report and desktop homepage were visually inspected. No browser warnings/errors observed in the inspected final session.
- Consumer Markdown export returned HTTP 200 with the download filename, original input, Chinese verdict and official source; old blank reference fields were removed.
- Real Scam Sniffer dataset fetched successfully after adjusting the fixed feed's limit: measured 9,014,738 bytes / 354,518 entries at test time. Known feed-listed domain returned a match. Ordinary untrusted webpage limits remain 1 MB; only the fixed feed uses 16 MB.
- Real Markdown NFT description `[url](url)` correctly yields one hostname after the regression fix.

## Real model + live data

All rows below used the requested development provider and `deepseek-v4.1-flash`; none used synthetic evidence. Final run metadata is in ignored local `data/consumer-acceptance.json`. These are functional acceptance checks, not an accuracy benchmark or customer validation.

| Flow | Case / run | Result |
| --- | --- | --- |
| Unfamiliar NFT | Public-wallet inventory → Bored Ape Nike Club #60. Final recheck `333cb58b-7b7b-45a5-baab-0201cc0cb796` | `unverified`; read actual metadata and external claim URL; domain check completed with no match and explicit 7-day limitation; unknown official identity remained unknown; inaccessible destination remained a reading limitation. Suggested hide/ignore without signing, transferring or burning. 4 model calls, 4 evidence records. |
| Purchase source | OpenSea Loot #1. `dfda63da-8b0a-4fea-bf94-2a4f7c35798e` | `matches_reference`; asset existence confirmed, official Loot page independently discovered and its collection address compared; no user reference supplied. 4 model calls, 3 evidence records. |
| Activity message | Deliberately incorrect Orbio message claiming applications on Sept 17 and $500 inference. `fcf5009c-400d-4a8e-81a9-1e191ce81d5a` | `conflict_found`; official page showed Sept 13 application deadline and $50 inference. Official-source and domain tools succeeded. 3 model calls, 3 evidence records. This test message was constructed for QA, not presented as a real circulating scam. |

## Findings fixed during acceptance

1. Full domain feed exceeded ordinary page limits; a separate cap for this fixed source was required.
2. NFT Markdown links were initially captured as one malformed URL; corrected extraction and added regression assertion.
3. A model draft inferred “not official” from no directory entry and inferred website condition from read failure. Instructions were tightened and the real case rerun; final output explicitly preserves both uncertainties. Semantic model error remains possible despite deterministic evidence checks.

Earlier QA runs are retained as historical records and can contain pre-fix limitations; use the final run IDs above for acceptance. The old contract-reference-workspace acceptance record is preserved separately in `ACCEPTANCE_LEGACY.md` and does not describe the current product.

## Honest boundaries

- Ethereum only; five project entry points. No full-web search, comprehensive scam detection, transaction simulation, wallet approval inspection or eligibility verification.
- Wallet ordering is index ordering, not newest arrival. Public index can lag. Metadata and descriptions are untrusted.
- Official pages and RPC may be inaccessible; one real destination was rejected because its resolved address was not public. This says nothing conclusive about maliciousness.
- Public blocklist delayed approximately 7 days; cache lasts one hour. A miss cannot establish safety.
- Localhost preview, single local history; no public multi-user deployment performed.
- No real-user interviews, willingness-to-pay study or representative accuracy study was conducted.
- The September 17 checks above used the substitute provider. Actual Orbio connectivity and the remaining reliability/accuracy gaps are recorded in the September 21 follow-up below.

## Follow-up: first-request timeout feedback

User case `bf32dca9-5024-45e0-83a1-a3bde149226a` (Arc主网上线了！) failed between 06:51:39 and 06:53:09 UTC: first model request timed out after 90 seconds, before any tool actions or evidence. The generic UI hid that distinction. No evidence identifies whether the local connection, gateway or upstream model caused the timeout.

- The UI now identifies model timeout, service rejection, cancellation and unavailable model results separately. A zero-evidence failure no longer tells the user to inspect nonexistent evidence. Old saved first-request timeout records receive the accurate display without altering the historical record.
- New model failures store only a typed category, timeout duration or HTTP status; no raw request/credentials are persisted.
- Unverified reports with empty official directory results disclose the coverage gap separately from service failure.
- Same-input live recheck `806febfe-56b8-4e74-a2fc-024927747bfb` completed in 17 seconds / 3 model replies. Its result remained unverified because Arc is not covered; this does not verify the mainnet claim or demonstrate full-web search.
- 20 behavior tests and production build passed after the change. New checks cover first-request timeouts, legacy display, retained partial evidence, cancelled requests and uncovered projects.


## 2026-09-17 中英文与 X 公告核验回归

- 原记录 `97a64a1a-1899-4154-ac09-fdf7169b5b59` 已读取 X 主页和置顶内容；E3/E5/E6 没有保存尝试网址，不能事后武断还原每个失败请求。
- 复现确定的问题：`extractUrls` 的用户输入 8 链接上限误用于整份网页证据。`https://t.co/BCNxhprAsF` 明明在 E1 的 links 中，却被应用的已观察网址检查拒绝（0 ms，未发请求）。另一个已保留的官网短链 `https://t.co/t7aoJN6ynT` 在本次复测约 1.9 秒正常跳转到 `https://www.arc.io/`。原来的无具体原因提示掩盖了应用逻辑问题。
- 修复：输入链接上限与证据链接分开；保留导航中的已观察链接；规范化网址；失败保存 URL 和具体类型。仍保留公开网络限制及页面读取预算，没有开放任意内网访问。
- 官方身份：Arc 官网入口依据 Circle 官方介绍独立核对后加入目录；每次调查仍实际读取官网，并使用其指向 X 账号的链接与帖子交叉核对。页面有声明但身份不明可返回 `source_supported`，区别于内容本身无法确认。未接入全网搜索。
- 语言：浏览器首选支持语言决定默认中英文，可手动切换/恢复自动；新报告和行动说明跟随所选语言，历史报告和来源原文不自动翻译；导出标题、界面错误、日期和来源读取错误有中英文。切换语言不产生模型调用。
- 英文真实验收 `e2035cd5-8d9c-4901-a02b-cee2a49608e3`：56 秒、3 次模型调用，读取 X 主页、Arc 官网、原始置顶帖，`matches_reference`，身份已核对。
- 中文中间验收 `a8584d1c-9519-4fc7-b5d9-6f5613317a78` 完成来源核对，但把庆祝活动日期误写成上线日期。保留原始记录，随后补充提示，要求区分公告/上线/庆祝日期并优先读取原始帖子。
- 最终中文验收 `5206e92c-773c-4039-824c-297e8a4f2778`：57 秒、3 次模型调用，读取 X 主页、Arc 官网和原始帖子 `https://x.com/arc/status/2100170550857404852`，确认 9 月 16 日公告称主网上线，`matches_reference`。原文与来源身份单独显示。
- 浏览器验证：自动中文、英文手动覆盖及刷新保持、恢复自动、历史报告语言提示；375 px 英文首页与长报告无横向溢出，默认尺寸中文报告正常。最终已恢复默认视口及自动语言。
- `npm test`：25/25 通过，覆盖晚出现链接、导航链接、身份交叉核对/伪造域名拒绝、引用必须真实、失败网址和原因保留、语言传递/导出。`npm run build` 通过。
- 以上仍使用 Development 模型接口；未声称完成真实 Orbio 推理验收。


## 2026-09-17 产品首页与独立应用页

- `/` 已改为中英文产品展示页；`/app` 为核验工作台。首页有可暂停的 Canvas 证据球体、三个场景入口、滚动显示、可切换调查步骤及常见问题。示意内容明确标记。
- 实际浏览器已检查 375 / 768 / 1024 / 1440 px 视口，无页面横向溢出；查看中英文首屏、场景、报告示意和 FAQ。手机菜单可打开并用 Escape 关闭；动画暂停/恢复、步骤切换及 FAQ 展开可用。
- 三个场景分别进入 `/app?flow=wallet|purchase|message`，对应场景已选中；语言偏好跨页面继承。旧 `/?case=5206e92c-773c-4039-824c-297e8a4f2778` 自动变为 `/app?case=…`，报告正文及刷新读取正常。
- 所检查页面未发现浏览器 console warning/error。首页验收没有启动新的调查或消耗模型额度。减弱动态效果由 CSS 媒体查询与 Canvas 监听共同处理；暂停后恢复保留球体位置。
- 25 项现有测试及 TypeScript / Vite 生产构建通过。没有公开部署或提交参赛；真实 Orbio 接口的最终验收仍待用户提供对应配置。


## 2026-09-21 Real Orbio key and application integration

- Used the actual user-configured Orbio key, kept only in ignored `.env.local`. Ordinary chat returned HTTP 200 / `OK` with the intended `deepseek/deepseek-v4.1-flash` model. The local UI and run metadata identify Orbio.
- Corrected the local configuration to the OpenAI-compatible `https://api.orbio.so/api/v1` base and the full model ID. `/api` alone is the Anthropic-compatible base. Updated the credential-free environment template and README for reproducibility.
- Diagnosed HTTP 404 from the original tool-call request: the gateway returned `model_not_available`. Removing only `parallel_tool_calls: false` from the otherwise identical probe allowed a real `find_official_sources` call. Removed that optional parameter from the adapter; the application already executes returned calls sequentially.
- Submitted the same public activity claim through the actual browser: “Orbio Build Week 是一个面向 AI Agent 开发者的活动，现在已开放项目提交。https://sellers.orbio.so/build”. No synthetic evidence or substitute inference was used in these runs.

| Run | Result |
| --- | --- |
| `97504787-3f3a-46b8-b623-fc34307e6d27` | Before the parameter fix: HTTP 404, zero successful model replies and no evidence. |
| `4a321ae6-63a3-48c0-9d0d-1430e9f04fb6` | After the fix: one model reply selected two real source reads. Both succeeded; the next model request exceeded 90 seconds. No final report. |
| `ba98ace2-4639-4112-b42a-20a0f76f3e34` | Completed in 46.8 seconds, two model replies, 12,250 reported tokens and two evidence records. Browser showed a cited report. Its conflict verdict was incorrect: it treated the end of applications/building as the end of submissions despite the page saying submissions were open. This is a connectivity result, not a passed accuracy check. |
| `f6947be9-15e1-4283-84c9-60cfe07efb67` | After the phase-distinction prompt fix: two model replies, 11,916 reported tokens and three real source records, including `/build/submit`. The final model request exceeded 90 seconds; no final report. The live run demonstrated following the submission link, but did not validate a corrected final verdict. |

- Added a general instruction to distinguish registration, building, submission and judging, follow the actual submission link and reconcile current status with the timeline. This does not hardcode an Orbio verdict or guarantee semantic accuracy.
- The cause of the two response timeouts beyond the configured 90-second wait is not established. A successful retry does not prove sustained availability; no automatic paid retries or model fallback were added.
- Final `npm test`: 25/25 pass. TypeScript check and Vite production build pass. Key and local investigation data remain ignored by Git; the current key is absent from tracked working files.
- Acceptance status: actual Orbio authentication and tool calling verified; reliable full-report acceptance remains incomplete. Wallet/purchase flows have not been rerun with the real Orbio key. No public deployment or competition submission was performed.
