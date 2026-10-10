import { handleMcp } from "../../src/web.mjs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleMcp(request); }
export function GET() { return new Response("Use POST for MCP requests.", { status: 405, headers: { Allow: "POST" } }); }
export const DELETE = GET;
