import puppeteer from 'puppeteer';
import { mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dir = join(__dirname, 'temporary screenshots');
mkdirSync(dir, { recursive: true });

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const existing = readdirSync(dir).filter(f => f.startsWith('screenshot-')).length;
const n = existing + 1;
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/Admin/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

// Scroll through the page to trigger Intersection Observer animations
await page.evaluate(async () => {
  const distance = 400;
  const delay = 100;
  const scrollHeight = document.body.scrollHeight;
  let current = 0;
  while (current < scrollHeight) {
    window.scrollBy(0, distance);
    current += distance;
    await new Promise(r => setTimeout(r, delay));
  }
  // Scroll back to top for the final screenshot
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

await new Promise(r => setTimeout(r, 1000));

// Take section-by-section viewport screenshots
const totalHeight = await page.evaluate(() => document.body.scrollHeight);
const viewportH = 900;
const sections = Math.ceil(totalHeight / viewportH);

for (let i = 0; i < sections; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * viewportH);
  await new Promise(r => setTimeout(r, 300));
  const sectionFile = label
    ? `screenshot-${n}-${label}-section${i + 1}.png`
    : `screenshot-${n}-section${i + 1}.png`;
  await page.screenshot({ path: join(dir, sectionFile) });
  console.log(`Saved: temporary screenshots/${sectionFile}`);
}

// Also save full page
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: join(dir, filename), fullPage: true });
console.log(`Saved: temporary screenshots/${filename}`);
await browser.close();
