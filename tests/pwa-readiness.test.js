import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { waitForPwaActivation } from "./helpers/pwa-ready.mjs";

function wait(serviceWorker, timeout = 1000) {
  return runInNewContext(`(${waitForPwaActivation.toString()})(${timeout})`, {
    navigator: { serviceWorker },
    URL,
    setTimeout,
    clearTimeout,
  });
}

test("activation returns the state of the same worker it waited for, despite fresh wrappers", async () => {
  let readyReads = 0,
    activeReads = 0;
  const workers = [];
  const serviceWorker = {
    get ready() {
      readyReads++;
      return Promise.resolve({
        scope: "http://localhost/",
        get active() {
          activeReads++;
          const worker = new EventTarget();
          worker.state = "activating";
          worker.scriptURL = "http://localhost/sw.js";
          workers.push(worker);
          setTimeout(() => {
            worker.state = "activated";
            worker.dispatchEvent(new Event("statechange"));
          }, 5);
          return worker;
        },
      });
    },
  };
  const result = await wait(serviceWorker);
  assert.equal(result.state, "activated");
  assert.equal(result.scope, "/");
  assert.equal(result.script, "/sw.js");
  assert.equal(readyReads, 1);
  assert.equal(activeReads, 1);
  assert.equal(workers.length, 1);
});

test("offline readiness fails within a bound if installation never becomes ready", async () => {
  await assert.rejects(
    wait({ ready: new Promise(() => {}) }, 20),
    /activation timed out/,
  );
});

test("an activation that becomes redundant fails rather than claiming offline support", async () => {
  const worker = new EventTarget();
  worker.state = "activating";
  const pending = wait({ ready: Promise.resolve({ active: worker }) });
  setTimeout(() => {
    worker.state = "redundant";
    worker.dispatchEvent(new Event("statechange"));
  }, 5);
  await assert.rejects(pending, /became redundant/);
});
