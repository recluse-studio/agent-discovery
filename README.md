# Recluse Studio archive plugin

Search Recluse Studio’s published articles, read their source passages, and cite the original author and article URL.

## Connect

Public Streamable HTTP endpoint:

    https://recluse-agent-discovery.drewwiberg.chatgpt.site/api/mcp

The service requires no account, API key, or OAuth login. Add that endpoint in a client that supports remote MCP. Download the portable Agent Plugins and Claude packages from [Releases](https://github.com/recluse-studio/agent-discovery/releases).

For Claude Code:

    claude plugin marketplace add recluse-studio/agent-discovery
    claude plugin install recluse-studio@recluse-studio

The plugin includes a source-reading skill. The hosted service supplies the article archive, so plugin installation does not require installing this repository’s development dependencies.

## Tools

| Tool | Input | Output |
| --- | --- | --- |
| search | query; limit 1–8, default 5 | Ranked articles and up to three source passages per result. |
| fetch | article id; offset; limit 1–12, default 12 | Numbered passages, source links, total_passages, next_offset. |
| latest_posts | limit 1–8; offset | Articles in publication-date order. |
| related_posts | article id; limit 1–8 | Articles sharing curated topics, with the shared topics identified. |

Each article result includes its title, author, publication date, canonical URL, and a hash of the extracted text. Each successful tool call includes the archive retrieval time. Follow fetch.next_offset until it is null to read the complete article.

Try: “Find Recluse Studio’s articles about agent memory. Read the relevant passages and explain their approaches, citing each article.”

Search uses BM25 text ranking with title and curated-topic matches. The calling agent judges meaning and draws conclusions.

## Sources and data handling

The service reads only the public [semantic index](https://recluse.studio/blog/semantic-model.json) and its canonical article pages. Redirects and caller-supplied fetch URLs are rejected. Local drafts and private files are outside the retrieval path.

The in-memory archive refreshes on the first request after 15 minutes. A refresh replaces the snapshot after every indexed article loads successfully. A failed refresh reports a retrieval error and retries after 30 seconds. Article removals enter the next successful snapshot.

The parser extracts article text from rendered HTML and normalizes display whitespace. Passage numbers identify connector chunks. They are not website anchors. Source links inside each article are returned separately.

The application does not persist tool arguments, reader identities, or conversations. Hosting providers process request traffic under their own policies. Read the [privacy statement](https://recluse-agent-discovery.drewwiberg.chatgpt.site/privacy), [use and attribution terms](https://recluse-agent-discovery.drewwiberg.chatgpt.site/terms), and [support page](https://recluse-agent-discovery.drewwiberg.chatgpt.site/support).

## Develop

Requires Node.js 22.13 or newer.

    npm ci --ignore-scripts
    npm test
    npm run dev

The hosted application uses the Sites Vinext starter and Cloudflare Workers. Its Web-standard HTTP adapter shares the archive parser, search, and tools with the Node transports.

Run the standalone Node HTTP service:

    npm run start:node

This listens at http://127.0.0.1:8787/mcp. To use stdio, run:

    node src/stdio.mjs

For a separate Node host behind HTTPS:

    HOST=0.0.0.0 PORT=8787 PUBLIC_MCP_URL=https://YOUR-HOST/mcp npm run start:node

The Node server checks Host and Origin. Both HTTP transports limit request bodies to 64 KiB. Tool schemas bound query length and result sizes. Source responses are limited to 2 MB, four concurrent fetches, and a 20-second timeout per request.

## Verify and package

    npm test
    npm run check:live
    npm run check:deployed
    npm run package:remote -- https://recluse-agent-discovery.drewwiberg.chatgpt.site/api/mcp

The local live check starts and closes a temporary HTTP service. The deployed check uses the public HTTPS endpoint without credentials. Evidence is saved under evidence/.

The package command writes portable and Claude ZIPs plus submission metadata into a new dist/remote-* directory. ZIPs contain connection manifests and the research skill.

## Publication

GitHub holds the public source and downloadable releases. The Sites source helper synchronizes the same Git commit to the connected hosting service; its saved version records the deployed source commit. The hosting project is declared in .openai/hosting.json.

Provider directory review is separate from this public release. Submission materials are in submissions/. Current provider status is recorded there.

## Support

[Open an issue](https://github.com/recluse-studio/agent-discovery/issues/new) for connection or attribution errors. Use [private vulnerability reporting](https://github.com/recluse-studio/agent-discovery/security/advisories/new) for security issues.
