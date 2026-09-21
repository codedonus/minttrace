# MintTrace 需求调查 · 2026-09-17

## 决策

三个场景均有可观察的真实问题，值得做一个共用调查能力的小版本：陌生 NFT 收件排查、NFT 购买前查出处、Web3 活动消息核验。保留 MintTrace 名称，定位为「Web3 来源核验助手」。用户交出已有线索，系统承担解析身份、找独立出处和解释下一步的工作。

这次是公开资料案头调查，不是用户访谈、规模统计或付费验证。社区帖子存在选择偏差；自述损失未经独立审计；不能从搜索到求助推断市场很大、产品一定有人用或有人愿意付费。三类问题也会重叠，不能把帖子数相加当作独立用户数。

## 逐项证据与产品决定

| 场景 | 可核查的观察 | 能支持什么 | 产品决定 |
| --- | --- | --- | --- |
| 钱包出现陌生 NFT | [Exodus 用户求助，2025-08-10](https://www.reddit.com/r/ExodusWallet/comments/1mmm9b7/received_a_random_nft_in_my_wallet/)：第一次收到陌生 NFT，描述要求到站外连接钱包领取奖励；碰巧此前刚取消质押，因此不敢直接断定；正文已读取。另有 [Coinbase 钱包用户求助，2024-12-13](https://www.reddit.com/r/CoinBase/comments/1hdlc83)：收到声称高额奖励的 NFT 后担心钱包出问题，搜索结果正文可见。 | 用户需要知道“这个东西在诱导什么、收到它意味着什么、现在要不要处理”，不只是查黑名单。不能证明用户的钱包实际被盗。 | 输入公开钱包地址列出资产，用户选择陌生 NFT；也能直接交资产链接。核验描述和其中的网址，给出隐藏/忽略等不需要签名的下一步。不能把全部陌生资产标为恶意。 |
| 购买前分辨仿冒 | [CryptoHelp 用户自述，2025-10-16](https://www.reddit.com/r/CryptoHelp/comments/1o8c37q)：在 OpenSea 铸造了自认为是仿冒的系列，原因是名字、设计与正版相似；搜索索引返回完整帖文，直接打开受到平台限制。该帖不能证明平台退款或损失细节。 | “已经在大平台上”并不能消除用户对藏品身份的疑问。具体损失是用户自述，不当成审计事实。 | 用户只贴单件商品链接；系统解析资产并找独立官方页面核对。不能要求用户先提供正确合约，也不承诺价格、卖家或交易安全。 |
| 空投、白名单、活动消息 | [Pudgy Penguins 社区求助，2025-08-18](https://www.reddit.com/r/PudgyPenguins/comments/1mu2dbi)：搜索摘要中用户询问收到的邮件是否真实，评论讨论是否又有空投；该页直接读取返回 429，未读取截图和邮件全文。再结合 [Ethereum 官方防骗说明](https://ethereum.org/security) 对冒充项目人员、活动和站外领取诱导的说明。 | 存在具体的“收到消息后向社区求证”的行为。Pudgy 案例只能支持求证需求，不能支持我们判定那封邮件的真伪，也不能单独证明广泛需求。 | 粘贴原消息/链接；从系统维护的官方入口跟进公告，核对时间、主张和目的地；查不到就标明缺口。 |

## 现有产品覆盖与剩余机会

- [OpenSea 隐藏资产说明](https://support.opensea.io/en/articles/8867101-what-nfts-and-tokens-are-in-hidden-status-on-my-profile)和 [MetaMask NFT 空投骗局说明](https://support.metamask.io/stay-safe/protect-yourself/nfts/nft-airdrop-scams/)说明已有过滤与教育机制。收到 NFT 本身不等于钱包被盗，不能制造恐慌来推销产品。
- [OpenSea 防伪和防骗说明](https://opensea.io/learn/web3/how-to-stay-protected-in-web3)介绍图像识别、人工审核以及用户核对出处的工作；[举报流程](https://support.opensea.io/en/articles/8867071-how-can-i-report-fraudulent-or-disruptive-content-on-opensea)仍要求相关证据。MintTrace 的机会是替普通用户完成查出处的步骤，而不是重复一个平台徽章。
- [Scam Sniffer](https://www.scamsniffer.io/)已有扩展和域名情报；其 [公开数据库](https://github.com/scamsniffer/scam-database)说明公共数据延迟 7 天、GPL-3.0 许可。这意味着“输入链接，AI 给个分”不足以构成差异。产品使用公共域名数据作为一项有来源的证据，未命中绝不能当成安全。

剩余机会是本次调查的产品推断：将散落在元数据、官网和公告中的资料整理成一次易理解的核验，减轻用户自己找答案的负担。尚未证明它优于现有钱包提示或通用聊天工具。

## 实现范围与技术可行性

- 钱包：Ethereum ERC-721 / ERC-1155，Blockscout 公开索引，按页读取 50 件，用户选择目标。没有把索引排序说成最新收件排序。[接口文档](https://docs.blockscout.com/api-reference/get-list-of-nft-owned-by-address)。实测公共接口无需另配密钥即可读取与翻页。
- 商品：OpenSea 的 `/assets/ethereum/...`、`/item/ethereum/...` 和 Etherscan 单件 NFT 链接。系统从 URL 提取身份，再查询主网、元数据与官方资料。
- 官方入口：Loot、Nouns、Pudgy Penguins、Uniswap、Orbio 五个项目。目录用于独立建立入口身份，实际结论需要重新读取对应页面，不能只看目录。页面中找到的公告链接允许继续查阅。不是全网搜索；其他项目不冒充已覆盖。
- 活动：核对公开公告及输入网址，区分已知风险、具体冲突和无法确认。没有个人资格判断、交易模拟或自动领取。
- Agent：模型选择工具与后续页面，工具返回有时间戳的证据；系统校验引用、官方页面和正面结论的最小证据。开发推理使用用户指定的替代接口；Orbio 真 key 实测留待用户提供。

## 接下来怎样验证产品需求，而不靠加功能自证

找 3 位实际遇到这些情况的人，各拿自己的原始线索试用，观察是否无需解释“合约”即可开始、是否减少手动查资料、是否知道看完该做什么；记录下次是否主动再用。测试集至少覆盖正常出处、仿冒或已知风险、过期消息、未知项目和无法读取的来源。系统能完成一次核验不等于需求成立，真实用户复用与付费仍未验证。
