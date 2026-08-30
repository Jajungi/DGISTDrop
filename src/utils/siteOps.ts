import type { ClubEvent, SiteOverlay, SiteOverlaySurface } from '@/src/types';
import type { AppLocale } from '@/src/i18n/types';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

/** 동아리 달력·휴관은 한국 날짜 기준 */
export function todayLocalISODate(d = new Date()): string {
  return getSeoulTodayKey(d);
}

export function isClubEventActiveOn(event: ClubEvent, dateISO = todayLocalISODate()): boolean {
  if (!event.active) return false;
  return event.dateStart <= dateISO && dateISO <= event.dateEnd;
}

export function getActiveClubEvents(events: ClubEvent[], dateISO = todayLocalISODate()): ClubEvent[] {
  return events.filter((e) => isClubEventActiveOn(e, dateISO) && e.showBanner !== false);
}

export function clubEventKindLabel(kind: ClubEvent['kind'], locale: AppLocale = 'ko'): string {
  if (locale === 'en') {
    if (kind === 'closure') return 'Closure';
    if (kind === 'extra') return 'Extra activity day';
    return 'Banner notice';
  }
  if (kind === 'closure') return '휴관';
  if (kind === 'extra') return '추가 활동일';
  return '배너 공지';
}

export function isOverlayInWindow(overlay: SiteOverlay, now = new Date()): boolean {
  if (!overlay.active) return false;
  const t = now.getTime();
  if (overlay.startsAt) {
    const s = Date.parse(overlay.startsAt);
    if (!Number.isNaN(s) && t < s) return false;
  }
  if (overlay.endsAt) {
    const e = Date.parse(overlay.endsAt);
    if (!Number.isNaN(e) && t > e) return false;
  }
  return true;
}

export function overlaysForSurface(
  overlays: SiteOverlay[],
  surface: SiteOverlaySurface,
  now = new Date()
): SiteOverlay[] {
  return overlays
    .filter((o) => isOverlayInWindow(o, now) && o.surfaces.includes(surface))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function newOverlayId(): string {
  return `ov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newEventId(): string {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeOverlays(raw: unknown): SiteOverlay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const surfaces = Array.isArray(o.surfaces)
        ? (o.surfaces.filter((s) =>
            s === 'login' || s === 'post_login' || s === 'home'
          ) as SiteOverlaySurface[])
        : [];
      if (!surfaces.length) return null;
      const title = String(o.title ?? '').trim();
      const body = String(o.body ?? '').trim();
      if (!title && !body) return null;
      return {
        id: String(o.id ?? newOverlayId()),
        title: title || '공지',
        titleEn: o.titleEn ? String(o.titleEn).trim() : o.title_en ? String(o.title_en).trim() : undefined,
        body,
        bodyEn: o.bodyEn ? String(o.bodyEn).trim() : o.body_en ? String(o.body_en).trim() : undefined,
        surfaces,
        active: o.active !== false,
        dismissible: o.dismissible !== false,
        startsAt: o.startsAt ? String(o.startsAt) : undefined,
        endsAt: o.endsAt ? String(o.endsAt) : undefined,
        createdAt: String(o.createdAt ?? new Date().toISOString()),
        updatedAt: String(o.updatedAt ?? new Date().toISOString()),
      } satisfies SiteOverlay;
    })
    .filter(Boolean) as SiteOverlay[];
}

export function normalizeClubEvents(raw: unknown): ClubEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const kind =
        o.kind === 'special'
          ? 'special'
          : o.kind === 'closure'
            ? 'closure'
            : o.kind === 'extra'
              ? 'extra'
              : null;
      if (!kind) return null;
      const dateStart = String(o.dateStart ?? '').slice(0, 10);
      const dateEnd = String(o.dateEnd ?? dateStart).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) return null;
      const title = String(o.title ?? '').trim();
      if (!title) return null;
      let pushNotify: ClubEvent['pushNotify'];
      if (o.pushNotify && typeof o.pushNotify === 'object') {
        const p = o.pushNotify as Record<string, unknown>;
        const rawTime = String(p.time ?? '09:00');
        const tm = /^(\d{1,2}):(\d{2})$/.exec(rawTime.trim());
        const time = tm
          ? `${String(Number(tm[1])).padStart(2, '0')}:${tm[2]}`
          : '09:00';
        pushNotify = {
          enabled: p.enabled === true,
          time,
          sentDates: Array.isArray(p.sentDates)
            ? p.sentDates.map((d) => String(d).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            : undefined,
        };
      }
      return {
        id: String(o.id ?? newEventId()),
        kind,
        title,
        titleEn: o.titleEn ? String(o.titleEn).trim() : o.title_en ? String(o.title_en).trim() : undefined,
        body: o.body ? String(o.body) : undefined,
        bodyEn: o.bodyEn ? String(o.bodyEn).trim() : o.body_en ? String(o.body_en).trim() : undefined,
        dateStart,
        dateEnd: dateEnd < dateStart ? dateStart : dateEnd,
        active: o.active !== false,
        showBanner: o.showBanner !== false,
        pushNotify,
      } satisfies ClubEvent;
    })
    .filter(Boolean) as ClubEvent[];
}
