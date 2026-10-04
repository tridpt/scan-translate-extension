(() => {
  if (globalThis.__scanTranslateInstalled) return;
  globalThis.__scanTranslateInstalled = true;

  const host = document.createElement("div");
  host.id = "scan-translate-root";
  host.style.cssText = "position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      [hidden] { display: none !important; }
      #hint { position: fixed; top: 16px; right: 16px; max-width: calc(100vw - 32px); padding: 10px 14px; border-radius: 12px; background: #173e39; color: #fff; box-shadow: 0 8px 28px #0c262b40; font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none; }
      #mask { position: fixed; inset: 0; background: #0b263640; cursor: crosshair; touch-action: none; pointer-events: auto; }
      #selection { position: absolute; border: 2px solid #e8a542; background: #f4c06a40; box-shadow: 0 0 0 9999px #0b263616; pointer-events: none; }
      #ocr-hint { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); max-width: calc(100vw - 28px); padding: 10px 14px; border-radius: 12px; background: #fffdf7; color: #173e39; box-shadow: 0 8px 28px #0c262b40; font: 600 13px/1.4 system-ui, sans-serif; white-space: nowrap; pointer-events: none; }
      #card { position: fixed; width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; border: 1px solid #d9e6e0; border-radius: 16px; background: #fffdf8; color: #18312e; box-shadow: 0 16px 48px #0a252e45; font: 14px/1.5 system-ui, sans-serif; pointer-events: auto; }
      #card header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px 11px; border-bottom: 1px solid #e6eee8; }
      #card h2 { margin: 0; font: 700 15px/1.3 system-ui, sans-serif; color: #173e39; }
      #close { width: 27px; height: 27px; padding: 0; border: 0; border-radius: 8px; background: #eaf2ed; color: #173e39; cursor: pointer; font: 700 18px/1 system-ui, sans-serif; }
      #body { padding: 14px 16px 16px; }
      .label { margin: 0 0 4px; color: #71857e; font: 700 10px/1.4 system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; }
      #source { max-height: 62px; overflow: hidden; margin: 0 0 13px; color: #60736d; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
      #translation { max-height: 270px; overflow: auto; margin: 0; color: #163831; font-size: 15px; font-weight: 550; white-space: pre-wrap; overflow-wrap: anywhere; }
      #translation.error { color: #a43528; }
      #actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
      #detected { color: #82938d; font-size: 11px; }
      #copy { padding: 7px 11px; border: 0; border-radius: 9px; background: #e6f3e8; color: #176242; font: 700 12px/1.3 system-ui, sans-serif; cursor: pointer; }
      #copy:disabled { opacity: .45; cursor: default; }
    </style>
    <div id="hint" hidden>Bôi đen đoạn chữ để dịch · Esc để tắt</div>
    <div id="mask" hidden><div id="selection" hidden></div><div id="ocr-hint">Kéo chuột khoanh vùng chữ · Esc để hủy</div></div>
    <section id="card" role="status" aria-live="polite" hidden>
      <header><h2 id="title">Bản dịch</h2><button id="close" type="button" aria-label="Đóng">×</button></header>
      <div id="body">
        <p id="source-label" class="label" hidden>Nguyên văn</p>
        <p id="source" hidden></p>
        <p id="translation"></p>
        <div id="actions"><span id="detected"></span><button id="copy" type="button" disabled>Sao chép</button></div>
      </div>
    </section>`;
  document.documentElement.append(host);

  const $ = (id) => shadow.getElementById(id);
  const hint = $("hint");
  const mask = $("mask");
  const box = $("selection");
  const card = $("card");
  let textMode = false;
  let dragStart = null;
  let requestId = null;
  let translatedText = "";
  let lastSelection = "";
  let lastSelectionAt = 0;
  let anchor = { x: innerWidth / 2, y: 80 };

  function placeCard(point = anchor) {
    anchor = point;
    const width = Math.min(380, innerWidth - 24);
    const left = Math.max(12, Math.min(point.x, innerWidth - width - 12));
    card.style.left = `${left}px`;
    card.style.top = `${Math.max(12, Math.min(point.y + 10, innerHeight - 240))}px`;
  }

  function showCard({ title, sourceText = "", text, error = false, detectedLanguage = "", provider = "" }) {
    $("title").textContent = title;
    $("source-label").hidden = !sourceText;
    $("source").hidden = !sourceText;
    $("source").textContent = sourceText.length > 300 ? `${sourceText.slice(0, 300)}…` : sourceText;
    $("translation").textContent = text;
    $("translation").classList.toggle("error", error);
    const details = [];
    if (provider === "mymemory") details.push("Dịch dự phòng: MyMemory");
    else if (provider === "google") details.push("Google Dịch");
    if (detectedLanguage) details.push(`Ngôn ngữ gốc: ${detectedLanguage}`);
    $("detected").textContent = details.join(" · ");
    translatedText = error || title !== "Bản dịch" ? "" : text;
    $("copy").disabled = !translatedText;
    $("copy").textContent = "Sao chép";
    card.hidden = false;
    placeCard();
  }

  function selectionInfo() {
    const active = document.activeElement;
    if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
        typeof active.selectionStart === "number" && active.selectionEnd > active.selectionStart) {
      const text = active.value.slice(active.selectionStart, active.selectionEnd).trim();
      const rect = active.getBoundingClientRect();
      return { text, point: { x: rect.left + Math.min(rect.width, 220), y: rect.bottom } };
    }
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (!text || !selection.rangeCount) return { text: "", point: anchor };
    const range = selection.getRangeAt(selection.rangeCount - 1);
    const rects = range.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    return { text, point: { x: rect.right, y: rect.bottom } };
  }

  async function requestTranslation(info) {
    if (!info.text) return false;
    if (info.text === lastSelection && Date.now() - lastSelectionAt < 350) return true;
    lastSelection = info.text;
    lastSelectionAt = Date.now();
    requestId = crypto.randomUUID();
    const thisRequestId = requestId;
    anchor = info.point;
    showCard({ title: "Đang dịch…", sourceText: info.text, text: "Vui lòng chờ một chút." });
    try {
      const result = await chrome.runtime.sendMessage({ type: "REQUEST_TRANSLATE", requestId: thisRequestId, text: info.text });
      if (!result?.ok) throw new Error(result?.error || "Không bắt đầu được bản dịch.");
    } catch (error) {
      if (requestId === thisRequestId) showCard({ title: "Không dịch được", sourceText: info.text, text: error.message || String(error), error: true });
    }
    return true;
  }

  function trySelectedText() {
    if (!textMode || !mask.hidden) return;
    void requestTranslation(selectionInfo());
  }

  document.addEventListener("pointerup", (event) => {
    if (!textMode || event.composedPath().includes(host)) return;
    setTimeout(trySelectedText, 0);
  }, true);
  document.addEventListener("keyup", (event) => {
    if (!textMode || event.key === "Escape" || event.composedPath().includes(host)) return;
    setTimeout(trySelectedText, 0);
  }, true);

  function stop() {
    textMode = false;
    dragStart = null;
    requestId = null;
    lastSelection = "";
    hint.hidden = true;
    mask.hidden = true;
    box.hidden = true;
    card.hidden = true;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (textMode || !mask.hidden || !card.hidden)) {
      event.preventDefault();
      stop();
    }
  }, true);

  mask.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragStart = { x: event.clientX, y: event.clientY };
    mask.setPointerCapture(event.pointerId);
    box.hidden = false;
  });
  mask.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    const x = Math.max(0, Math.min(dragStart.x, event.clientX));
    const y = Math.max(0, Math.min(dragStart.y, event.clientY));
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${Math.abs(event.clientX - dragStart.x)}px`;
    box.style.height = `${Math.abs(event.clientY - dragStart.y)}px`;
  });
  mask.addEventListener("pointerup", async (event) => {
    if (!dragStart) return;
    const x = Math.max(0, Math.min(dragStart.x, event.clientX));
    const y = Math.max(0, Math.min(dragStart.y, event.clientY));
    const width = Math.min(innerWidth - x, Math.abs(event.clientX - dragStart.x));
    const height = Math.min(innerHeight - y, Math.abs(event.clientY - dragStart.y));
    dragStart = null;
    if (width < 45 || height < 20) {
      $("ocr-hint").textContent = "Vùng chọn quá nhỏ. Hãy kéo lại · Esc để hủy";
      box.hidden = true;
      return;
    }
    mask.hidden = true;
    box.hidden = true;
    requestId = crypto.randomUUID();
    const thisRequestId = requestId;
    anchor = { x: x + width, y: y + height };
    try {
      const result = await chrome.runtime.sendMessage({
        type: "REGION_SELECTED", requestId: thisRequestId,
        region: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), viewportWidth: innerWidth, viewportHeight: innerHeight },
      });
      if (!result?.ok) throw new Error(result?.error || "Không quét được vùng chọn.");
    } catch (error) {
      if (requestId === thisRequestId) showCard({ title: "Không quét được", text: error.message || String(error), error: true });
    }
  });

  $("close").addEventListener("click", () => {
    requestId = null;
    card.hidden = true;
  });
  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      $("copy").textContent = "Đã sao chép";
    } catch {
      $("copy").textContent = "Không sao chép được";
    }
  });
  window.addEventListener("resize", () => { if (!card.hidden) placeCard(); });

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    switch (message?.type) {
      case "BEGIN_TEXT_MODE":
        mask.hidden = true;
        box.hidden = true;
        textMode = true;
        hint.hidden = false;
        trySelectedText();
        respond({ ok: true });
        break;
      case "BEGIN_OCR_MODE":
        textMode = false;
        requestId = null;
        hint.hidden = true;
        card.hidden = true;
        $("ocr-hint").textContent = "Kéo chuột khoanh vùng chữ · Esc để hủy";
        mask.hidden = false;
        respond({ ok: true });
        break;
      case "TRANSLATE_ONCE": {
        const selected = selectionInfo();
        const text = typeof message.text === "string" ? message.text.trim() : "";
        if (!text) {
          respond({ ok: false, error: "Không có chữ để dịch." });
          break;
        }
        void requestTranslation({ text, point: selected.point });
        respond({ ok: true });
        break;
      }
      case "STOP_ALL":
        stop();
        respond({ ok: true });
        break;
      case "SHOW_LOADING":
        if (message.requestId === requestId) showCard({ title: message.status || "Đang xử lý…", sourceText: message.sourceText || "", text: "Vui lòng chờ một chút." });
        break;
      case "SHOW_RESULT":
        if (message.requestId === requestId) showCard({ title: "Bản dịch", sourceText: message.sourceText, text: message.translatedText, detectedLanguage: message.detectedLanguage, provider: message.provider });
        break;
      case "SHOW_ERROR":
        if (message.requestId === requestId) showCard({ title: "Không dịch được", text: message.error || "Đã xảy ra lỗi.", error: true });
        break;
      default:
        break;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.enabled?.newValue === false) stop();
  });
})();
