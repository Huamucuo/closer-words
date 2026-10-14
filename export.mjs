// export.mjs — headless Chrome renders __frame(t) frame by frame, piped into FFmpeg.
//   node export.mjs --cues                      write cues.json for music.py
//   node export.mjs --stills 1.0,3.0,5.5        PNG stills into out/stills/
//   node export.mjs --cover                     B站 cover -> out/cover.png
//   node export.mjs [--from 0] [--to 24] [--out out/hook.mp4] [--debug] [--no-audio]
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './tools/server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const FPS = 30;

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  args[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true;
}

const findChrome = () => {
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  const hit = c.find(p => fs.existsSync(p));
  if (!hit) throw new Error('Chrome not found — set CHROME_PATH');
  return hit;
};

fs.mkdirSync(OUT, { recursive: true });
const { server, port } = await startServer(ROOT, 0);
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: ['--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

try {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${port}/promo.html?export=1${args.debug ? '&debug=1' : ''}`);
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  const duration = await page.evaluate(() => __duration());
  console.log(`renderer: ${await page.evaluate(() => __webgl())} | film ${duration.toFixed(1)}s`);

  if (args.cues) {
    const cues = await page.evaluate(() => __cues());
    fs.writeFileSync(path.join(ROOT, 'cues.json'), JSON.stringify(cues, null, 1));
    console.log(`cues.json: ${cues.cues.length} cues, ${cues.subs.length} subtitles`);
    for (const w of cues.warnings) console.log('  ⚠ subtitle too short:', w);
    fs.writeFileSync(path.join(OUT, 'chapters.txt'), cues.chapters.join('\n') + '\n');
    console.log('out/chapters.txt:\n  ' + cues.chapters.join('\n  '));
  } else if (args.cover) {
    await page.evaluate(() => __cover());
    const file = path.join(OUT, 'cover.png');
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log(file);
  } else if (args.stills) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of String(args.stills).split(',').map(Number)) {
      await page.evaluate(t => __frame(t), s);
      const file = path.join(dir, `t${s.toFixed(1).padStart(5, '0')}.png`);
      await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      console.log(file);
    }
  } else {
    const from = +(args.from || 0), to = Math.min(+(args.to || duration), duration);
    const n = Math.round((to - from) * FPS);
    const outFile = path.resolve(ROOT, args.out || (args.from || args.to ? `out/clip_${from}-${to}.mp4` : 'out/final.mp4'));
    const wav = path.join(OUT, 'audio.wav');
    const audio = !args['no-audio'] && fs.existsSync(wav);
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...(audio ? ['-ss', String(from), '-t', String(to - from), '-i', wav] : []),
      '-map', '0:v', ...(audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '320k'] : []),
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 18),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', '-shortest', outFile,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
    const cdp = await page.createCDPSession();
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => __frame(t), from + f / FPS);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 29 || f === n - 1) {
        const el = (Date.now() - t0) / 1000, eta = (el / (f + 1)) * (n - f - 1);
        process.stdout.write(`\rframe ${f + 1}/${n}  ${((f + 1) / el).toFixed(1)} fps  eta ${eta.toFixed(0)}s   `);
      }
    }
    ff.stdin.end();
    await ffDone;
    console.log(`\n${outFile}${audio ? '' : '  (no audio — run music.py first)'}`);
  }
} finally {
  await browser.close();
  server.close();
}
