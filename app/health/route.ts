import { archive } from "../../src/web.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snapshot = await archive.snapshot();
    return Response.json({ status: "ready", publication: "Recluse Studio", articles: snapshot.posts.length, retrieved_at: snapshot.retrieved_at }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : "The public archive could not be loaded."; console.error("Public archive load failed:", message); return Response.json({ status: "unavailable", error: message }, { status: 503 }); }
}
