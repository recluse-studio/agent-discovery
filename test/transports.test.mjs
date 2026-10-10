import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { get } from "node:http";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createHttpServer } from "../src/http.mjs";
import { fixtureArchive } from "./fixtures.mjs";

async function exercise(client) {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["fetch", "latest_posts", "related_posts", "search"]);
  assert(tools.every((tool) => tool.annotations.readOnlyHint));
  const search = await client.callTool({ name: "search", arguments: { query: "durable memory" } });
  assert.equal(search.isError, undefined);
  assert(search.structuredContent.results[0].url.startsWith("https://recluse.studio/blog/"));
  const first = await client.callTool({ name: "fetch", arguments: { id: "memory-record", limit: 1 } });
  assert.equal(first.structuredContent.next_offset, 1);
  const second = await client.callTool({ name: "fetch", arguments: { id: "memory-record", offset: 1 } });
  assert.equal(second.structuredContent.next_offset, null);
  assert.equal(second.structuredContent.passages[0].passage, 2);
  const missing = await client.callTool({ name: "fetch", arguments: { id: "unpublished-draft" } });
  assert.equal(missing.isError, true);
  const latest = await client.callTool({ name: "latest_posts", arguments: { limit: 1 } });
  assert.equal(latest.structuredContent.results.length, 1);
  const related = await client.callTool({ name: "related_posts", arguments: { id: "memory-record" } });
  assert.equal(related.structuredContent.results[0].id, "archive-record");
}

test("official MCP client reads the archive through stdio", async () => {
  const client = new Client({ name: "recluse-check", version: "1.0.0" });
  try {
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("./fixture-stdio.mjs", import.meta.url))],
    }));
    await exercise(client);
  } finally { await client.close(); }
});

test("official MCP client reads the archive through HTTP; host and origin guards reject foreign requests", async () => {
  const server = createHttpServer(fixtureArchive);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  const client = new Client({ name: "recluse-check", version: "1.0.0" });
  try {
    const health = await fetch(base + "/health");
    assert.equal((await health.json()).articles, 2);
    await client.connect(new StreamableHTTPClientTransport(new URL(base + "/mcp")));
    await exercise(client);
    const foreignHostStatus = await new Promise((resolve, reject) => {
      get(base + "/health", { headers: { Host: "evil.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).on("error", reject);
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal((await fetch(base + "/mcp", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" })).status, 403);
    assert.equal((await fetch(base + "/mcp", { method: "POST", body: "bad json" })).status, 400);
    assert.equal((await fetch(base + "/mcp", { method: "POST", body: "a".repeat(70_000) })).status, 413);
    assert.equal((await fetch(base + "/mcp")).status, 405);
  } finally {
    await client.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
