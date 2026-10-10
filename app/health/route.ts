import { archive } from "../../src/web.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snapshot = await archive.snapshot();
    return Response.json({ status: "ready", publication: "Recluse Studio", articles: snapshot.posts.length, retrieved_at: snapshot.retrieved_at }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable", error: "The public archive could not be loaded." }, { status: 503 }); }
}
