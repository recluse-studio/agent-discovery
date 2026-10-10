import { createHash } from "node:crypto";
import { parseDocument } from "htmlparser2";

export const SITE_ORIGIN = "https://recluse.studio";
export const INDEX_URL = SITE_ORIGIN + "/blog/semantic-model.json";
const ARTICLE_PATH = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;
const BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "li", "pre", "blockquote", "tr"]);
const OMIT = new Set(["script", "style", "noscript", "button", "iframe"]);

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children || []) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

function hasClass(node, name) {
  return (node.attribs?.class || "").split(/\s+/).includes(name);
}

function textOf(node, blocks = false) {
  if (!node || OMIT.has(node.name)) return "";
  if (node.type === "text") return node.data;
  if (node.name === "br") return "\n";
  const text = (node.children || []).map((child) => textOf(child, blocks)).join("");
  if (blocks && ["td", "th"].includes(node.name)) return text + " ";
  return blocks && BLOCKS.has(node.name) ? "\n\n" + text + "\n\n" : text;
}

function plain(node) {
  return textOf(node).replace(/\s+/g, " ").trim();
}

export function articleUrl(path) {
  if (typeof path !== "string" || !ARTICLE_PATH.test(path)) {
    throw new Error("Archive entry must use a canonical /blog/slug/ path.");
  }
  return SITE_ORIGIN + path;
}

export function parseIndex(source) {
  const graph = JSON.parse(source);
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error("Public archive index must contain nodes and links.");
  }
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
  const seen = new Set();
  const posts = graph.nodes.filter((node) => node.type === "post").map((node) => {
    const url = articleUrl(node.url);
    const id = node.url.match(ARTICLE_PATH)[1];
    if (seen.has(id) || node.id !== "post:" + id || typeof node.label !== "string") {
      throw new Error("Public archive index contains an invalid or duplicate post.");
    }
    seen.add(id);
    const topics = graph.links
      .filter((link) => link.source === node.id && link.kind === "mentions")
      .map((link) => labels.get(link.target))
      .filter((label) => typeof label === "string");
    return { id, url, title: node.label, topics: [...new Set(topics)] };
  });
  if (!posts.length || posts.length > 2000) {
    throw new Error("Public archive index must contain between 1 and 2000 posts.");
  }
  return posts;
}

export function parseArticle(html, entry) {
  const document = parseDocument(html);
  const canonical = find(document, (node) => node.name === "link" && node.attribs?.rel === "canonical");
  if (canonical?.attribs?.href !== entry.url) {
    throw new Error("Article canonical URL does not match its public archive entry: " + entry.id);
  }
  const prose = find(document, (node) => hasClass(node, "article-prose"));
  const header = find(document, (node) => hasClass(node, "field-note-header"));
  const byline = find(header || {}, (node) => hasClass(node, "post-byline"));
  const title = plain(find(header || {}, (node) => node.name === "h1"));
  const description = plain(find(header || {}, (node) => node.name === "p"));
  const author = plain(find(byline || {}, (node) => node.name === "span"))
    .replace(/\s*\/\s*Recluse Studio$/, "").trim();
  const date = find(byline || {}, (node) => node.name === "time")?.attribs?.datetime;
  if (!prose || !title || !author || !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error("Published article is missing its body or attribution: " + entry.id);
  }
  const paragraphs = textOf(prose, true).split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim()).filter(Boolean);
  const passages = [];
  for (let paragraph of paragraphs) {
    while (paragraph.length > 1800) {
      const breakAt = paragraph.lastIndexOf(" ", 1800);
      const end = breakAt > 0 ? breakAt : 1800;
      passages.push(paragraph.slice(0, end));
      paragraph = paragraph.slice(end).trimStart();
    }
    if (paragraph) passages.push(paragraph);
  }
  if (!passages.length) throw new Error("Published article has no readable text: " + entry.id);
  const text = passages.join("\n\n");
  const sourceLinks = new Set();
  function collectLinks(node) {
    if (node.name === "a" && node.attribs?.href) {
      try {
        const url = new URL(node.attribs.href, entry.url);
        if (["https:", "http:"].includes(url.protocol)) sourceLinks.add(url.href);
      } catch { /* Invalid article links are omitted from the link list. */ }
    }
    for (const child of node.children || []) collectLinks(child);
  }
  collectLinks(prose);
  return {
    ...entry, title, description, author, date, publication: "Recluse Studio",
    passages, text, source_links: [...sourceLinks],
    content_sha256: createHash("sha256").update(text).digest("hex"),
  };
}

async function readPublicText(url, fetcher) {
  const response = await fetcher(url, {
    headers: { "User-Agent": "RecluseStudioArchive/0.1 (+https://recluse.studio/blog/)" },
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("Public archive request failed with HTTP " + response.status + ": " + url);
  const expectedType = url === INDEX_URL ? "application/json" : "text/html";
  if (!(response.headers.get("content-type") || "").toLowerCase().includes(expectedType)) {
    throw new Error("Public archive returned an unexpected content type: " + url);
  }
  const maxBytes = 2_000_000;
  if (Number(response.headers.get("content-length") || 0) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Public archive response exceeds 2 MB: " + url);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error("Public archive response exceeds 2 MB: " + url);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export class PublicArchive {
  #snapshot;
  #pending;
  #retryAfter = 0;
  #lastError;

  constructor({ fetcher = fetch, ttlMs = 900_000, now = Date.now } = {}) {
    this.fetcher = fetcher;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  async snapshot() {
    if (this.#snapshot && this.now() - this.#snapshot.loadedAt < this.ttlMs) return this.#snapshot;
    if (this.#pending) return this.#pending;
    if (this.now() < this.#retryAfter) throw this.#lastError;
    this.#pending = this.#load().catch((error) => {
      this.#lastError = error;
      this.#retryAfter = this.now() + 30_000;
      throw error;
    }).finally(() => { this.#pending = undefined; });
    return this.#pending;
  }

  async #load() {
    const entries = parseIndex(await readPublicText(INDEX_URL, this.fetcher));
    const posts = new Array(entries.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (next < entries.length) {
        const index = next++;
        posts[index] = parseArticle(await readPublicText(entries[index].url, this.fetcher), entries[index]);
      }
    }));
    posts.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    const loadedAt = this.now();
    this.#snapshot = {
      posts, loadedAt, retrieved_at: new Date(loadedAt).toISOString(),
      source: INDEX_URL,
    };
    return this.#snapshot;
  }
}
