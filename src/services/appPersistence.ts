import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AttendanceRecord,
  FriendRequest,
  LessonApplication,
  LessonQueueEntry,
  MatchResult,
  PointTransaction,
  User,
  AppNotification,
  CleaningSubmission,
  AdminLogEntry,
  CoachAnnouncement,
} from '@/src/types';
import { notifyCrossTabSync } from '@/src/services/tabSyncNotify';
import { notifyServerSync } from '@/src/services/syncNotify';

const APP_STATE_KEY = '@badmin/app-state';

export interface FriendshipsMap {
  [userId: string]: string[];
}

export interface AppStateSnapshot {
  sessionUserId: string | null;
  users: User[];
  attendanceRecords: AttendanceRecord[];
  friendships: FriendshipsMap;
  friendRequests: FriendRequest[];
  pointTransactions: PointTransaction[];
  matchHistory: MatchResult[];
  pendingMatches: MatchResult[];
  cleaningLeaderboard: CleaningSubmission[];
  inbox: AppNotification[];
  dismissedLiveAlertIds?: string[];
  lessonApplications: LessonApplication[];
  lessonQueue: LessonQueueEntry[];
  peakResetDate: string | null;
  credentials: Record<string, string>;
  lastCleaningBonusMonth: string | null;
  adminLogs?: AdminLogEntry[];
  coachAnnouncements?: CoachAnnouncement[];
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadAppState(): Promise<AppStateSnapshot | null> {
  const raw = await AsyncStorage.getItem(APP_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppStateSnapshot;
  } catch {
    return null;
  }
}

export async function saveAppState(snapshot: AppStateSnapshot): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(snapshot));
}

export function scheduleSaveAppState(getSnapshot: () => AppStateSnapshot) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAppState(getSnapshot())
      .then(() => {
        notifyCrossTabSync();
        notifyServerSync();
      })
      .catch(() => {});
  }, 400);
}

export async function clearAppState(): Promise<void> {
  await AsyncStorage.removeItem(APP_STATE_KEY);
}
