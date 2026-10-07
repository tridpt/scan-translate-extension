const target = document.getElementById("target-language");
const ocrLanguage = document.getElementById("ocr-language");
const message = document.getElementById("message");
const toggle = document.getElementById("enabled-toggle");
const powerTitle = document.getElementById("power-title");
const powerDetail = document.getElementById("power-detail");
const reloadButton = document.getElementById("reload-extension");
const shortcutLabel = document.getElementById("shortcut-label");
const shortcutSettings = document.getElementById("shortcut-settings");
const buttons = [document.getElementById("text-mode"), document.getElementById("ocr-mode")];
let enabled = true;
let ready = false;
let busy = false;
let needsReload = false;

function render() {
  toggle.checked = enabled;
  toggle.disabled = !ready || busy || needsReload;
  powerTitle.textContent = needsReload ? "Cần tải lại" : !ready ? "Đang kết nối…" : enabled ? "Đang bật" : "Đang tắt";
  powerDetail.textContent = needsReload ? "Bấm Reload ở trang tiện ích" : !ready ? "Vui lòng chờ" : enabled ? "Sẵn sàng quét và dịch" : "Bật lại để chọn chữ hoặc khoanh vùng";
  buttons.forEach((button) => { button.disabled = !ready || busy || !enabled || needsReload; });
  document.body.classList.toggle("is-off", !enabled);
}

function showReload() {
  ready = true;
  needsReload = true;
  message.textContent = "Popup chưa kết nối được với mã nền của tiện ích. Mở trang tiện ích, bấm Reload cho Quét & Dịch, rồi mở popup lại.";
  reloadButton.hidden = false;
  render();
}

render();

void (async () => {
  let settingsLoaded = false;
  try {
    const settings = await chrome.storage.sync.get({ targetLanguage: "vi", ocrLanguage: "eng+vie", enabled: true });
    if ([...target.options].some((option) => option.value === settings.targetLanguage)) target.value = settings.targetLanguage;
    if ([...ocrLanguage.options].some((option) => option.value === settings.ocrLanguage)) ocrLanguage.value = settings.ocrLanguage;
    enabled = settings.enabled !== false;
    settingsLoaded = true;
    const response = await chrome.runtime.sendMessage({ type: "PING" });
    ready = true;
    if (!response?.ok || response.protocol !== 5) showReload();
    else render();
  } catch (error) {
    if (settingsLoaded) showReload();
    else message.textContent = error.message || "Không đọc được cài đặt tiện ích.";
  }
})();

void chrome.commands.getAll().then((commands) => {
  const shortcut = commands.find((command) => command.name === "scan-region")?.shortcut;
  shortcutLabel.textContent = shortcut ? `Phím tắt quét: ${shortcut}` : "Chưa gán phím tắt quét";
}).catch(() => {
  shortcutLabel.textContent = "Không đọc được phím tắt";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) {
    enabled = changes.enabled.newValue !== false;
    render();
  }
});

target.addEventListener("change", () => {
  void chrome.storage.sync.set({ targetLanguage: target.value }).catch((error) => {
    message.textContent = error.message || "Không lưu được ngôn ngữ đích.";
  });
});

ocrLanguage.addEventListener("change", () => {
  void chrome.storage.sync.set({ ocrLanguage: ocrLanguage.value }).catch((error) => {
    message.textContent = error.message || "Không lưu được ngôn ngữ quét.";
  });
});

toggle.addEventListener("change", async () => {
  if (!ready || busy || needsReload) return;
  const previous = enabled;
  enabled = toggle.checked;
  busy = true;
  message.textContent = "";
  render();
  try {
    const result = await chrome.runtime.sendMessage({ type: "SET_ENABLED", enabled });
    if (!result?.ok) {
      if (result?.error === "Lệnh không hợp lệ.") {
        enabled = previous;
        showReload();
        return;
      }
      throw new Error(result?.error || "Không đổi được trạng thái tiện ích.");
    }
  } catch (error) {
    enabled = previous;
    message.textContent = error.message || String(error);
  } finally {
    busy = false;
    render();
  }
});

async function begin(type) {
  if (!ready || busy || !enabled || needsReload) return;
  busy = true;
  render();
  message.textContent = "";
  try {
    await chrome.storage.sync.set({ targetLanguage: target.value, ocrLanguage: ocrLanguage.value });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("Không tìm thấy thẻ web đang mở.");
    const result = await chrome.runtime.sendMessage({ type, tabId: tab.id });
    if (!result?.ok) throw new Error(result?.error || "Không khởi động được tiện ích.");
    window.close();
  } catch (error) {
    message.textContent = error.message || String(error);
    busy = false;
    render();
  }
}

buttons[0].addEventListener("click", () => { void begin("BEGIN_TEXT_MODE"); });
buttons[1].addEventListener("click", () => { void begin("BEGIN_OCR_MODE"); });
shortcutSettings.addEventListener("click", async () => {
  const url = navigator.userAgent.includes("Edg/") ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts";
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    message.textContent = `Không mở được trang phím tắt. Hãy mở ${url} thủ công.`;
  }
});
reloadButton.addEventListener("click", async () => {
  reloadButton.disabled = true;
  const url = navigator.userAgent.includes("Edg/") ? "edge://extensions/" : "chrome://extensions/";
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    message.textContent = `Không mở được trang tiện ích. Hãy mở ${url} thủ công rồi bấm Reload.`;
    reloadButton.disabled = false;
  }
});
