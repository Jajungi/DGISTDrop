import type { PwaInstallContext } from '@/src/utils/clientDevice';
import type { PwaInstallGuide, PwaInstallVisibilityInfo } from '@/src/constants/pwaInstallGuide';

const GUIDE_WHERE = 'Help & rules → How to use the app → Install web app';

const EN_GUIDES: Record<PwaInstallContext, PwaInstallGuide> = {
  'ios-safari': {
    context: 'ios-safari',
    title: 'iPhone · Add to Home Screen in Safari',
    intro:
      'Push notifications don’t work in a Safari tab. Follow the steps below, then open Drop from the home screen icon.',
    posterSrc: '/guide/pwa/ios-safari-guide.png',
    posterAlt: 'How to add Drop to the iPhone home screen in Safari',
    steps: [
      {
        title: 'Open in Safari',
        description: 'Open Drop in Safari with dgistdrop.com in the address bar.',
      },
      {
        title: 'Tap Share',
        description: 'Tap the Share button at the bottom center of the screen.',
      },
      {
        title: 'Add to Home Screen',
        description: 'Choose Add to Home Screen, then tap Add in the top right.',
      },
      {
        title: 'Open from the icon',
        description: 'Launch Drop from the home screen icon, then turn on notifications in Settings.',
      },
    ],
    hint: 'If you opened the link in Chrome or another app, switch to Safari first.',
  },
  'ios-other': {
    context: 'ios-other',
    title: 'iPhone · Open in Safari',
    intro:
      'You’re not in Safari. On iPhone, home screen install and push only work in Safari.',
    posterSrc: '/guide/pwa/ios-other-guide.png',
    posterAlt: 'Switch to Safari, then add to home screen',
    steps: [
      { title: 'Open Safari', description: 'Launch the Safari app on your iPhone.' },
      { title: 'Enter the URL', description: 'Go to dgistdrop.com in the address bar.' },
      {
        title: 'Add to Home Screen',
        description: 'Tap Share → Add to Home Screen → Add.',
      },
      { title: 'Open from the icon', description: 'Open Drop from the new home screen icon.' },
    ],
    hint: 'Once you’re in Safari, the guide updates to Safari-specific steps.',
  },
  'android-chrome': {
    context: 'android-chrome',
    title: 'Android · Install in Chrome',
    intro:
      'Use Install app or Add to Home Screen from the Chrome menu, or tap Install app on the login/settings screen.',
    posterSrc: '/guide/pwa/android-chrome-guide.png',
    posterAlt: 'How to install Drop in Chrome on Android',
    steps: [
      { title: 'Open in Chrome', description: 'Open dgistdrop.com in a Chrome tab.' },
      { title: 'Menu (⋮)', description: 'Tap the three-dot menu in the top right.' },
      { title: 'Install app', description: 'Choose Install app or Add to Home screen.' },
      { title: 'Open from the icon', description: 'Launch Drop from your home screen or app drawer.' },
    ],
    hint: 'If you see Install app on login or Settings, that works too.',
  },
  'android-browser': {
    context: 'android-browser',
    title: 'Android · Add a shortcut',
    intro:
      'You’re not in Chrome. Look for Add to Home screen or a shortcut option in your browser menu.',
    posterSrc: '/guide/pwa/android-browser-guide.png',
    posterAlt: 'Add Drop to the home screen on Android',
    steps: [
      { title: 'Open in your browser', description: 'Open dgistdrop.com in Samsung Internet or your current browser.' },
      { title: 'Open the menu', description: 'Tap the menu button (often ⋮).' },
      {
        title: 'Add shortcut',
        description: 'Choose Add page → Web app or Home screen.',
      },
      { title: 'Open from the icon', description: 'Launch Drop from the shortcut on your home screen.' },
    ],
    hint: 'Menu labels vary by browser. Chrome is recommended.',
  },
  'desktop-chrome': {
    context: 'desktop-chrome',
    title: 'PC · Install in Chrome',
    intro: 'Optional. Install Drop as a windowed app instead of a browser tab.',
    posterSrc: '/guide/pwa/desktop-chrome-guide.png',
    posterAlt: 'Install Drop as an app in Chrome',
    steps: [
      { title: 'Open in Chrome', description: 'Open dgistdrop.com in Chrome.' },
      { title: 'Menu (⋮)', description: 'Open the ⋮ menu → Cast, save, and share.' },
      {
        title: 'Install app',
        description: 'Choose Install page as app, or use the ⊕ icon in the address bar and confirm.',
      },
    ],
    hint: 'Optional. Full instructions are in Help & rules.',
  },
  'desktop-edge': {
    context: 'desktop-edge',
    title: 'PC · Install in Edge',
    intro: 'Optional. You can install Drop in Edge app mode.',
    posterSrc: '/guide/pwa/desktop-edge-guide.png',
    posterAlt: 'Install Drop as an app in Edge',
    steps: [
      { title: 'Open in Edge', description: 'Open dgistdrop.com in Edge.' },
      { title: 'Menu (⋯)', description: 'Tap the … More menu in the top right.' },
      {
        title: 'Install app',
        description: 'Go to More tools → Apps → Install this site as an app.',
      },
      {
        title: 'Confirm',
        description: 'Click Install. Launch Drop from the Start menu or desktop.',
      },
    ],
    hint: 'Optional. Full instructions are in Help & rules.',
  },
  'desktop-other': {
    context: 'desktop-other',
    title: 'PC · Chrome or Edge recommended',
    intro: 'Your browser may not support install. Try Chrome or Edge.',
    posterSrc: '/guide/pwa/desktop-chrome-guide.png',
    posterAlt: 'Install Drop in Chrome or Edge',
    steps: [
      { title: 'Install Chrome or Edge', description: 'Download Chrome or Edge if needed.' },
      { title: 'Open Drop', description: 'Open dgistdrop.com in Chrome or Edge.' },
      { title: 'Install app', description: 'Look for Install page as app in the menu.' },
    ],
    hint: 'Firefox and others may only support bookmarks.',
  },
};

export function getPwaInstallVisibilityEn(
  ctx: PwaInstallContext | null,
  label: string
): PwaInstallVisibilityInfo {
  if (!ctx) {
    return {
      environmentLabel: 'Home screen web app or native app',
      showWhere: [`${GUIDE_WHERE} (when it appears)`],
      hideWhen: [
        'Opened from the Drop home screen icon (installed web app) — all install prompts hidden',
        'Drop app from the Play Store',
      ],
      note: 'If you open dgistdrop.com again in Safari or Chrome, install cards reappear on iPhone and Android. On PC, only Help & rules shows the guide.',
    };
  }

  const isDesktop = ctx.startsWith('desktop');

  return {
    environmentLabel: `${label} · browser tab (not installed)`,
    showWhere: isDesktop
      ? [`${GUIDE_WHERE} (steps and images)`]
      : [
          `${GUIDE_WHERE} (steps and images)`,
          'Install card on the sign-in screen',
          'Install card in Settings',
        ],
    hideWhen: [
      'Opened from the Drop home screen icon',
      'Drop app from the Play Store',
      ...(isDesktop ? ['Sign-in and Settings on PC (guide only in Help & rules)'] : []),
    ],
    note: isDesktop
      ? 'On PC, install is optional and only shown in Help & rules.'
      : 'In a browser tab, the guide appears in all three places above.',
  };
}

export function getPwaInstallGuidesEn(): Record<PwaInstallContext, PwaInstallGuide> {
  return EN_GUIDES;
}
