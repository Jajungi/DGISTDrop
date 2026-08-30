import { create } from 'zustand';
import type { CoachAnnouncement } from '@/src/types';
import { MOCK_COACH_ANNOUNCEMENTS } from '@/src/services/mockData';
import { persistAppState } from '@/src/services/persistGate';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runWhenRemoteId } from '@/src/utils/localId';
import { recordAdminLogAsCurrentUser } from '@/src/services/adminLog';
import { useAuthStore } from '@/src/stores/authStore';
import { canManageCoachAnnouncement, canPostCoachAnnouncement } from '@/src/utils/coachAccess';

interface CoachingState {
  announcements: CoachAnnouncement[];
  hydrate: (announcements: CoachAnnouncement[]) => void;
  postAnnouncement: (
    authorId: string,
    authorName: string,
    title: string,
    message: string,
    titleEn?: string,
    messageEn?: string
  ) => { success: boolean; message: string };
  removeAnnouncement: (id: string) => void;
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
  announcements: MOCK_COACH_ANNOUNCEMENTS,

  hydrate: (announcements) =>
    set({
      announcements: [...announcements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }),

  postAnnouncement: (authorId, authorName, title, message, titleEn?, messageEn?) => {
    const author =
      useAuthStore.getState().users.find((u) => u.id === authorId) ??
      useAuthStore.getState().currentUser;
    if (!canPostCoachAnnouncement(author)) {
      return { success: false, message: '코치 권한이 있는 회원만 공지를 작성할 수 있어요.' };
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      return { success: false, message: '제목과 내용을 입력해 주세요.' };
    }

    const entry: CoachAnnouncement = {
      id: `ca-${Date.now()}`,
      title: trimmedTitle,
      titleEn: titleEn?.trim() || undefined,
      message: trimmedMessage,
      messageEn: messageEn?.trim() || undefined,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    set((state) => ({
      announcements: [entry, ...state.announcements],
    }));

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/social')
        .then(({ insertCoachAnnouncementRemote }) =>
          insertCoachAnnouncementRemote(entry).then((remoteId) => {
            if (!remoteId) return;
            set((state) => ({
              announcements: state.announcements.map((a) =>
                a.id === entry.id ? { ...a, id: remoteId } : a
              ),
            }));
          })
        )
        .catch((err) => console.warn('[coach] post failed', err));
    }

    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'coach.announcement',
      message: `코치 공지: ${trimmedTitle}`,
    });
    persistAppState();
    if (isSupabaseEnabled()) {
      void import('@/src/services/supabase/pushSettings')
        .then(({ invokeBroadcastPush }) =>
          invokeBroadcastPush({
            title: trimmedTitle,
            message: trimmedMessage,
            title_en: entry.titleEn,
            message_en: entry.messageEn,
            type: 'coach',
          })
        )
        .catch((err) => console.warn('[coach] push failed', err));
    }
    return { success: true, message: '코치 공지를 등록했어요.' };
  },

  removeAnnouncement: (id) => {
    const entry = get().announcements.find((a) => a.id === id);
    const currentUser = useAuthStore.getState().currentUser;
    if (!canManageCoachAnnouncement(currentUser, entry?.authorId)) {
      return;
    }

    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));
    if (isSupabaseEnabled()) {
      runWhenRemoteId(
        () => useCoachingStore.getState().announcements.find((a) => a.id === id)?.id ?? id,
        (remoteId) =>
          import('@/src/services/supabase/social')
            .then(({ deleteCoachAnnouncementRemote }) => deleteCoachAnnouncementRemote(remoteId))
            .catch((err) => console.warn('[coach] remove failed', err))
      );
    }
    persistAppState();
  },
}));
