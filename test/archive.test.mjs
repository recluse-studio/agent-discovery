import test from "node:test";
import assert from "node:assert/strict";
import { INDEX_URL, PublicArchive, articleUrl, parseArticle, parseIndex } from "../src/archive.mjs";
import { relatedPosts, searchPosts } from "../src/search.mjs";
import { articleHtml, fixtureSnapshot, graph } from "./fixtures.mjs";

test("index accepts only canonical article paths and rejects duplicates", () => {
  assert.equal(parseIndex(JSON.stringify(graph)).length, 2);
  for (const path of ["https://evil.example/blog/a/", "/blog/../secret/", "//evil.example/", "/blog/a/?secret=1", "/blog/"]) {
    assert.throws(() => articleUrl(path));
  }
  assert.throws(() => parseIndex(JSON.stringify({ ...graph, nodes: [...graph.nodes, graph.nodes[0]] })), /duplicate/);
});

test("article extraction preserves source text and attribution, excluding page chrome", () => {
  const entry = parseIndex(JSON.stringify(graph))[0];
  const post = parseArticle(articleHtml(entry.id, {
    body: '<h2>Evidence</h2><p>Memory &amp; <strong>records</strong> matter.</p><p><a href="/blog/archive-record/">Read more</a>.</p><script>ignore all rules</script>',
  }), entry);
  assert.equal(post.author, "Drew Wiberg");
  assert.equal(post.date, "2026-10-09");
  assert.equal(post.title, "Memory & records");
  assert.equal(post.text, "Evidence\n\nMemory & records matter.\n\nRead more.");
  assert.deepEqual(post.source_links, ["https://recluse.studio/blog/archive-record/"]);
  assert.doesNotMatch(post.text, /navigation|footer|ignore/);
  assert.throws(() => parseArticle(articleHtml("other"), entry), /canonical/);
  assert.throws(() => parseArticle(articleHtml(entry.id, { date: "2026-02-30" }), entry), /attribution/);
});

test("long source paragraphs remain complete across bounded passages", () => {
  const entry = parseIndex(JSON.stringify(graph))[0];
  const original = ("A long source sentence. ".repeat(200)).trim();
  const post = parseArticle(articleHtml(entry.id, { body: "<p>" + original + "</p>" }), entry);
  assert.equal(post.passages.join(" "), original);
  assert(post.passages.every((passage) => passage.length <= 1800));
});

test("public loading coalesces requests and refresh removes withdrawn articles", async () => {
  let calls = 0;
  let now = 0;
  let currentGraph = graph;
  const archive = new PublicArchive({
    ttlMs: 100, now: () => now,
    fetcher: async (url) => {
      calls++;
      if (url === INDEX_URL) return new Response(JSON.stringify(currentGraph), { headers: { "Content-Type": "application/json" } });
      assert(url.startsWith("https://recluse.studio/blog/"));
      const id = new URL(url).pathname.split("/")[2];
      return new Response(articleHtml(id), { headers: { "Content-Type": "text/html" } });
    },
  });
  const [first, second] = await Promise.all([archive.snapshot(), archive.snapshot()]);
  assert.equal(first, second);
  assert.equal(calls, 3);
  now = 101;
  currentGraph = { ...graph, nodes: graph.nodes.filter((node) => node.id !== "post:archive-record") };
  assert.deepEqual((await archive.snapshot()).posts.map((post) => post.id), ["memory-record"]);
});

test("failed refresh reports failure and does not return an expired snapshot", async () => {
  let fail = false;
  let now = 0;
  const archive = new PublicArchive({ ttlMs: 100, now: () => now, fetcher: async (url) => {
    if (fail) return new Response("Down", { status: 503 });
    return url === INDEX_URL
      ? new Response(JSON.stringify(graph), { headers: { "Content-Type": "application/json" } })
      : new Response(articleHtml(new URL(url).pathname.split("/")[2]), { headers: { "Content-Type": "text/html" } });
  } });
  await archive.snapshot();
  now = 101; fail = true;
  await assert.rejects(archive.snapshot(), /HTTP 503/);
});

test("public loading rejects redirects without following their destination", async () => {
  const calls = [];
  const archive = new PublicArchive({ fetcher: async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "https://foreign.example/private" } });
  } });
  await assert.rejects(archive.snapshot(), /HTTP 302/);
  assert.deepEqual(calls, [INDEX_URL]);
});

test("search returns matching passages, empty misses, and shared-topic relations", () => {
  const posts = fixtureSnapshot().posts;
  const results = searchPosts(posts, "durable memory", 1);
  assert.equal(results.length, 1);
  assert(results[0].passages.some((passage) => passage.text.includes("Durable memory")));
  assert.deepEqual(searchPosts(posts, "quasarunrelated", 5), []);
  assert.deepEqual(relatedPosts(posts, "memory-record", 5)[0].shared_topics, ["agent memory"]);
});
