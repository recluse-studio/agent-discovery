# Provider submission packet

Prepared on 10 October 2026 for the Recluse Studio public archive connector.

## Materials

- listing.json: listing copy, public website and policy URLs, endpoint, and release notes.
- logo.png: 512 × 512 pixel PNG logo.
- test-cases.json: five positive cases and three negative cases.
- ../submission.json: authentication, data access, and tool summary.
- ../README.md: setup, tool inputs and outputs, request bounds, refresh behavior, and support.
- ../evidence/public-check.json: anonymous public endpoint verification, when present.
- GitHub Releases: portable Agent Plugins and Claude ZIP packages.

## Current portal status

Checked on 10 October 2026. All three provider accounts are signed in.

| Provider | Verified status | Receipt |
| --- | --- | --- |
| OpenAI | In review; MCP configured; not published. | [Submission](https://platform.openai.com/plugins/manage/plugin_asdk_app_6aca82cb14ac8191a7b4c029033f6683) |
| Claude | In review; security scan passed; not live. | [Submission](https://claude.ai/directory/manage/plugins/722d7a2e-db83-42d6-ac68-67057dadbf1e) |
| Muse | Submission received; review pending. | [Confirmation](https://muse.ai/platform/submissions/ff26e4be-4253-4077-ab3f-bc7b029e9411/confirmation) |

Drew completed the final submissions. Each provider's visible portal confirmed receipt on 10 October 2026. Local screenshots are retained under outputs/submission-proof/. The public service and GitHub release remain available during directory review.

## OpenAI

The submission uses the portable 0.1.2 ZIP and the verified developer identity shown in the portal. Metadata uses Education & Research. The domain challenge is deployed at /.well-known/openai-apps-challenge and verified by OpenAI.

The five positive cases cover search, article retrieval, recent posts, and related posts. The three negative cases cover publishing, private drafts, and live retailer purchases; they describe requests that should not invoke this plugin. Separate input-validation cases remain in test-cases.json.

Review submission: https://platform.openai.com/plugins/manage/plugin_asdk_app_6aca82cb14ac8191a7b4c029033f6683

Review walkthrough: https://github.com/recluse-studio/agent-discovery/releases/download/v0.1.2/recluse-studio-chatgpt-walkthrough.mp4

The 77-second video records ChatGPT using the connected Recluse Studio Archive. The responses cite the Donner B1 review, list recent articles, return a related article with shared topics, compare agent-memory articles, and identify knowledge-management articles. The demonstration uses the Sites-managed authenticated /mcp connection. The directory submission uses the separately verified public /api/mcp endpoint. Both transports call the same archive tools. The visible conversation is retained in evidence/chatgpt-demonstration.txt.

## Claude

Validated source: https://github.com/recluse-studio/agent-discovery/tree/main/plugins/recluse-studio

The installable bundle contains nine files and is 18 kB. Seven validator checks passed. Five nonblocking warnings concern directory-only fields ignored by Claude Code at runtime. No credential or dependency review hold remains.

The listing names Claude Code, Cowork, and Claude apps as its intended surfaces. The bundle contains one source-reading skill and one remote MCP server. The submitted version is v0.1.1 at 85ae94f, and its security scan passed. The portal records the publication request and waits for an Anthropic reviewer. Automatic GitHub updates await the first signed webhook delivery.

## Muse

The connector uses the public endpoint with no authentication or payment requirement. Three example prompts cover article comparison, a specific product review, and topic-based retrieval. The submitted listing includes the 512 × 512 icon and all required contact and policy fields. Muse issued confirmation ff26e4be-4253-4077-ab3f-bc7b029e9411.

## Data-processing answers

The service receives only the tool arguments used to answer a request. It reads the public Recluse Studio semantic index and article pages. Application code stores article text in memory and does not persist queries or conversations. It has no user database, advertising analytics, private-account integration, purchase tool, or write tool. Hosting providers process request traffic under their own policies. Article content remains attributed to its original author. Cache refresh and tool error behavior are documented in the main README.
