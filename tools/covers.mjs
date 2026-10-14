// covers.mjs — renders the three covers (16:9, 4:3, 3:4) from cover.html into out/cover_*.png
//   node tools/covers.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const SIZES = { '16x9': [1920, 1080], '4x3': [1440, 1080], '3x4': [1080, 1440] };
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  .filter(Boolean).find(p => fs.existsSync(p));

fs.mkdirSync(OUT, { recursive: true });
const { server, port } = await startServer(ROOT, 0);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
try {
  for (const [kind, [w, h]] of Object.entries(SIZES)) {
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('[page error]', e.message));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/cover.html?kind=${kind}`);
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    await page.evaluate(() => __drawCover());
    const file = path.join(OUT, `cover_${kind}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
    console.log(file, `${w}x${h}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
