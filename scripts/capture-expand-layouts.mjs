/**
 * 코트 확대 레이아웃 3안 비교 스크린샷
 * 사전: npx expo start --web --port 8081
 * node scripts/capture-expand-layouts.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.INTRO_BASE_URL || 'http://localhost:8081';
const OUT = path.join(__dirname, '..', 'docs', 'site-intro', 'expand-layout-compare');

const MODES = [
  { key: 'top', file: 'A-top-large-court.png', label: 'A · 위 대형 코트' },
  { key: 'inline', file: 'B-inline-small-court.png', label: 'B · 폼 옆 소형' },
  { key: 'split', file: 'C-split-left-court.png', label: 'C · 왼 코트·오른 폼' },
];

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function guestLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitReady(page);
  const skip = page.getByText(/다른 계정|나중에|닫기/, { exact: false });
  if ((await skip.count()) > 0) {
    try {
      await skip.first().click({ timeout: 1000 });
    } catch {}
  }
  await page.getByText('게스트', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/홍길동|이름/).first().fill('레이아웃비교');
  const btn = page.locator('div,button,[role="button"]').filter({ hasText: /게스트로 입장/ });
  if ((await btn.count()) > 0) await btn.last().click();
  else await page.getByText(/게스트로 입장/).last().click();
  await page.waitForTimeout(3500);
}

async function ensureExpanded(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await waitReady(page);

  // 코트 현황 로드 대기
  await page.getByText('코트 현황', { exact: false }).first().waitFor({ timeout: 30000 }).catch(() => {});

  for (let attempt = 0; attempt < 8; attempt++) {
    const opened = await page.evaluate(() => {
      const w = window;
      if (typeof w.__selectCourt === 'function') {
        w.__selectCourt(1);
        return true;
      }
      return false;
    });

    if (!opened) {
      const byLabel = page.getByLabel('1번 코트');
      if ((await byLabel.count()) > 0) {
        await byLabel.first().click({ force: true });
      } else {
        // STAGE 텍스트가 있는 첫 코트 영역 클릭
        const stage = page.getByText('STAGE', { exact: true }).first();
        if ((await stage.count()) > 0) await stage.click({ force: true }).catch(() => {});
      }
    }

    await page.waitForTimeout(1200);
    const back = page.getByText('← 코트 목록');
    if ((await back.count()) > 0) return true;
    const chip = page.getByText('C · 왼 코트·오른 폼');
    if ((await chip.count()) > 0) return true;
  }
  return false;
}

async function setMode(page, mode) {
  await page.evaluate((m) => {
    const w = window;
    if (typeof w.__setExpandLayout === 'function') w.__setExpandLayout(m);
  }, mode);
  const label =
    mode === 'top' ? 'A · 위 대형 코트' : mode === 'inline' ? 'B · 폼 옆 소형' : 'C · 왼 코트·오른 폼';
  const chip = page.getByText(label, { exact: true });
  if ((await chip.count()) > 0) {
    await chip.first().click().catch(() => {});
  }
  await page.waitForTimeout(900);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  console.log('Warm', BASE);
  for (let i = 0; i < 30; i++) {
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
      break;
    } catch {
      await page.waitForTimeout(2000);
    }
  }

  await guestLogin(page);
  const ok = await ensureExpanded(page);
  if (!ok) {
    console.error('Failed to open court expand view');
    await page.screenshot({ path: path.join(OUT, 'DEBUG-failed-expand.png'), fullPage: false });
    await browser.close();
    process.exit(1);
  }
  console.log('Expand open OK');

  for (const m of MODES) {
    console.log('Capture', m.label);
    // 닫혔을 수 있으면 다시 열기
    if ((await page.getByText('← 코트 목록').count()) === 0) {
      await ensureExpanded(page);
    }
    await setMode(page, m.key);
    await page.waitForTimeout(400);
    // 비교 칩이 보이는지 확인
    const hasChip = (await page.getByText(m.label, { exact: true }).count()) > 0;
    if (!hasChip) console.warn('Chip missing for', m.label);
    await page.screenshot({ path: path.join(OUT, m.file), fullPage: false });
    console.log('Saved', m.file);
  }

  await browser.close();
  console.log('Compare shots in', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
