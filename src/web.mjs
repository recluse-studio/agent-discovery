import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { PublicArchive } from "./archive.mjs";
import { createArchiveServer } from "./mcp.mjs";

export const publicOrigin = "https://recluse-agent-discovery.drewwiberg.chatgpt.site";
export const archive = new PublicArchive();

export async function handleMcp(request, source = archive) {
  const allowedOrigins = [publicOrigin, "http://localhost:3000", "http://127.0.0.1:3000"];
  if (!allowedOrigins.includes(new URL(request.url).origin)) return new Response("Unknown connector host.", { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) return new Response("Origin is not permitted.", { status: 403 });
  if (request.method !== "POST") return new Response("Use POST for MCP requests.", { status: 405, headers: { Allow: "POST" } });
  const reader = request.body?.getReader();
  const chunks = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > 65_536) {
        await reader.cancel();
        return new Response("MCP request exceeds 64 KiB.", { status: 413 });
      }
      chunks.push(result.value);
    }
  }
  const payload = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { payload.set(chunk, offset); offset += chunk.byteLength; }
  let parsedBody;
  try { parsedBody = JSON.parse(new TextDecoder().decode(payload)); }
  catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Request body must be valid JSON." } }, { status: 400 }); }
  const server = createArchiveServer(source);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request, { parsedBody });
    const body = await response.arrayBuffer();
    return new Response(body.byteLength ? body : null, { status: response.status, headers: response.headers });
  } finally { await server.close(); }
}
