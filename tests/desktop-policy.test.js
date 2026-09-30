import test from "node:test";
import assert from "node:assert/strict";
import { trustedURL, externalURL, boundedBody } from "../desktop/policy.mjs";
import { desktopDownloadURL } from "../src/desktop-release.js";

test("desktop capabilities stay on the exact packaged origin", () => {
  assert.equal(trustedURL("chordleaf://app/api/audio-import"), true);
  for (const url of [
    "https://chordleaf.com",
    "file:///etc/passwd",
    "chordleaf://evil/",
    "chordleaf://user:password@app/",
    "chordleaf://app:8080/",
    "chordleaf://app.evil/",
  ])
    assert.equal(trustedURL(url), false, url);
  for (const url of [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ])
    assert.equal(externalURL(url), false);
});
test("desktop installer links require the official release namespace", () => {
  const valid =
    "https://github.com/antoniomml/chordleaf/releases/download/desktop-v1.1.0/Chordleaf-1.1.0-mac-arm64.dmg";
  assert.equal(desktopDownloadURL(valid), valid);
  for (const url of [
    undefined,
    "",
    valid.replace("github.com", "github.com.evil.test"),
    valid + "?redirect=elsewhere",
    "javascript:alert(1)",
    valid.replace("antoniomml", "someone"),
  ])
    assert.equal(desktopDownloadURL(url), null);
});

test("desktop protocol bounds request bodies before buffering in the main process", async () => {
  const small = new Request("https://example.com", {
    method: "POST",
    body: "abc",
  });
  assert.equal((await boundedBody(small, 3)).toString(), "abc");
  const large = new Request("https://example.com", {
    method: "POST",
    body: "abcd",
  });
  await assert.rejects(boundedBody(large, 3), RangeError);
  const declared = new Request("https://example.com", {
    method: "POST",
    body: "a",
    headers: { "content-length": "100" },
  });
  await assert.rejects(boundedBody(declared, 3), RangeError);
});
