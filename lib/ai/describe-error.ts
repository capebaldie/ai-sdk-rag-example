/**
 * Turns a thrown error into a message worth showing a user.
 *
 * Walks the `cause` chain: Drizzle wraps the real ETIMEDOUT inside a
 * "Failed query: select ..." message, and the AI SDK wraps provider 429s, so
 * the top-level message alone is both useless and leaky.
 */
export function describeError(error: unknown): string {
  const chain: string[] = [];
  for (let e = error; e instanceof Error; e = e.cause)
    chain.push(e.message, String((e as { code?: unknown }).code ?? ""));
  const text = chain.join(" ");

  if (/quota|rate.?limit|\b429\b|RESOURCE_EXHAUSTED/i.test(text))
    return "Gemini free-tier quota reached. Wait a minute, then retry.";
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(text))
    return "Connection failed (model or database unreachable). Retry.";

  // ponytail: 200-char cap so an unmapped error is still readable in the
  // bubble. Give it its own branch above once you see it twice.
  return chain[0]?.slice(0, 200) || "Something went wrong. Retry.";
}
