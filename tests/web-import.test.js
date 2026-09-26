import test from "node:test";
import assert from "node:assert/strict";
import { LACUERDA_HOSTS, songUrl, webProvider } from "../src/web-sources.js";
import {
  fetchSongPage,
  publicImportError,
  webImportMiddleware,
} from "../server/web-import.js";
import {
  stripLaCuerdaFretGrids,
  tusAcordesNotation,
} from "../src/web-import.js";
import { importText } from "../src/files.js";
test("only supported public HTTPS hosts are accepted", () => {
  for (const url of [
    "http://acordes.lacuerda.net/a",
    "https://localhost/a",
    "https://127.0.0.1",
    "https://cifraclub.com.evil.test/a",
    "https://www.cifraclub.com:3000/a",
    "https://a:b@www.cifraclub.com/a",
    "https://chordie.com/a",
    "https://acordesweb.com.evil.test/a",
    "file:///etc/passwd",
  ])
    assert.throws(() => songUrl(url));
  assert.equal(songUrl("https://www.cifraclub.com/a/b/#x").hash, "");
  assert.equal(
    songUrl("https://es.ultimate-guitar.com/tab/artist/song-chords-123")
      .hostname,
    "es.ultimate-guitar.com",
  );
  for (const url of [
    "https://acordesweb.com/cancion/artista/cancion",
    "https://www.acordesweb.com/cancion/artista/cancion",
    "https://tusacordes.com/tab/ejemplo-acordes-1",
    "https://www.tusacordes.com/tab/ejemplo-acordes-1",
    "https://www.chordie.com/chord.pere/www.example.com/a/b.html",
    "https://acordes.cc/?letra-de-ejemplo-artista",
    "https://www.acordes.cc/?letra-de-ejemplo-artista",
  ])
    assert.equal(songUrl(url).hostname, new URL(url).hostname, url);
  assert.throws(() =>
    songUrl(
      "https://es.ultimate-guitar.com.evil.test/tab/artist/song-chords-123",
    ),
  );
  assert.equal(LACUERDA_HOSTS.has("acordes.lacuerda.net"), true);
  assert.equal(LACUERDA_HOSTS.has("lacuerda.net.evil.test"), false);
});
test("each supported host maps to the parser that knows its markup", () => {
  assert.equal(webProvider("acordes.lacuerda.net"), "lacuerda");
  assert.equal(webProvider("www.acordesweb.com"), "acordesweb");
  assert.equal(webProvider("tusacordes.com"), "tusacordes");
  assert.equal(webProvider("www.chordie.com"), "chordie");
  assert.equal(webProvider("acordes.cc"), "acordescc");
  assert.equal(webProvider("tabs.ultimate-guitar.com"), "ultimate-guitar");
  assert.equal(webProvider("www.cifraclub.com"), "cifraclub");
});
test("TusAcordes Spanish chords keep their column over the lyrics", () => {
  const source = "    (LA )                    (MI )";
  const [chords, lyric] = tusAcordesNotation(
    `${source}\n A cantar una niña yo le enseñaba`,
  ).split("\n");
  assert.match(chords, /^ {4}A\s+E\s*$/);
  assert.equal(chords.length, source.length);
  assert.equal(chords.indexOf("E"), source.indexOf("(MI )"));
  assert.equal(lyric, " A cantar una niña yo le enseñaba");
  assert.match(tusAcordesNotation("(MIm)"), /^Em\s*$/);
  assert.match(tusAcordesNotation("(DO#m7/5b)"), /^C#m7b5\s*$/);
  assert.equal(tusAcordesNotation("(bis)"), "(bis)");
  assert.match(tusAcordesNotation("(LA ) y algo más"), /^A\s+y algo más$/);
});
test("converted TusAcordes sheets anchor chords to the following lyric", () => {
  const sheet = tusAcordesNotation(
    "    (LA )                 (MI )\n A cantar una niña yo le enseñaba\n       (MI )                      (LA )\n y un beso en cada nota ella me daba",
  );
  const song = importText(sheet, "Ejemplo");
  assert.equal(song.artist, "");
  assert.equal((song.text.match(/\[(?:A|E)\]/g) || []).length, 4);
  assert.ok(!song.text.includes("("), song.text);
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
test("source 403 has a distinct code for the conditional HTML fallback", async () => {
  await assert.rejects(
    fetchSongPage(
      "https://www.cifraclub.com/artista/cancion/",
      async () => new Response("blocked", { status: 403 }),
    ),
    (error) => {
      assert.equal(error.code, "SOURCE_FORBIDDEN");
      assert.equal(
        publicImportError(error),
        "La web bloquea las descargas desde servidores (HTTP 403). Copia la letra y pégala en el editor.",
      );
      return true;
    },
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
test("legacy pages are decoded with the charset they declare", async () => {
  const body = Buffer.from(
    '<head><meta charset="iso-8859-1"><title>Caf\xe9 Tacuba</title></head>',
    "latin1",
  );
  const data = await fetchSongPage(
    "https://acordes.cc/?letra-de-ejemplo",
    async () =>
      new Response(body, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  );
  assert.match(data.html, /Café Tacuba/);
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
test("client-visible import errors keep internal details on the server", () => {
  const timeout = new Error("dial tcp 10.0.0.7:443: connect: timeout");
  timeout.name = "TimeoutError";
  assert.equal(
    publicImportError(timeout),
    "La web ha tardado demasiado. Vuelve a intentarlo.",
  );
  const generic = publicImportError(new Error("database password leaked"));
  assert.equal(generic, "No se pudo descargar la canción.");
  assert.doesNotMatch(generic, /password|database/);
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

test("API identifies only upstream 403 as the saved-HTML fallback", async (t) => {
  let status = 403;
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("blocked", { status }),
  );
  t.mock.method(console, "error", () => {});
  for (status of [403, 429, 500]) {
    let body;
    const response = {
      statusCode: 200,
      setHeader() {},
      end(value) {
        body = JSON.parse(value);
      },
    };
    await webImportMiddleware(
      {
        method: "GET",
        url:
          "/api/import-web?url=" +
          encodeURIComponent("https://www.cifraclub.com/artist/song/"),
      },
      response,
      () => assert.fail("Import route must be handled"),
    );
    assert.equal(response.statusCode, 422);
    assert.equal(body.code, status === 403 ? "SOURCE_FORBIDDEN" : undefined);
  }
});
