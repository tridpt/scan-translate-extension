# Scan & Translate

[Tiếng Việt](README.md)

A Chrome/Edge extension that translates text directly on a web page. Select existing text, use the selection context menu, or draw a rectangle around text in an image. OCR runs locally; translation requires an Internet connection.

## Features

- Translate selected web text and show the result in an overlay.
- Recognize English/Vietnamese, Japanese, Korean, Simplified Chinese, and Traditional Chinese in a selected screen region.
- Open region scanning with the suggested `Alt+Shift+Q` shortcut. The popup shows the shortcut actually assigned by the browser and lets you change it.
- Set the translation target and OCR language, and turn the extension on or off.
- Use Google Translate with a MyMemory fallback when Google fails.

## Install from source

Install Node.js and npm, then run:

```bash
npm ci
npm run build
```

In `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory. This repository contains source code; `dist` is created locally by the build.

## Use

Open the extension popup, choose a target language, and click **Bôi đen chữ để dịch** (translate selected text) or **Khoanh vùng & quét chữ** (scan a region). For images, first choose the OCR language under **Chữ trong ảnh**. You can also translate a selection from the right-click menu or start region scanning with the shortcut shown in the popup. Press `Esc` to leave selection mode.

## Data and limitations

Screenshots are cropped and recognized locally. Recognized or selected **text** is sent over HTTPS to Google Translate and, if Google fails, to MyMemory. The extension does not keep a translation history. Google uses an unofficial endpoint, and MyMemory has request and free-tier limits.

Detailed guides are currently in Vietnamese: [installation](docs/INSTALLATION.md), [usage](docs/USAGE.md), [troubleshooting](docs/TROUBLESHOOTING.md), [privacy](docs/PRIVACY.md), and [development](docs/DEVELOPMENT.md).
