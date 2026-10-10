import test from "node:test";
import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { fixtureArchive } from "./fixtures.mjs";
import { handleMcp, publicOrigin } from "../src/web.mjs";

test("the hosted transport supports the official MCP client and bounds incoming requests", async () => {
  const client = new Client({ name: "hosted-transport-check", version: "1.0.0" });
  const endpoint = publicOrigin + "/mcp";
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    fetch: (url, options) => handleMcp(new Request(url, options), fixtureArchive),
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 4);
    const result = await client.callTool({ name: "search", arguments: { query: "memory" } });
    assert.equal(result.structuredContent.results[0].author, "Drew Wiberg");
    const article = await client.callTool({ name: "fetch", arguments: { id: result.structuredContent.results[0].id } });
    assert.equal(article.structuredContent.next_offset, null);
  } finally { await client.close(); }
  assert.equal((await handleMcp(new Request(endpoint, { method: "POST", body: "x".repeat(65_537) }), fixtureArchive)).status, 413);
  assert.equal((await handleMcp(new Request(endpoint, { method: "POST", body: "{" }), fixtureArchive)).status, 400);
  assert.equal((await handleMcp(new Request(endpoint, { method: "POST", headers: { Origin: "https://foreign.example" }, body: "{}" }), fixtureArchive)).status, 403);
  assert.equal((await handleMcp(new Request("https://foreign.example/mcp", { method: "POST", body: "{}" }), fixtureArchive)).status, 403);
});
