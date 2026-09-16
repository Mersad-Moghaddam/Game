import { spawn } from 'node:child_process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('verify-render: playwright not installed — skipping.');
  process.exit(0);
}

const server = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1000));

let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
} catch (err) {
  console.warn('verify-render: could not launch chromium — skipping.', err.message);
  server.kill();
  process.exit(0);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

const state = await page.evaluate(() => ({
  gl: !!(document.getElementById('gl').getContext('webgl2') || document.getElementById('gl').getContext('webgl')),
  available: window.__VEILDRIVE__?.renderer?.available ?? null,
}));

await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.keyboard.down('w');
await page.waitForTimeout(600);
await page.mouse.click(640, 360);
await page.waitForTimeout(400);
await page.keyboard.up('w');
await page.waitForTimeout(600);

const variance = await page.evaluate(() => {
  const el = document.querySelector('#ui');
  const ctx = el.getContext('2d');
  const d = ctx.getImageData(0, 0, el.width, el.height).data;
  let sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4000) { const v = d[i]; sum += v; sum2 += v * v; n++; }
  return sum2 / n - (sum / n) ** 2;
});

const glInfo = await page.evaluate(() => {
  const el = document.getElementById('gl');
  if (!el || !el.width) return { skipped: true };
  const c = document.createElement('canvas'); c.width = 160; c.height = 90;
  const ctx = c.getContext('2d'); ctx.drawImage(el, 0, 0, 160, 90);
  const d = ctx.getImageData(0, 0, 160, 90).data;
  let sum = 0, sum2 = 0, n = 0, bright = 0;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; sum2 += v * v; n++; if (v > 14) bright++; }
  return { variance: sum2 / n - (sum / n) ** 2, brightRatio: bright / n, w: el.width, h: el.height };
});

await browser.close();
server.kill();

if (errors.length) {
  console.error('verify-render: console errors:', errors);
  process.exit(1);
}
if (!state.available) console.warn('verify-render: WebGL unavailable — canvas fallback in use.');
if (!(variance > 0)) {
  console.error('verify-render: UI overlay looked blank (variance 0).');
  process.exit(1);
}
if (state.available && glInfo && !glInfo.skipped) {
  if (!(glInfo.variance > 0) || !(glInfo.brightRatio > 0.05)) {
    console.error(`verify-render: pixel world looked blank/dark (variance ${glInfo.variance?.toFixed(1)}, bright ${glInfo.brightRatio?.toFixed(3)}).`);
    process.exit(1);
  }
}
console.log(`verify-render passed. webgl=${state.gl} renderer=${state.available} uiVariance=${variance.toFixed(1)} world=${glInfo?.skipped ? 'n/a' : `${glInfo.w}x${glInfo.h} var ${glInfo.variance.toFixed(1)} bright ${glInfo.brightRatio.toFixed(3)}`}`);
