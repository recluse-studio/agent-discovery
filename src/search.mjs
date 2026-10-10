const STOP_WORDS = new Set("a an and are as at be by for from has have how i in is it of on or that the this to was what when where which who with".split(" "));

export function terms(value) {
  return [...new Set((value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word)))];
}

export function reference(post) {
  return {
    id: post.id, title: post.title, url: post.url, author: post.author,
    publication: post.publication, date: post.date, description: post.description,
    topics: post.topics, content_sha256: post.content_sha256,
  };
}

export function searchPosts(posts, query, limit) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return [];
  const documents = posts.map((post) => {
    const tokens = (post.text + " " + post.title + " " + post.topics.join(" ")).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    return { post, counts, length: tokens.length, title: new Set(terms(post.title)), topics: new Set(terms(post.topics.join(" "))) };
  });
  const averageLength = documents.reduce((sum, doc) => sum + doc.length, 0) / (documents.length || 1);
  const frequency = new Map(queryTerms.map((term) => [term, documents.filter((doc) => doc.counts.has(term)).length]));
  return documents.map((doc) => {
    let score = 0;
    for (const term of queryTerms) {
      const tf = doc.counts.get(term) || 0;
      if (!tf) continue;
      const df = frequency.get(term);
      const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
      score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * doc.length / averageLength));
      if (doc.title.has(term)) score += idf * 2;
      if (doc.topics.has(term)) score += idf;
    }
    const passages = doc.post.passages.map((text, index) => ({
      passage: index + 1, text,
      matches: queryTerms.filter((term) => terms(text).includes(term)).length,
    })).filter((passage) => passage.matches > 0)
      .sort((a, b) => b.matches - a.matches || a.passage - b.passage)
      .slice(0, 3).map(({ passage, text }) => ({ passage, text }));
    return { ...reference(doc.post), score: Math.round(score * 1000) / 1000, passages };
  }).filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function relatedPosts(posts, id, limit) {
  const post = posts.find((item) => item.id === id);
  if (!post) throw new Error("Article was not found in the public archive: " + id);
  return posts.filter((item) => item.id !== id).map((item) => ({
    ...reference(item), shared_topics: item.topics.filter((topic) => post.topics.includes(topic)),
  })).filter((item) => item.shared_topics.length)
    .sort((a, b) => b.shared_topics.length - a.shared_topics.length || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
