import { parseArticle, parseIndex } from "../src/archive.mjs";

export const graph = {
  nodes: [
    { id: "post:memory-record", type: "post", label: "Memory record", url: "/blog/memory-record/" },
    { id: "post:archive-record", type: "post", label: "Archive record", url: "/blog/archive-record/" },
    { id: "kind:memory", type: "kind", label: "agent memory" },
  ],
  links: [
    { source: "post:memory-record", target: "kind:memory", kind: "mentions" },
    { source: "post:archive-record", target: "kind:memory", kind: "mentions" },
  ],
};

export function articleHtml(id, { date = "2026-10-09", title = "Memory & records", body = "<p>Durable memory preserves the original source.</p><p>Another passage.</p>" } = {}) {
  return '<html><head><link rel="canonical" href="https://recluse.studio/blog/' + id + '/"></head><body>' +
    '<nav>Unrelated navigation text</nav><article><header class="field-note-header"><h1>' + title + '</h1><p>Article description.</p>' +
    '<div class="post-byline"><time datetime="' + date + '">Date</time><span>Drew Wiberg / Recluse Studio</span><span>3 kinds</span></div></header>' +
    '<div class="article-prose">' + body + '</div></article><footer>Unrelated footer</footer></body></html>';
}

export function fixtureSnapshot() {
  const posts = parseIndex(JSON.stringify(graph)).map((entry) => parseArticle(articleHtml(entry.id), entry));
  return { posts, retrieved_at: "2026-10-10T12:00:00.000Z", loadedAt: 0 };
}

export const fixtureArchive = { snapshot: async () => fixtureSnapshot() };
