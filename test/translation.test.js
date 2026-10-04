import assert from "node:assert/strict";
import test from "node:test";
import { parseBackupTranslation, parseTranslation, splitText, splitTextByBytes, translateText } from "../src/translation.js";

test("splitText preserves long text and avoids splitting emoji", () => {
  const source = `First paragraph. ${"word ".repeat(80)}\n\nSecond 😀 paragraph. ${"word ".repeat(80)}`.trim();
  const pieces = splitText(source, 120);
  assert.ok(pieces.length > 2);
  assert.equal(pieces.map(({ text, separator }) => text + separator).join(""), source);
  assert.ok(pieces.every(({ text }) => text.length <= 120 && !text.endsWith("\ud83d")));
});

test("parseTranslation joins translated segments", () => {
  assert.deepEqual(parseTranslation([[ ["Xin chào", "Hello"], [" thế giới", " world"] ], null, "en"]), {
    text: "Xin chào thế giới", detectedLanguage: "en",
  });
});

test("splitTextByBytes keeps UTF-8 chunks under the backup limit", () => {
  const source = `こんにちは。 ${"Xin chào thế giới. ".repeat(40)}`.trim();
  const parts = splitTextByBytes(source, 180);
  assert.ok(parts.length > 2);
  assert.equal(parts.map(({ text, separator }) => text + separator).join(""), source);
  assert.ok(parts.every(({ text }) => new TextEncoder().encode(text).length <= 180));
});

test("parseBackupTranslation checks API status", () => {
  assert.deepEqual(parseBackupTranslation({ responseStatus: 200, responseData: { translatedText: "Xin chào", detectedLanguage: "en" } }), {
    text: "Xin chào", detectedLanguage: "en",
  });
  assert.throws(() => parseBackupTranslation({ responseStatus: "403", responseData: { translatedText: "quota" } }), /từ chối/);
});

test("translateText sends encoded text and joins translated chunks", async () => {
  const seen = [];
  const result = await translateText("Hello & goodbye", "vi", async (url) => {
    const params = new URL(url).searchParams;
    seen.push([params.get("q"), params.get("tl")]);
    return { ok: true, json: async () => [[["Xin chào và tạm biệt"]], null, "en"] };
  });
  assert.deepEqual(seen, [["Hello & goodbye", "vi"]]);
  assert.equal(result.text, "Xin chào và tạm biệt");
  assert.equal(result.detectedLanguage, "en");
  assert.equal(result.provider, "google");
});

test("translateText uses MyMemory after Google returns 429", async () => {
  const hosts = [];
  const result = await translateText("Hello world", "vi", async (url) => {
    const request = new URL(url);
    hosts.push(request.host);
    if (request.host === "translate.googleapis.com") return { ok: false, status: 429 };
    assert.equal(request.searchParams.get("q"), "Hello world");
    assert.equal(request.searchParams.get("langpair"), "autodetect|vi");
    return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: "Xin chào thế giới", detectedLanguage: "en" } }) };
  });
  assert.deepEqual(hosts, ["translate.googleapis.com", "api.mymemory.translated.net"]);
  assert.deepEqual(result, { text: "Xin chào thế giới", detectedLanguage: "en", provider: "mymemory" });
});

test("backup limit is reported without sending oversized text to MyMemory", async () => {
  const hosts = [];
  await assert.rejects(
    translateText("a".repeat(5_000), "vi", async (url) => {
      hosts.push(new URL(url).host);
      return { ok: false, status: 429 };
    }),
    /4\.500 byte/,
  );
  assert.deepEqual(hosts, ["translate.googleapis.com"]);
});

test("translateText cancels an in-flight request", async () => {
  const controller = new AbortController();
  const translation = translateText("Hello world", "vi", (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }), controller.signal);
  controller.abort();
  await assert.rejects(translation, /Đã dừng yêu cầu dịch/);
});
