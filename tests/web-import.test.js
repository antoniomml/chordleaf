import test from "node:test";
import assert from "node:assert/strict";
import { LACUERDA_HOSTS, songUrl } from "../src/web-sources.js";
import { fetchSongPage } from "../server/web-import.js";
import { stripLaCuerdaFretGrids } from "../src/web-import.js";
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
  assert.equal(
    songUrl("https://es.ultimate-guitar.com/tab/artist/song-chords-123")
      .hostname,
    "es.ultimate-guitar.com",
  );
  assert.throws(() =>
    songUrl(
      "https://es.ultimate-guitar.com.evil.test/tab/artist/song-chords-123",
    ),
  );
  assert.equal(LACUERDA_HOSTS.has("acordes.lacuerda.net"), true);
  assert.equal(LACUERDA_HOSTS.has("lacuerda.net.evil.test"), false);
});
test("LaCuerda fingering legends are removed without touching the song", () => {
  const grid =
    "C     G\n" +
    [1, 2, 3, 4, 5, 6].map((string) => `${string}-0   ${string}-X`).join("\n");
  assert.equal(
    stripLaCuerdaFretGrids("[C]Una línea\n\nCORO:\n\n" + grid),
    "[C]Una línea",
  );
  assert.equal(
    stripLaCuerdaFretGrids("[C]Una línea\n\n" + grid + "\n\n[G]Otra línea"),
    "[C]Una línea\n\n[G]Otra línea",
  );
  assert.equal(
    stripLaCuerdaFretGrids(
      "[C]Una línea\n" + grid.split("\n").slice(0, 5).join("\n"),
    ),
    "[C]Una línea\n" + grid.split("\n").slice(0, 5).join("\n"),
  );
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
    new Response("not html", {
      headers: { "content-type": "application/json" },
    }),
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
  assert.equal(data.contentType, "text/html");
});
test("LaCuerda plain-text chord sheets are accepted", async () => {
  const data = await fetchSongPage(
    "https://acordes.lacuerda.net/TXT/artista/cancion.txt",
    async () =>
      new Response("C     G\nLuz del día", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
  );
  assert.equal(data.contentType, "text/plain");
  assert.match(data.html, /Luz del día/);
});
test("plain text stays rejected for providers that do not expose chord TXT", async () => {
  await assert.rejects(
    fetchSongPage(
      "https://www.cifraclub.com/a/b/",
      async () =>
        new Response("C     G\nLuz", {
          headers: { "content-type": "text/plain" },
        }),
    ),
  );
});
