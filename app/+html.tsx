import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';
import { darkPalette, lightPalette, paletteToCssVars } from '@/src/theme/palettes';

/** Cloudflare Pages 기본 배포 URL — OG 이미지는 절대 경로 필요 */
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://dgistdrop.com';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const SITE_TITLE = 'Drop — DGIST 배드민턴';
const SITE_DESC = 'DGIST 배드민턴 동아리 Drop — 코트 현황·출석·매칭';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F3F8F6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F1112" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Drop" />
        <meta name="description" content={SITE_DESC} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Drop" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="ko_KR" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  color-scheme: light;
  ${paletteToCssVars(lightPalette)}
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    ${paletteToCssVars(darkPalette)}
  }
}

html[data-theme="light"] {
  color-scheme: light;
  ${paletteToCssVars(lightPalette)}
}

html[data-theme="dark"] {
  color-scheme: dark;
  ${paletteToCssVars(darkPalette)}
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--drop-background, #F3F8F6);
  color: var(--drop-text, #2A3D45);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  overflow-x: hidden;
}

#root, [data-expo-router-root] {
  display: flex;
  flex: 1;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

@media (max-width: 767px) {
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  #root, [data-expo-router-root] {
    height: 100dvh;
    max-height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }
  #root > div, [data-expo-router-root] > div {
    max-width: 100%;
    margin: 0 auto;
    overflow: hidden;
    height: 100%;
  }
}

@media (min-width: 768px) {
  body { background-color: var(--drop-background, #F3F8F6); }
  #root > div, [data-expo-router-root] > div {
    width: 100%;
    max-width: none;
  }
}

/* 웹앱은 orientation.lock이 자주 실패함. 세로 잠금 후 가로는 CSS로 강제 */
html[data-app-orient="landscape-right"] body,
html[data-app-orient="landscape-left"] body {
  position: fixed;
  overflow: hidden;
  box-sizing: border-box;
}
html[data-app-orient="landscape-right"] body {
  top: 0;
  left: 100vw;
  width: 100dvh;
  height: 100dvw;
  transform: rotate(90deg);
  transform-origin: top left;
}
html[data-app-orient="landscape-left"] body {
  top: 100dvh;
  left: 0;
  width: 100dvh;
  height: 100dvw;
  transform: rotate(-90deg);
  transform-origin: top left;
}
html[data-app-orient="landscape-right"] #root,
html[data-app-orient="landscape-right"] [data-expo-router-root],
html[data-app-orient="landscape-left"] #root,
html[data-app-orient="landscape-left"] [data-expo-router-root],
html[data-app-orient="landscape-right"] #root > div,
html[data-app-orient="landscape-right"] [data-expo-router-root] > div,
html[data-app-orient="landscape-left"] #root > div,
html[data-app-orient="landscape-left"] [data-expo-router-root] > div {
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: none;
  max-height: none;
  overflow: hidden;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--drop-borderStrong, #C5CDD6); border-radius: 3px; }
`;
