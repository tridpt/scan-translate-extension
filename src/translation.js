export const MAX_TEXT_LENGTH = 12_000;
const CHUNK_LENGTH = 2_500;
const BACKUP_CHUNK_BYTES = 450;
const BACKUP_MAX_BYTES = 4_500;

function chooseBreak(text, limit) {
  const window = text.slice(0, limit + 1);
  const minimum = Math.floor(limit * 0.55);
  for (const pattern of [/\n{2,}/g, /[.!?。！？][ \t]+/g, /[。！？]/g, /\n/g, /[ \t]+/g]) {
    let chosen = null;
    for (const match of window.matchAll(pattern)) {
      if (match.index >= minimum && match.index + match[0].length <= limit) chosen = match;
    }
    if (chosen) {
      const punctuation = /^[.!?。！？]/.test(chosen[0]);
      return {
        end: chosen.index + (punctuation ? 1 : 0),
        separator: chosen[0].slice(punctuation ? 1 : 0),
        next: chosen.index + chosen[0].length,
      };
    }
  }
  let end = limit;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return { end, separator: "", next: end };
}

export function splitText(input, limit = CHUNK_LENGTH) {
  if (!Number.isInteger(limit) || limit < 20) throw new Error("Giới hạn đoạn dịch không hợp lệ.");
  const text = input.replace(/\r\n/g, "\n").trim();
  const parts = [];
  let remaining = text;
  while (remaining.length > limit) {
    const cut = chooseBreak(remaining, limit);
    parts.push({ text: remaining.slice(0, cut.end), separator: cut.separator });
    remaining = remaining.slice(cut.next);
  }
  if (remaining) parts.push({ text: remaining, separator: "" });
  return parts;
}

export function splitTextByBytes(input, limit = BACKUP_CHUNK_BYTES) {
  if (!Number.isInteger(limit) || limit < 50) throw new Error("Giới hạn đoạn dịch dự phòng không hợp lệ.");
  const encoder = new TextEncoder();
  const text = input.replace(/\r\n/g, "\n").trim();
  const parts = [];
  let remaining = text;
  while (encoder.encode(remaining).length > limit) {
    let end = 0;
    let bytes = 0;
    for (const character of remaining) {
      const size = encoder.encode(character).length;
      if (bytes + size > limit) break;
      bytes += size;
      end += character.length;
    }
    const cut = chooseBreak(remaining, end);
    parts.push({ text: remaining.slice(0, cut.end), separator: cut.separator });
    remaining = remaining.slice(cut.next);
  }
  if (remaining) parts.push({ text: remaining, separator: "" });
  return parts;
}

export function parseTranslation(payload) {
  if (!Array.isArray(payload?.[0])) throw new Error("Dịch vụ trả về dữ liệu không hợp lệ.");
  const text = payload[0].map((item) => typeof item?.[0] === "string" ? item[0] : "").join("");
  if (!text.trim()) throw new Error("Dịch vụ không trả về bản dịch.");
  return { text, detectedLanguage: typeof payload[2] === "string" ? payload[2] : "" };
}

export function parseBackupTranslation(payload) {
  if (Number(payload?.responseStatus) !== 200) throw new Error("Nguồn dịch dự phòng từ chối yêu cầu.");
  const text = payload.responseData?.translatedText;
  if (typeof text !== "string" || !text.trim() || /^MYMEMORY WARNING:/i.test(text)) {
    throw new Error("Nguồn dịch dự phòng không trả về bản dịch.");
  }
  return {
    text,
    detectedLanguage: typeof payload.responseData.detectedLanguage === "string" ? payload.responseData.detectedLanguage : "",
  };
}

async function requestJson(url, fetcher, externalSignal, provider) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 20_000);
  externalSignal?.addEventListener("abort", abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  let response;
  try {
    response = await fetcher(url.toString(), { signal: controller.signal });
  } catch {
    if (externalSignal?.aborted) throw new Error("Đã dừng yêu cầu dịch.");
    throw new Error(`${provider} không kết nối được hoặc đã hết thời gian chờ.`);
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abort);
  }
  if (!response.ok) throw new Error(`${provider} đang lỗi (${response.status}).`);
  try {
    return await response.json();
  } catch {
    throw new Error(`${provider} trả về dữ liệu không hợp lệ.`);
  }
}

async function translateWithGoogle(input, target, fetcher, externalSignal) {
  const translated = [];
  let detectedLanguage = "";
  for (const chunk of splitText(input)) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({ client: "gtx", sl: "auto", tl: target, dt: "t", q: chunk.text }).toString();
    const result = parseTranslation(await requestJson(url, fetcher, externalSignal, "Google Dịch"));
    translated.push(result.text, chunk.separator);
    detectedLanguage ||= result.detectedLanguage;
  }
  return { text: translated.join(""), detectedLanguage, provider: "google" };
}

async function translateWithBackup(input, target, fetcher, externalSignal) {
  if (new TextEncoder().encode(input).length > BACKUP_MAX_BYTES) {
    throw new Error("Nguồn dự phòng chỉ hỗ trợ đoạn dưới 4.500 byte. Hãy chọn đoạn ngắn hơn.");
  }
  const translated = [];
  let detectedLanguage = "";
  for (const chunk of splitTextByBytes(input)) {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.search = new URLSearchParams({ q: chunk.text, langpair: `autodetect|${target}`, mt: "1" }).toString();
    const result = parseBackupTranslation(await requestJson(url, fetcher, externalSignal, "MyMemory"));
    translated.push(result.text, chunk.separator);
    detectedLanguage ||= result.detectedLanguage;
  }
  return { text: translated.join(""), detectedLanguage, provider: "mymemory" };
}

export async function translateText(input, target, fetcher = fetch, externalSignal) {
  if (typeof input !== "string" || !input.trim()) throw new Error("Không có chữ để dịch.");
  if (input.length > MAX_TEXT_LENGTH) throw new Error(`Đoạn chữ quá dài. Hãy chọn tối đa ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự.`);
  try {
    return await translateWithGoogle(input, target, fetcher, externalSignal);
  } catch (googleError) {
    if (externalSignal?.aborted) throw googleError;
    try {
      return await translateWithBackup(input, target, fetcher, externalSignal);
    } catch (backupError) {
      if (externalSignal?.aborted) throw backupError;
      throw new Error(`${googleError.message} Nguồn dự phòng: ${backupError.message}`);
    }
  }
}
