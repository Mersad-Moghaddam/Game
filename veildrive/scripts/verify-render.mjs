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

await browser.close();
server.kill();

if (errors.length) {
  console.error('verify-render: console errors:', errors);
  process.exit(1);
}
if (!state.available) console.warn('verify-render: WebGL unavailable — canvas fallback in use.');
if (!(variance > 0)) {
  console.error('verify-render: frame looked blank (variance 0).');
  process.exit(1);
}
console.log(`verify-render passed. webgl=${state.gl} renderer=${state.available} uiVariance=${variance.toFixed(1)}`);
