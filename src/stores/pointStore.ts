import { create } from 'zustand';
import type { PointTransaction, PointTransactionType } from '@/src/types';
import { MOCK_POINT_TRANSACTIONS } from '@/src/services/mockData';
import { persistAppState } from '@/src/services/persistGate';
import { applyPointChange } from '@/src/services/pointLedger';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runtime } from '@/src/stores/runtimeAccess';

function isLocalPointTxId(txId: string): boolean {
  return txId.startsWith('pt-');
}

interface PointState {
  transactions: PointTransaction[];
  hydrate: (transactions: PointTransaction[]) => void;
  recordTransaction: (
    tx: Omit<PointTransaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => void;
  getTransactionsForUser: (userId: string) => PointTransaction[];
  adminRevokeTransaction: (
    txId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminGrantPoints: (
    userId: string,
    amount: number,
    type: PointTransactionType,
    description: string,
    adminId: string
  ) => { success: boolean; message: string };
}

export const usePointStore = create<PointState>((set, get) => ({
  transactions: MOCK_POINT_TRANSACTIONS,

  hydrate: (transactions) => set({ transactions }),

  recordTransaction: (tx) => {
    const entry: PointTransaction = {
      ...tx,
      id: tx.id ?? `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: tx.createdAt ?? new Date().toISOString(),
    };
    set((state) => ({
      transactions: [entry, ...state.transactions],
    }));
    persistAppState();
  },

  getTransactionsForUser: (userId) =>
    get()
      .transactions.filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  adminRevokeTransaction: (txId, adminId, reason = '운영진 취소') => {
    const tx = get().transactions.find((t) => t.id === txId);
    if (!tx) {
      return { success: false, message: '거래 내역을 찾을 수 없어요.' };
    }
    if (tx.revokedAt) {
      return { success: false, message: '이미 취소된 내역이에요.' };
    }
    if (tx.amount === 0) {
      return { success: false, message: '취소할 수 없는 내역이에요.' };
    }

    const useRemote = isSupabaseEnabled() && !isLocalPointTxId(txId);
    if (!useRemote) {
      applyPointChange(tx.userId, -tx.amount, 'admin', `포인트 취소 · ${tx.description} (${reason})`, {
        reversalOfId: txId,
      });
    } else {
      import('@/src/services/supabase/points')
        .then(({ revokePointTransactionRemote }) => revokePointTransactionRemote(txId, reason))
        .catch((err) => console.warn('[points] revoke failed', err));
      runtime().updateUserPoints(tx.userId, -tx.amount);
    }

    const revokedAt = new Date().toISOString();
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === txId ? { ...t, revokedAt, revokedBy: adminId, revokeReason: reason } : t
      ),
    }));

    recordAdminLogAsActor(adminId, {
      category: 'point',
      action: 'point.revoke',
      message: `포인트 취소 ${tx.amount >= 0 ? '+' : ''}${tx.amount}P — ${tx.description}`,
      targetId: tx.userId,
      meta: { txId, amount: tx.amount },
    });
    persistAppState();
    return { success: true, message: '포인트 내역을 취소하고 잔액을 조정했어요.' };
  },

  adminGrantPoints: (userId, amount, type, description, adminId) => {
    if (!Number.isFinite(amount) || amount === 0) {
      return { success: false, message: '0이 아닌 포인트를 입력해 주세요.' };
    }
    const trimmed = description.trim();
    if (!trimmed) {
      return { success: false, message: '설명을 입력해 주세요.' };
    }

    applyPointChange(userId, amount, type, trimmed);
    recordAdminLogAsActor(adminId, {
      category: 'point',
      action: 'point.grant',
      message: `포인트 지급 ${amount >= 0 ? '+' : ''}${amount}P — ${trimmed}`,
      targetId: userId,
      meta: { amount, type },
    });
    persistAppState();
    return {
      success: true,
      message: `${amount >= 0 ? '+' : ''}${amount}P를 지급했어요.`,
    };
  },
}));
