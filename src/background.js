import { MAX_TEXT_LENGTH, translateText } from "./translation.js";
import { handleScanShortcut } from "./shortcut.js";

const TARGETS = new Set(["vi", "en", "ja", "ko", "zh-CN", "fr", "de", "es", "th"]);
const OCR_LANGUAGES = new Set(["eng+vie", "jpn", "kor", "chi_sim", "chi_tra"]);
const CONTEXT_MENU_ID = "translate-selected-text";
const latestRequests = new Map();
const activeTranslations = new Map();
let offscreenReady;
let cachedEnabled;

function validTabId(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) throw new Error("Không tìm thấy thẻ web đang mở.");
  return tabId;
}

async function targetLanguage() {
  const { targetLanguage: saved } = await chrome.storage.sync.get({ targetLanguage: "vi" });
  return TARGETS.has(saved) ? saved : "vi";
}

async function ocrLanguage() {
  const { ocrLanguage: saved } = await chrome.storage.sync.get({ ocrLanguage: "eng+vie" });
  return OCR_LANGUAGES.has(saved) ? saved : "eng+vie";
}

async function isEnabled() {
  if (typeof cachedEnabled === "boolean") return cachedEnabled;
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  if (cachedEnabled === undefined) cachedEnabled = enabled !== false;
  return cachedEnabled;
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeBackgroundColor({ color: "#74857B" });
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
}

function ensureContextMenu(enabled) {
  return new Promise((resolve) => {
    chrome.contextMenus.update(CONTEXT_MENU_ID, { enabled }, () => {
      if (!chrome.runtime.lastError) {
        resolve();
        return;
      }
      chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: "Dịch đoạn đã chọn",
        contexts: ["selection"],
        enabled,
      }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    });
  });
}

function cancelRequests() {
  latestRequests.clear();
  for (const controller of activeTranslations.values()) controller.abort();
  activeTranslations.clear();
}

async function stopOpenPages() {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.filter((tab) => Number.isInteger(tab.id)).map((tab) =>
    sendToPage(tab.id, 0, { type: "STOP_ALL" })));
}

async function setEnabled(enabled) {
  if (typeof enabled !== "boolean") throw new Error("Trạng thái bật/tắt không hợp lệ.");
  const previous = await isEnabled();
  cachedEnabled = enabled;
  if (!enabled) cancelRequests();
  try {
    await chrome.storage.sync.set({ enabled });
  } catch (error) {
    cachedEnabled = previous;
    throw error;
  }
  await Promise.allSettled([updateBadge(enabled), ensureContextMenu(enabled), ...(!enabled ? [stopOpenPages()] : [])]);
  return { ok: true, enabled };
}

async function sendToPage(tabId, frameId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message, { frameId });
  } catch {
    // The page may have navigated or closed while OCR or translation was running.
  }
}

async function inject(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch {
    throw new Error("Không thể chạy trên trang này. Hãy mở một trang web thông thường rồi thử lại.");
  }
}

async function beginOnPage(tabId, type) {
  validTabId(tabId);
  if (!(await isEnabled())) throw new Error("Tiện ích đang tắt. Hãy bật công tắc để sử dụng.");
  await inject(tabId);
  return chrome.tabs.sendMessage(tabId, { type });
}

async function translateFromContextMenu(info, tab) {
  if (info.menuItemId !== CONTEXT_MENU_ID || !Number.isInteger(tab?.id)) return;
  if (!(await isEnabled())) return;
  const text = info.selectionText?.trim();
  if (!text) return;
  await inject(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: "TRANSLATE_ONCE", text });
}

async function ensureOffscreen() {
  if (!offscreenReady) {
    offscreenReady = (async () => {
      if (!(await chrome.offscreen.hasDocument())) {
        await chrome.offscreen.createDocument({
          url: "offscreen.html",
          reasons: ["WORKERS"],
          justification: "Nhận dạng chữ cục bộ trong ảnh màn hình của vùng người dùng chọn.",
        });
      }
    })().catch((error) => {
      offscreenReady = null;
      throw error;
    });
  }
  await offscreenReady;
}

async function translateForPage(tabId, frameId, requestId, sourceText) {
  activeTranslations.get(tabId)?.abort();
  const controller = new AbortController();
  activeTranslations.set(tabId, controller);
  latestRequests.set(tabId, requestId);
  try {
    if (!(await isEnabled())) return;
    const result = await translateText(sourceText, await targetLanguage(), fetch, controller.signal);
    if (latestRequests.get(tabId) !== requestId) return;
    await sendToPage(tabId, frameId, {
      type: "SHOW_RESULT", requestId, sourceText,
      translatedText: result.text, detectedLanguage: result.detectedLanguage, provider: result.provider,
    });
  } catch (error) {
    if (latestRequests.get(tabId) !== requestId) return;
    await sendToPage(tabId, frameId, { type: "SHOW_ERROR", requestId, error: error.message || String(error) });
  } finally {
    if (activeTranslations.get(tabId) === controller) activeTranslations.delete(tabId);
  }
}

