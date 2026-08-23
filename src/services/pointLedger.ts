import type { PointTransaction, PointTransactionType } from '@/src/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { isPointsFeaturesEnabled } from '@/src/stores/featureFlagsStore';

type LedgerHooks = {
  record: (
    tx: Omit<PointTransaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => void;
  updatePoints: (userId: string, amount: number) => void;
};

let hooks: LedgerHooks | null = null;

export function bindPointLedger(next: LedgerHooks) {
  hooks = next;
}

export function applyPointChange(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: PointTransaction['meta']
) {
  if (!isPointsFeaturesEnabled()) return;
  hooks?.record({ userId, amount, type, description, meta });
  hooks?.updatePoints(userId, amount);

  if (isSupabaseEnabled()) {
    import('@/src/services/supabase/points')
      .then(({ adjustPointsRemote }) =>
        adjustPointsRemote(userId, amount, type, description, meta)
      )
      .catch((err) => console.warn('[points] adjust failed', err));
  }
}

export function applyPointChangeLocalOnly(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: PointTransaction['meta']
) {
  if (!isPointsFeaturesEnabled()) return;
  hooks?.record({ userId, amount, type, description, meta });
  hooks?.updatePoints(userId, amount);
}
