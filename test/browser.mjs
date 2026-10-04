import assert from "node:assert/strict";
import { createServer } from "node:http";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const temp = await mkdtemp(join(tmpdir(), "scan-translate-test-"));
const extension = join(temp, "extension");
const translatedSources = [];
const backupSources = [];
let context;
let server;

async function browserExecutable() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (process.platform !== "win32") return undefined;
  const cache = join(process.env.LOCALAPPDATA, "ms-playwright");
  const versions = (await readdir(cache).catch(() => [])).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse();
  return versions.length ? join(cache, versions[0], "chrome-win64", "chrome.exe") : undefined;
}

async function waitForCard(page, pattern, timeout = 45_000) {
  const text = page.locator("#scan-translate-root #translation");
  await text.waitFor({ state: "visible", timeout });
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await text.textContent();
    if (pattern.test(value)) return value;
    const title = await page.locator("#scan-translate-root #title").textContent();
    if (title?.startsWith("Không")) throw new Error(`${title}: ${value}`);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for translated card. Last text: ${await text.textContent()}`);
}

try {
  server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/translate_a/single") {
      const source = url.searchParams.get("q") || "";
      translatedSources.push(source);
      if (source.includes("Context action")) {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify([[["Bản dịch từ menu chuột phải."]], null, "en"]));
        return;
      }
      if (source.includes("Backup translation")) {
        response.writeHead(429, { "content-type": "application/json" });
        response.end("{}");
        return;
      }
      const reply = () => {
        if (response.destroyed) return;
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify([[["Xin chào thế giới"]], null, "en"]));
      };
      if (source.includes("Slow response")) setTimeout(reply, 1_300);
      else reply();
      return;
    }
    if (url.pathname === "/get") {
      backupSources.push(url.searchParams.get("q") || "");
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Bản dịch dự phòng.", detectedLanguage: "en" } }));
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(`<!doctype html><meta charset="utf-8"><style>body{margin:60px;background:white;color:#111;font:28px/1.5 Arial}p{margin:0 0 48px}#ocr{font-size:34px}.cjk{font-size:42px}</style><p id="text">Hello world. This is a translation test.</p><p id="ocr">Hello world from a scanned image.</p><p id="backup">Backup translation test.</p><p id="slow">Slow response test.</p><p id="ocr-jpn" class="cjk">日本語の文字を読み取る</p><p id="ocr-kor" class="cjk">안녕하세요 세계</p><p id="ocr-chi-sim" class="cjk">简体中文测试</p><p id="ocr-chi-tra" class="cjk">繁體中文測試</p>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  await cp(join(process.cwd(), "dist"), extension, { recursive: true });
  const manifestFile = join(extension, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.host_permissions.push("<all_urls>");
  await writeFile(manifestFile, JSON.stringify(manifest));
  const backgroundFile = join(extension, "background.js");
  const background = await readFile(backgroundFile, "utf8");
  const serviceUrl = "https://translate.googleapis.com/translate_a/single";
  const backupUrl = "https://api.mymemory.translated.net/get";
  assert.ok(background.includes(serviceUrl), "compiled translation URL should be present");
  assert.ok(background.includes(backupUrl), "compiled backup URL should be present");
  await writeFile(backgroundFile, background
    .replace(serviceUrl, `http://127.0.0.1:${server.address().port}/translate_a/single`)
    .replace(backupUrl, `http://127.0.0.1:${server.address().port}/get`));

  context = await chromium.launchPersistentContext(join(temp, "profile"), {
    executablePath: await browserExecutable(),
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1100, height: 720 },
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  let menuRegistered = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    menuRegistered = await worker.evaluate(() => new Promise((resolve) => {
      chrome.contextMenus.update("translate-selected-text", { title: "Dịch đoạn đã chọn" }, () => {
        resolve(!chrome.runtime.lastError);
      });
    }));
    if (menuRegistered) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(menuRegistered, true, "selection context menu should be registered");
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const [tab] = await worker.evaluate(() => chrome.tabs.query({ active: true, currentWindow: true }));
  const control = await context.newPage();
  await control.goto(`chrome-extension://${extensionId}/popup.html`);
  assert.equal(await control.locator("#ocr-language").inputValue(), "eng+vie");
  const shortcut = await control.evaluate(async () => (await chrome.commands.getAll()).find((command) => command.name === "scan-region")?.shortcut);
  assert.equal(shortcut, "Alt+Shift+Q");
  assert.equal(await worker.evaluate(() => chrome.commands.onCommand.hasListeners()), true);
  await control.waitForFunction(() => document.querySelector("#shortcut-label")?.textContent?.includes("Alt+Shift+Q"));
  await page.bringToFront();

  await page.locator("#text").selectText();
  const beginText = await control.evaluate((tabId) => chrome.runtime.sendMessage({ type: "BEGIN_TEXT_MODE", tabId }), tab.id);
  assert.equal(beginText.ok, true, beginText.error);
  const translatedSelection = await waitForCard(page, /Xin chào/i);
  assert.match(translatedSelection, /Xin chào/i);
  await page.locator("#ocr").selectText();
  await page.locator("#ocr").dispatchEvent("pointerup");
  await page.waitForFunction(() => document.querySelector("#scan-translate-root")?.shadowRoot?.querySelector("#source")?.textContent?.includes("scanned image"));
  await waitForCard(page, /Xin chào/i);
  const newlySelected = await page.locator("#scan-translate-root #source").textContent();
  assert.match(newlySelected, /scanned image/i);

  await page.locator("#backup").selectText();
  await page.locator("#backup").dispatchEvent("pointerup");
  await waitForCard(page, /Bản dịch dự phòng/i);
  assert.match(await page.locator("#scan-translate-root #detected").textContent(), /MyMemory/);
  assert.deepEqual(backupSources, ["Backup translation test."]);

  await page.locator("#slow").selectText();
  await page.locator("#slow").dispatchEvent("pointerup");
  await page.waitForFunction(() => document.querySelector("#scan-translate-root")?.shadowRoot?.querySelector("#title")?.textContent === "Đang dịch…");
  const waitStart = Date.now();
  while (!translatedSources.some((text) => text.includes("Slow response")) && Date.now() - waitStart < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(translatedSources.some((text) => text.includes("Slow response")), "slow translation should be in flight");

  await control.locator("#enabled-toggle").uncheck();
  await control.waitForFunction(async () => (await chrome.storage.sync.get("enabled")).enabled === false && !document.querySelector("#enabled-toggle").disabled);
  await page.waitForFunction(() => {
    const root = document.querySelector("#scan-translate-root")?.shadowRoot;
    return root?.querySelector("#hint")?.hidden && root?.querySelector("#card")?.hidden;
  });
  assert.equal(await control.locator("#text-mode").isDisabled(), true);
  assert.equal(await control.locator("#ocr-mode").isDisabled(), true);
  assert.equal(await worker.evaluate(() => chrome.action.getBadgeText({})), "OFF");
  await page.waitForTimeout(1_500);
  assert.equal(await page.locator("#scan-translate-root #card").isHidden(), true, "late translation must stay hidden after switch off");
  const denied = await control.evaluate((tabId) => chrome.runtime.sendMessage({ type: "BEGIN_TEXT_MODE", tabId }), tab.id);
  assert.equal(denied.ok, false);
  await control.reload();
  assert.equal(await control.locator("#enabled-toggle").isChecked(), false);
  await control.locator("#enabled-toggle").check();
  await control.waitForFunction(async () => (await chrome.storage.sync.get("enabled")).enabled === true && !document.querySelector("#enabled-toggle").disabled);
  assert.equal(await worker.evaluate(() => chrome.action.getBadgeText({})), "");
  await page.bringToFront();

  const beginOcr = await control.evaluate((tabId) => chrome.runtime.sendMessage({ type: "BEGIN_OCR_MODE", tabId }), tab.id);
  assert.equal(beginOcr.ok, true, beginOcr.error);
  const box = await page.locator("#ocr").boundingBox();
  await page.mouse.move(box.x - 8, box.y - 5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 8, box.y + box.height + 5, { steps: 8 });
  await page.mouse.up();
  const translatedOcr = await waitForCard(page, /Xin chào/i, 60_000);
  assert.match(translatedOcr, /Xin chào/i);
  const recognized = await page.locator("#scan-translate-root #source").textContent();
  assert.match(recognized, /Hello world/i);
  for (const [language, selector, expected] of [
    ["jpn", "#ocr-jpn", /日本語/],
    ["kor", "#ocr-kor", /안녕/],
    ["chi_sim", "#ocr-chi-sim", /简体/],
    ["chi_tra", "#ocr-chi-tra", /繁體/],
  ]) {
    await control.locator("#ocr-language").selectOption(language);
    await control.waitForFunction(async (value) => (await chrome.storage.sync.get("ocrLanguage")).ocrLanguage === value, language);
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.bringToFront();
    const begin = await control.evaluate((tabId) => chrome.runtime.sendMessage({ type: "BEGIN_OCR_MODE", tabId }), tab.id);
    assert.equal(begin.ok, true, begin.error);
    const region = await page.locator(selector).boundingBox();
    await page.mouse.move(region.x - 8, region.y - 5);
    await page.mouse.down();
    await page.mouse.move(region.x + region.width + 8, region.y + region.height + 5, { steps: 8 });
    await page.mouse.up();
    await waitForCard(page, /Xin chào/i, 60_000);
    assert.match(await page.locator("#scan-translate-root #source").textContent(), expected, `OCR failed for ${language}`);
  }
  await control.reload();
  assert.equal(await control.locator("#ocr-language").inputValue(), "chi_tra");
  const oneShot = await worker.evaluate((tabId) => chrome.tabs.sendMessage(tabId, { type: "TRANSLATE_ONCE", text: "Context action test." }), tab.id);
  assert.equal(oneShot.ok, true);
  await waitForCard(page, /Bản dịch từ menu chuột phải/i);
  assert.match(await page.locator("#scan-translate-root #source").textContent(), /Context action test/);
  assert.ok(translatedSources.filter((text) => /Hello world/i.test(text)).length >= 3);
  const shortcutsPagePromise = context.waitForEvent("page");
  await control.locator("#shortcut-settings").click();
  const shortcutsPage = await shortcutsPagePromise;
  await shortcutsPage.waitForURL(/^chrome:\/\/extensions\/shortcuts/);
  console.log("Browser translation, shortcut registration, one-shot context path, MyMemory fallback, multilingual OCR, and on/off switch passed.");
} finally {
  if (context) await context.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
