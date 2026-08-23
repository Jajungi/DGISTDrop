/**
 * docs/changelog/releases.json → HTML + PDF
 * npm run docs:changelog
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'docs', 'changelog', 'releases.json');
const htmlPath = path.join(root, 'docs', 'changelog', 'index.html');
const siteTemplatePath = path.join(root, 'docs', 'changelog', 'site.template.html');
const expandPath = path.join(root, 'docs', 'changelog', 'expand.json');
const sitePath = path.join(root, 'public', 'history', 'index.html');
const pdfPath = path.join(root, 'docs', 'CHANGELOG.pdf');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(data) {
  const first = data.releases[0];
  const last = data.releases[data.releases.length - 1];

  const toc = data.releases
    .map(
      (r, i) => `
      <tr>
        <td class="toc-no">3.${i + 1}</td>
        <td>v${esc(r.id)} ${esc(r.title)}</td>
        <td class="toc-date">${esc(r.date)}</td>
        <td class="toc-page"><a href="#v${esc(r.id)}">이동</a></td>
      </tr>`
    )
    .join('');

  const releases = data.releases
    .map((r, i) => {
      const rows = r.changes
        .map(
          (c, n) => `
        <tr>
          <td class="col-no">${n + 1}</td>
          <td class="col-what">${esc(c.what)}</td>
        </tr>`
        )
        .join('');
      return `
      <section class="release" id="v${esc(r.id)}">
        <h2 class="h2">3.${i + 1}　v${esc(r.id)}　${esc(r.title)}</h2>
        <table class="meta-table tight">
          <tr><th>기간</th><td>${esc(r.date)}</td><th>항목 수</th><td>${r.changes.length}</td></tr>
        </table>
        <div class="purpose">
          <div class="purpose-label">이 구간</div>
          <p>${esc(r.purpose)}</p>
        </div>
        <table class="chg">
          <thead>
            <tr>
              <th class="col-no">연번</th>
              <th>변경 내용</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${esc(data.org)} — ${esc(data.subtitle)}</title>
  <style>
    @page { size: A4; }
    :root {
      --ink: #1b1d1c;
      --muted: #4d5652;
      --rule: #1b1d1c;
      --line: #c5cdc8;
      --fill: #f3f4f2;
      --head: #2a332f;
      --accent: #3d4a44;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: var(--ink);
      background: #fff;
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      font-size: 10.4pt;
      line-height: 1.62;
      letter-spacing: -0.01em;
    }
    a { color: var(--ink); text-decoration: none; }

    .cover {
      min-height: 252mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2.2px solid var(--rule);
      padding-bottom: 8px;
    }
    .letterhead .org {
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .letterhead .classif {
      font-size: 8.5pt;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .cover-body { flex: 1; padding-top: 28mm; }
    .doc-type {
      font-size: 9pt;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 10px;
    }
    .cover h1 {
      font-family: "Batang", "Noto Serif KR", "Times New Roman", serif;
      font-size: 28pt;
      font-weight: 700;
      line-height: 1.25;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .cover .product {
      font-size: 12.5pt;
      color: var(--muted);
      margin: 0 0 22mm;
    }
    .cover-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8mm;
    }
    .cover-table th, .cover-table td {
      border: 1px solid var(--rule);
      padding: 8px 10px;
      text-align: left;
      font-size: 10pt;
    }
    .cover-table th {
      width: 28%;
      background: var(--fill);
      font-weight: 700;
    }
    .cover-note {
      margin-top: auto;
      padding-top: 16mm;
      border-top: 0.6px solid var(--line);
      font-size: 8.5pt;
      color: var(--muted);
      line-height: 1.5;
    }

    .doc { padding-top: 2mm; }
    .h1 {
      font-size: 13.5pt;
      font-weight: 700;
      margin: 0 0 10px;
      padding-bottom: 5px;
      border-bottom: 1.6px solid var(--rule);
    }
    .h2 {
      font-size: 11.6pt;
      font-weight: 700;
      margin: 16px 0 8px;
      padding: 0;
    }
    .body-text { margin: 0 0 12px; }
    .lead-box {
      border: 1px solid var(--line);
      padding: 11px 12px;
      margin: 0 0 16px;
      background: #fafafa;
    }

    table.toc, table.chg, table.meta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 8px;
    }
    table.toc th, table.toc td,
    table.chg th, table.chg td,
    table.meta-table th, table.meta-table td {
      border: 1px solid var(--line);
      padding: 6px 8px;
      vertical-align: top;
      text-align: left;
    }
    table.toc th, table.chg th, table.meta-table th {
      background: var(--head);
      color: #fff;
      font-weight: 600;
      font-size: 9pt;
    }
    table.meta-table th { width: 18%; }
    table.meta-table.tight td { width: 32%; }
    table.toc .toc-no { width: 16%; font-weight: 600; }
    table.toc .toc-date { width: 26%; color: var(--muted); }
    table.toc .toc-page { width: 12%; text-align: center; }
    table.toc .toc-page a { text-decoration: underline; font-size: 9pt; color: var(--muted); }

    .release { page-break-inside: auto; margin-bottom: 14px; }
    .purpose {
      border-left: 3px solid var(--accent);
      padding: 6px 0 6px 10px;
      margin: 8px 0 10px;
    }
    .purpose-label {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .purpose p { margin: 0; }
    .col-no { width: 8%; text-align: center; font-variant-numeric: tabular-nums; }
    .col-what { width: 92%; }
    tbody tr:nth-child(even) { background: #f7f8f7; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="letterhead">
      <div class="org">${esc(data.org)}</div>
      <div class="classif">${esc(data.classification)}　·　${esc(data.docNo)}</div>
    </div>
    <div class="cover-body">
      <p class="doc-type">Technical Change Record</p>
      <h1>${esc(data.subtitle)}</h1>
      <p class="product">${esc(data.product)} — 코트 현황 · 출석 · 매칭</p>
      <table class="cover-table">
        <tr><th>문서 번호</th><td>${esc(data.docNo)}</td></tr>
        <tr><th>문서 분류</th><td>${esc(data.classification)} (배포 제한)</td></tr>
        <tr><th>작성 주체</th><td>${esc(data.org)}</td></tr>
        <tr><th>열람 대상</th><td>${esc(data.audience)}</td></tr>
        <tr><th>개정일</th><td>${esc(data.updated)}</td></tr>
        <tr><th>대상 범위</th><td>v${esc(first.id)} ~ v${esc(last.id)} (Git 저장소 및 미푸시 반영분 포함)</td></tr>
        <tr><th>근거 저장소</th><td>${esc(data.repo)}</td></tr>
      </table>
    </div>
    <p class="cover-note">
      본 문서는 운영 인수인계 및 내부 검토용이다. 대외 배포를 전제로 하지 않는다.
      변경 항목은 구현 단위가 아니라 운영상 의미 있는 목적 단위로 기술한다.
    </p>
  </section>

  <main class="doc">
    <h1 class="h1">1. 개요</h1>
    <p class="body-text">${esc(data.intro)}</p>
    <div class="lead-box">
      본 이력서는 (1) 버전 식별자, (2) 해당 구간의 범위, (3) 개별 변경 내용을 기술한다.
      이후 개정 시 문서 번호는 유지하고 개정일만 갱신한다.
    </div>

    <h1 class="h1">2. 목차</h1>
    <table class="toc">
      <thead>
        <tr>
          <th>절</th>
          <th>제목</th>
          <th>기간</th>
          <th>위치</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="toc-no">1</td><td>개요</td><td>—</td><td></td></tr>
        <tr><td class="toc-no">2</td><td>목차</td><td>—</td><td></td></tr>
        <tr><td class="toc-no">3</td><td>버전별 변경 내역</td><td>v${esc(first.id)}–v${esc(last.id)}</td><td></td></tr>
        ${toc}
      </tbody>
    </table>

    <h1 class="h1">3. 버전별 변경 내역</h1>
    ${releases}
  </main>
</body>
</html>`;
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
if (fs.existsSync(expandPath)) {
  const expand = JSON.parse(fs.readFileSync(expandPath, 'utf8'));
  for (const r of data.releases) {
    const extra = expand[r.id];
    if (!extra) continue;
    if (extra.story) r.story = extra.story;
    (extra.items || []).forEach((item, i) => {
      if (r.changes[i]) Object.assign(r.changes[i], item);
    });
  }
}
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, render(data), 'utf8');

const siteTemplate = fs.readFileSync(siteTemplatePath, 'utf8');
if (!siteTemplate.includes('/*__CHANGELOG_JSON__*/')) {
  throw new Error('changelog site template missing JSON placeholder');
}
const siteHtml = siteTemplate.replace(
  '/*__CHANGELOG_JSON__*/ null',
  JSON.stringify(data)
);
fs.mkdirSync(path.dirname(sitePath), { recursive: true });
fs.writeFileSync(sitePath, siteHtml, 'utf8');
console.log(`wrote ${path.relative(root, sitePath)}`);

const header = `
  <div style="width:100%;font-size:8pt;color:#4d5652;padding:0 15mm;font-family:'Malgun Gothic',sans-serif;display:flex;justify-content:space-between;border-bottom:0.4px solid #c5cdc8;padding-bottom:4px;">
    <span>${esc(data.org)}</span>
    <span>${esc(data.docNo)} · ${esc(data.subtitle)}</span>
  </div>`;

const footer = `
  <div style="width:100%;font-size:8pt;color:#4d5652;padding:0 15mm;font-family:'Malgun Gothic',sans-serif;display:flex;justify-content:space-between;border-top:0.4px solid #c5cdc8;padding-top:4px;">
    <span>${esc(data.classification)} · ${esc(data.updated)}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: header,
  footerTemplate: footer,
  margin: { top: '18mm', bottom: '16mm', left: '18mm', right: '18mm' },
});
await browser.close();

console.log(`wrote ${path.relative(root, htmlPath)}`);
console.log(`wrote ${path.relative(root, pdfPath)}`);
