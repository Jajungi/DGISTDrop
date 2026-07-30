/**
 * 기능 정의서용 스크린샷 캡처
 * $env:INTRO_BASE_URL="http://localhost:8083"; node scripts/capture-intro-screenshots.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.INTRO_BASE_URL || 'http://localhost:8083';
const OUT = path.join(__dirname, '..', 'docs', 'site-intro', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  { file: 'F01-login.png', path: '/login', title: '로그인', needAuth: false },
  { file: 'F02-courts.png', path: '/', title: '코트 현황', needAuth: true },
  { file: 'F03-friends.png', path: '/friends', title: '친구', needAuth: true },
  { file: 'F04-lobby.png', path: '/lobby', title: '파트너 모집', needAuth: true },
  { file: 'F05-profile.png', path: '/profile', title: 'MY 기록', needAuth: true },
  { file: 'F06-guide.png', path: '/guide', title: '이용 안내', needAuth: true },
  { file: 'F07-coaching.png', path: '/coaching', title: '코칭·레슨', needAuth: true },
  { file: 'F08-privacy.png', path: '/privacy', title: '개인정보', needAuth: false },
];

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

async function dismissSavedPrompt(page) {
  const skip = page.getByText(/다른 계정|나중에|닫기|취소/, { exact: false });
  if ((await skip.count()) > 0) {
    try {
      await skip.first().click({ timeout: 1500 });
    } catch {
      /* ignore */
    }
  }
}

async function tryGuest(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitReady(page);
  await dismissSavedPrompt(page);
  await page.getByText('게스트', { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder(/홍길동|이름/).first().fill('스펙캡처');
  const guestBtn = page.locator('div,button,[role="button"]').filter({ hasText: /게스트로 입장/ });
  if ((await guestBtn.count()) > 0) await guestBtn.last().click();
  else await page.getByText(/게스트로 입장/).last().click();
  await page.waitForTimeout(3500);
  return !page.url().includes('/login');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // 이전 소개/마케팅용 파일 정리
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  console.log('Warming', BASE);
  for (let i = 0; i < 40; i++) {
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
      break;
    } catch {
      console.log('wait server', i);
      await page.waitForTimeout(2000);
    }
  }
  await waitReady(page);

  const authed = await tryGuest(page);
  console.log('Guest auth', authed);

  for (const item of PAGES) {
    if (item.needAuth && !authed) {
      console.log('Skip', item.file);
      continue;
    }
    console.log('Capture', item.title);
    await page.goto(`${BASE}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitReady(page);
    await page.screenshot({ path: path.join(OUT, item.file), fullPage: false });
  }

  if (authed) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.screenshot({ path: path.join(OUT, 'F02-courts-mobile.png'), fullPage: false });

    await page.setViewportSize(VIEWPORT);
    await page.goto(`${BASE}/friends`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const tab = page.getByText('일정', { exact: true });
    if ((await tab.count()) > 0) {
      await tab.first().click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, 'F03-friends-schedule.png'), fullPage: false });
    }
  }

  await browser.close();
  console.log('Done', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
