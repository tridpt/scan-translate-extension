import assert from "node:assert/strict";
import { test } from "node:test";
import { handleScanShortcut } from "../src/shortcut.js";

test("scan shortcut opens OCR on the active tab", async () => {
  const calls = [];
  const result = await handleScanShortcut("scan-region", {
    isEnabled: async () => true,
    queryTabs: async (query) => {
      calls.push(query);
      return [{ id: 42 }];
    },
    beginOnPage: async (...args) => { calls.push(args); },
  });
  assert.equal(result, true);
  assert.deepEqual(calls, [{ active: true, lastFocusedWindow: true }, [42, "BEGIN_OCR_MODE"]]);
});

test("scan shortcut does nothing when disabled or when another command fires", async () => {
  let accessedTabs = false;
  const dependencies = {
    isEnabled: async () => false,
    queryTabs: async () => { accessedTabs = true; return [{ id: 42 }]; },
    beginOnPage: async () => { throw new Error("must not start OCR"); },
  };
  assert.equal(await handleScanShortcut("scan-region", dependencies), false);
  assert.equal(await handleScanShortcut("unrelated", dependencies), false);
  assert.equal(accessedTabs, false);
});
