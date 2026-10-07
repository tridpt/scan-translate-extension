import assert from "node:assert/strict";
import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const temp = await mkdtemp(join(tmpdir(), "scan-translate-stale-"));
const extension = join(temp, "extension");
let context;

async function browserExecutable() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (process.platform !== "win32") return undefined;
  const cache = join(process.env.LOCALAPPDATA, "ms-playwright");
  const versions = (await readdir(cache).catch(() => [])).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse();
  return versions.length ? join(cache, versions[0], "chrome-win64", "chrome.exe") : undefined;
}

try {
  await cp(join(process.cwd(), "dist"), extension, { recursive: true });
  const backgroundFile = join(extension, "background.js");
  await writeFile(backgroundFile, `chrome.runtime.onMessage.addListener((_message, _sender, respond) => {
    respond({ ok: false, error: "Lệnh không hợp lệ." });
    return false;
  });`);

  context = await chromium.launchPersistentContext(join(temp, "profile"), {
    executablePath: await browserExecutable(),
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.locator("#reload-extension").waitFor({ state: "visible" });
  assert.match(await popup.locator("#message").textContent(), /chưa kết nối được với mã nền/i);
  assert.equal(await popup.locator("#power-title").textContent(), "Cần tải lại");
  const notice = await popup.locator("#message").boundingBox();
  const controls = await popup.locator("#enabled-toggle").boundingBox();
  assert.ok(notice.y < controls.y, "reload guidance should appear above disabled controls");
  assert.equal(await popup.locator("#enabled-toggle").isDisabled(), true);

  const managerPromise = context.waitForEvent("page");
  await popup.locator("#reload-extension").click();
  const manager = await managerPromise;
  await manager.waitForURL(/^chrome:\/\/extensions/);
  assert.match(manager.url(), /^chrome:\/\/extensions/);
  console.log("Stale background guidance passed.");
} finally {
  if (context) await context.close();
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
