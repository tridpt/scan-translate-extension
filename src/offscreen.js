import { createWorker } from "tesseract.js";

const OCR_LANGUAGES = new Set(["eng+vie", "jpn", "kor", "chi_sim", "chi_tra"]);
let workerPromise;
let currentLanguage;
let ocrQueue = Promise.resolve();

async function ocrWorker(language) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(language, 1, {
        workerPath: chrome.runtime.getURL("vendor/worker.min.js"),
        corePath: chrome.runtime.getURL("vendor/core"),
        langPath: chrome.runtime.getURL("vendor/lang"),
        workerBlobURL: false,
      });
      try {
        await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
        currentLanguage = language;
        return worker;
      } catch (error) {
        await worker.terminate();
        throw error;
      }
    })().catch((error) => {
      workerPromise = null;
      currentLanguage = null;
      throw error;
    });
  }
  const worker = await workerPromise;
  if (currentLanguage !== language) {
    try {
      await worker.reinitialize(language, 1);
      await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
      currentLanguage = language;
    } catch (error) {
      workerPromise = null;
      currentLanguage = null;
      await worker.terminate().catch(() => {});
      throw error;
    }
  }
  return worker;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không mở được ảnh màn hình."));
    image.src = dataUrl;
  });
}

async function recognize(dataUrl, region, language) {
  if (!OCR_LANGUAGES.has(language)) throw new Error("Ngôn ngữ quét không hợp lệ.");
  const image = await loadImage(dataUrl);
  const scaleX = image.naturalWidth / region.viewportWidth;
  const scaleY = image.naturalHeight / region.viewportHeight;
  const x = Math.max(0, Math.round(region.x * scaleX));
  const y = Math.max(0, Math.round(region.y * scaleY));
  const width = Math.min(image.naturalWidth - x, Math.round(region.width * scaleX));
  const height = Math.min(image.naturalHeight - y, Math.round(region.height * scaleY));
  if (width < 35 || height < 15) throw new Error("Vùng chọn nằm ngoài cửa sổ. Hãy thử lại.");

  const upscale = width < 900 && height < 450 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * upscale;
  canvas.height = height * upscale;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const step = Math.max(4, Math.floor(pixels.data.length / 4000 / 4) * 4);
  let brightness = 0;
  let samples = 0;
  for (let i = 0; i < pixels.data.length; i += step) {
    brightness += (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    samples += 1;
  }
  if (brightness / samples < 115) {
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = 255 - pixels.data[i];
      pixels.data[i + 1] = 255 - pixels.data[i + 1];
      pixels.data[i + 2] = 255 - pixels.data[i + 2];
    }
    context.putImageData(pixels, 0, 0);
  }

  const result = await (await ocrWorker(language)).recognize(canvas.toDataURL("image/png"));
  return result.data.text.replace(/\r\n/g, "\n").trim();
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "RUN_OCR") return false;
  const job = ocrQueue.then(() => recognize(message.dataUrl, message.region, message.language));
  ocrQueue = job.catch(() => {});
  job
    .then((text) => respond({ ok: true, text }))
    .catch((error) => respond({ ok: false, error: error.message || String(error) }));
  return true;
});
