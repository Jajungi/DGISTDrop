import { Platform } from 'react-native';
import { collectAppStateSnapshot } from '@/src/services/appState';
import { hydrateFromSyncPayload } from '@/src/services/hydrateApp';
import { bindServerSyncNotifier } from '@/src/services/syncNotify';
import { useCourtStore } from '@/src/stores/courtStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';

import type { ServerSyncPayload } from '@/src/services/syncTypes';

export type { ServerSyncPayload } from '@/src/services/syncTypes';

const PUSH_DEBOUNCE_MS = 500;
const RECONNECT_MS = 3000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressPullUntil = 0;
let suppressPushUntil = 0;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastAppliedAt = 0;

export function getSyncServerUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_SYNC_URL?.trim();
  return url || null;
}

export function isServerSyncEnabled(): boolean {
  return !!getSyncServerUrl();
}

function baseUrl(): string {
  const url = getSyncServerUrl();
  if (!url) throw new Error('Sync URL not configured');
  return url.replace(/\/$/, '');
}

function wsUrl(): string {
  const http = baseUrl();
  if (http.startsWith('https://')) return http.replace('https://', 'wss://') + '/ws';
  return http.replace('http://', 'ws://') + '/ws';
}

export function collectServerSyncPayload(): ServerSyncPayload {
  return {
    appState: collectAppStateSnapshot(),
    courts: useCourtStore.getState().courts,
    rooms: useLobbyStore.getState().rooms,
    updatedAt: Date.now(),
  };
}

export async function pullFromServer(): Promise<boolean> {
  if (!isServerSyncEnabled()) return false;
  if (Date.now() < suppressPullUntil) return false;

  try {
    const res = await fetch(`${baseUrl()}/api/sync`);
    if (!res.ok) return false;
    const payload = (await res.json()) as ServerSyncPayload;
    if (!payload.updatedAt || payload.updatedAt <= lastAppliedAt) return false;

    suppressPushUntil = Date.now() + 800;
    lastAppliedAt = payload.updatedAt;
    hydrateFromSyncPayload(payload, { skipCleaningBonus: true });
    return true;
  } catch {
    return false;
  }
}

export async function pushToServer(): Promise<void> {
  if (!isServerSyncEnabled()) return;
  if (Date.now() < suppressPushUntil) return;

  try {
    const payload = collectServerSyncPayload();
    const res = await fetch(`${baseUrl()}/api/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { updatedAt?: number };
      if (data.updatedAt) lastAppliedAt = data.updatedAt;
    }
  } catch {
    /* 오프라인 — 로컬만 사용 */
  }
}

export function scheduleServerPush() {
  if (!isServerSyncEnabled()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushToServer();
  }, PUSH_DEBOUNCE_MS);
}

function connectWebSocket() {
  if (!isServerSyncEnabled() || typeof WebSocket === 'undefined') return;

  try {
    ws = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onmessage = () => {
    void pullFromServer();
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (!isServerSyncEnabled()) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, RECONNECT_MS);
}

/** 앱 시작 시: 서버에서 최신 상태 pull + WebSocket 구독 */
export async function initServerSync() {
  if (!isServerSyncEnabled()) return;

  await pullFromServer();

  if (Platform.OS === 'web' || typeof WebSocket !== 'undefined') {
    connectWebSocket();
  }
}

export function notifyServerSync() {
  scheduleServerPush();
}

bindServerSyncNotifier(scheduleServerPush);
