import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { hostHeaderValidation, originValidation, NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { PublicArchive } from "./archive.mjs";
import { createArchiveServer } from "./mcp.mjs";

export function createHttpServer(archive, { publicUrl } = {}) {
  const allowedHosts = ["localhost", "127.0.0.1", "[::1]"];
  if (publicUrl) {
    const parsed = new URL(publicUrl);
    if (parsed.protocol !== "https:" || parsed.pathname !== "/mcp" || parsed.search || parsed.hash || parsed.username || parsed.password) {
      throw new Error("PUBLIC_MCP_URL must be an HTTPS URL ending in /mcp.");
    }
    allowedHosts.push(parsed.hostname);
  }
  const validateHost = hostHeaderValidation(allowedHosts);
  const validateOrigin = originValidation(allowedHosts);
  return createServer(async (req, res) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    if (req.url === "/health" && req.method === "GET") {
      try {
        const snapshot = await archive.snapshot();
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ status: "ready", publication: "Recluse Studio", articles: snapshot.posts.length, retrieved_at: snapshot.retrieved_at }));
      } catch {
        res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ status: "unavailable", error: "The public archive could not be loaded." }));
      }
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404);
      res.end("Use /mcp for the archive connector.");
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      res.end("The archive connector accepts POST requests.");
      return;
    }
    let server;
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 65_536) {
          res.writeHead(413);
          res.end("MCP request exceeds 64 KiB.");
          return;
        }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Request body must be valid JSON." } }));
        return;
      }
      server = createArchiveServer(archive);
      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => { void server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "The archive connector could not complete this request." }));
      } else if (!res.writableEnded) res.end();
      await server?.close();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535.");
  const host = process.env.HOST || "127.0.0.1";
  if (!["127.0.0.1", "localhost", "::1"].includes(host) && !process.env.PUBLIC_MCP_URL) {
    throw new Error("Set PUBLIC_MCP_URL before binding the connector to a public interface.");
  }
  const archive = new PublicArchive();
  await archive.snapshot();
  const server = createHttpServer(archive, { publicUrl: process.env.PUBLIC_MCP_URL });
  server.listen(port, host, () => console.error("Recluse Studio MCP is listening on " + host + ":" + port + "/mcp"));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => { server.close(); server.closeAllConnections(); });
  }
}
