import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const origin = "https://recluse-agent-discovery.drewwiberg.chatgpt.site";
const client = new Client({ name: "recluse-public-release-check", version: "1.0.0" });
const evidence = { checked_at: new Date().toISOString(), endpoint: origin + "/api/mcp", authentication: "none", checks: [] };
try {
  const response = await fetch(origin + "/health");
  assert.equal(response.status, 200);
  evidence.health = await response.json();
  assert.equal(evidence.health.status, "ready");
  await client.connect(new StreamableHTTPClientTransport(new URL(evidence.endpoint)));
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["fetch", "latest_posts", "related_posts", "search"]);
  assert(tools.every((tool) => tool.annotations.readOnlyHint));
  for (const query of ["Donner B1", "agent memory", "knowledge management"]) {
    const result = await client.callTool({ name: "search", arguments: { query } });
    assert(!result.isError);
    const first = result.structuredContent.results[0];
    assert(first.url.startsWith("https://recluse.studio/blog/"));
    assert.equal(first.author, "Drew Wiberg");
    const article = await client.callTool({ name: "fetch", arguments: { id: first.id, limit: 1 } });
    assert.equal(article.structuredContent.url, first.url);
    assert.equal(article.structuredContent.passages.length, 1);
    if (article.structuredContent.next_offset !== null) {
      const next = await client.callTool({ name: "fetch", arguments: { id: first.id, offset: article.structuredContent.next_offset, limit: 1 } });
      assert.equal(next.structuredContent.passages[0].passage, 2);
    }
    evidence.checks.push({ query, title: first.title, url: first.url, author: first.author, date: first.date, passage: article.structuredContent.passages[0].text });
  }
  const latest = await client.callTool({ name: "latest_posts", arguments: { limit: 3 } });
  assert.equal(latest.structuredContent.results.length, 3);
  const related = await client.callTool({ name: "related_posts", arguments: { id: latest.structuredContent.results[0].id } });
  assert(!related.isError);
  evidence.latest = latest.structuredContent.results.map(({ title, url, date }) => ({ title, url, date }));
  evidence.related_count = related.structuredContent.results.length;
  for (const args of [{ id: "unpublished-draft" }, { id: "../../private" }]) {
    const result = await client.callTool({ name: "fetch", arguments: args });
    assert(result.isError);
  }
  const excess = await client.callTool({ name: "search", arguments: { query: "memory", limit: 1000 } });
  assert(excess.isError);
  evidence.negative_checks = ["unknown article rejected", "path traversal rejected", "excess result count rejected"];
  for (const path of ["/", "/privacy", "/terms", "/support", "/favicon.svg"]) {
    assert.equal((await fetch(origin + path)).status, 200, path);
  }
  evidence.result = "passed";
  await writeFile(new URL("../evidence/public-check.json", import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
} finally { await client.close(); }
