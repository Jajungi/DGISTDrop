import type { AppNotification, PointTransaction, User } from '@/src/types';

export type InboxDraft = Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { id?: string };

type RuntimeAccess = {
  getUsers: () => User[];
  getCurrentUser: () => User | null;
  updateUserPoints: (userId: string, amount: number) => void;
  updateUserElo: (userId: string, delta: number) => void;
  recordMatchStats: (winners: string[], losers: string[]) => void;
  reverseMatchStats: (winners: string[], losers: string[]) => void;
  adjustCleaningContributions: (userId: string, delta: number) => void;
  pushInbox: (n: InboxDraft) => void;
  getPointTransactions: () => PointTransaction[];
  revokePointTransaction: (
    txId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
};

const unbound: RuntimeAccess = {
  getUsers: () => [],
  getCurrentUser: () => null,
  updateUserPoints: () => {},
  updateUserElo: () => {},
  recordMatchStats: () => {},
  reverseMatchStats: () => {},
  adjustCleaningContributions: () => {},
  pushInbox: () => {},
  getPointTransactions: () => [],
  revokePointTransaction: () => ({ success: false, message: '' }),
};

let access: RuntimeAccess = unbound;

export function bindRuntimeAccess(next: RuntimeAccess) {
  access = next;
}

export function runtime(): RuntimeAccess {
  return access;
}
