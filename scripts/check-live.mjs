import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { PublicArchive } from "../src/archive.mjs";
import { createHttpServer } from "../src/http.mjs";

const archive = new PublicArchive();
const snapshot = await archive.snapshot();
const server = createHttpServer(archive);
server.listen(0, "127.0.0.1");
await once(server, "listening");
const endpoint = new URL("http://127.0.0.1:" + server.address().port + "/mcp");
const client = new Client({ name: "recluse-live-check", version: "0.1.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const tools = await client.listTools();
  const queries = ["Donner B1", "agent memory", "knowledge management"];
  const checks = [];
  for (const query of queries) {
    const result = await client.callTool({ name: "search", arguments: { query, limit: 3 } });
    assert(!result.isError);
    const matches = result.structuredContent.results;
    assert(matches.length, "No results for " + query);
    const first = matches[0];
    const fetched = await client.callTool({ name: "fetch", arguments: { id: first.id } });
    assert(!fetched.isError);
    assert.equal(fetched.structuredContent.url, first.url);
    assert.equal(fetched.structuredContent.author, first.author);
    assert(fetched.structuredContent.text.length > 0);
    const original = snapshot.posts.find((post) => post.id === first.id);
    assert(first.passages.every((passage) => original.passages[passage.passage - 1] === passage.text));
    checks.push({ query, title: first.title, url: first.url, author: first.author, date: first.date, matched_passages: first.passages.length });
  }
  const report = {
    checked_at: new Date().toISOString(),
    archive_retrieved_at: snapshot.retrieved_at,
    archive_source: snapshot.source,
    article_count: snapshot.posts.length,
    tools: tools.tools.map((tool) => tool.name),
    transport: "official MCP client over local Streamable HTTP",
    checks,
  };
  const evidence = new URL("../evidence/", import.meta.url);
  await mkdir(evidence, { recursive: true });
  await writeFile(new URL("live-check.json", evidence), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
