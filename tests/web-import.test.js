import test from "node:test";
import assert from "node:assert/strict";
import { songUrl } from "../src/web-sources.js";
import { fetchSongPage } from "../server/web-import.js";
test("only supported public HTTPS hosts are accepted", () => {
  for (const url of [
    "http://acordes.lacuerda.net/a",
    "https://localhost/a",
    "https://127.0.0.1",
    "https://cifraclub.com.evil.test/a",
    "https://www.cifraclub.com:3000/a",
    "https://a:b@www.cifraclub.com/a",
    "file:///etc/passwd",
  ])
    assert.throws(() => songUrl(url));
  assert.equal(songUrl("https://www.cifraclub.com/a/b/#x").hash, "");
});
test("redirects are validated before another request", async () => {
  let count = 0;
  await assert.rejects(
    fetchSongPage("https://www.cifraclub.com/a/b/", async () => {
      count++;
      return new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/private" },
      });
    }),
  );
  assert.equal(count, 1);
});
test("blocked, oversized and non-HTML responses fail clearly", async () => {
  for (const response of [
    new Response("blocked", { status: 403 }),
    new Response("not html"),
    new Response("x".repeat(3 * 1024 * 1024 + 1), {
      headers: { "content-type": "text/html" },
    }),
  ])
    await assert.rejects(
      fetchSongPage("https://acordes.lacuerda.net/a/b", async () => response),
    );
});
test("a public HTML page is returned with its final URL", async () => {
  const data = await fetchSongPage(
    "https://acordes.lacuerda.net/a/b",
    async () =>
      new Response("<pre>C\nLuz</pre>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  );
  assert.equal(data.html, "<pre>C\nLuz</pre>");
});