function validRegion(region) {
  const fields = ["x", "y", "width", "height", "viewportWidth", "viewportHeight"];
  return region && fields.every((name) => Number.isFinite(region[name])) &&
    region.x >= 0 && region.y >= 0 && region.width >= 45 && region.height >= 20 &&
    region.viewportWidth > 0 && region.viewportHeight > 0 &&
    region.x + region.width <= region.viewportWidth + 2 &&
    region.y + region.height <= region.viewportHeight + 2;
}

async function scanAndTranslate(tabId, frameId, requestId, region) {
  latestRequests.set(tabId, requestId);
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) throw new Error("Hãy chuyển về thẻ vừa chọn vùng chữ.");
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (latestRequests.get(tabId) !== requestId || !(await isEnabled())) return;
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (latestRequests.get(tabId) !== requestId) return;
    await sendToPage(tabId, frameId, { type: "SHOW_LOADING", requestId, status: "Đang nhận dạng chữ…" });
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({ type: "RUN_OCR", dataUrl, region, language: await ocrLanguage() });
    if (!result?.ok) throw new Error(result?.error || "Không nhận dạng được chữ.");
    const sourceText = result.text?.trim();
    if (!sourceText) throw new Error("Không thấy chữ trong vùng chọn. Hãy khoanh sát đoạn chữ và thử lại.");
    if (sourceText.length > MAX_TEXT_LENGTH) throw new Error("Vùng chọn có quá nhiều chữ. Hãy chọn đoạn ngắn hơn.");
    if (latestRequests.get(tabId) !== requestId) return;
    await sendToPage(tabId, frameId, { type: "SHOW_LOADING", requestId, status: "Đang dịch…", sourceText });
    await translateForPage(tabId, frameId, requestId, sourceText);
  } catch (error) {
    if (latestRequests.get(tabId) !== requestId) return;
    await sendToPage(tabId, frameId, { type: "SHOW_ERROR", requestId, error: error.message || String(error) });
  }
}

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "PING":
      return { ok: true, protocol: 5 };
    case "SET_ENABLED":
      return setEnabled(message.enabled);
    case "BEGIN_TEXT_MODE":
      return beginOnPage(message.tabId, "BEGIN_TEXT_MODE");
    case "BEGIN_OCR_MODE":
      return beginOnPage(message.tabId, "BEGIN_OCR_MODE");
    case "REQUEST_TRANSLATE": {
      if (!sender.tab || typeof message.text !== "string" || typeof message.requestId !== "string") {
        throw new Error("Yêu cầu dịch không hợp lệ.");
      }
      if (!(await isEnabled())) throw new Error("Tiện ích đang tắt.");
      void translateForPage(sender.tab.id, sender.frameId ?? 0, message.requestId, message.text);
      return { ok: true };
    }
    case "REGION_SELECTED": {
      if (!sender.tab || !validRegion(message.region) || typeof message.requestId !== "string") {
        throw new Error("Vùng chọn không hợp lệ.");
      }
      if (!(await isEnabled())) throw new Error("Tiện ích đang tắt.");
      void scanAndTranslate(sender.tab.id, sender.frameId ?? 0, message.requestId, message.region);
      return { ok: true };
    }
    default:
      throw new Error("Lệnh không hợp lệ.");
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === "RUN_OCR") return false;
  handleMessage(message, sender)
    .then((result) => respond(result ?? { ok: true }))
    .catch((error) => respond({ ok: false, error: error.message || String(error) }));
  return true;
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void translateFromContextMenu(info, tab).catch((error) => {
    console.error("Không dịch được mục chuột phải:", error);
  });
});

chrome.commands.onCommand.addListener((command) => {
  void handleScanShortcut(command, { isEnabled, queryTabs: (query) => chrome.tabs.query(query), beginOnPage }).catch((error) => {
    console.error("Không mở được chế độ khoanh vùng:", error);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.enabled) return;
  cachedEnabled = changes.enabled.newValue !== false;
  if (!cachedEnabled) cancelRequests();
  void updateBadge(cachedEnabled).catch(() => {});
  void ensureContextMenu(cachedEnabled);
});

void isEnabled().then((enabled) => Promise.allSettled([updateBadge(enabled), ensureContextMenu(enabled)])).catch(() => {});
