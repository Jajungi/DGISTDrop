import '@/src/services/supabase/session';
import { bindAppStateCollector } from '@/src/services/persistGate';
import { collectAppStateSnapshot } from '@/src/services/appState';
import { bindPointLedger } from '@/src/services/pointLedger';
import { bindRuntimeAccess } from '@/src/stores/runtimeAccess';
import { usePointStore } from '@/src/stores/pointStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';

bindAppStateCollector(collectAppStateSnapshot);
bindPointLedger({
  record: (tx) => usePointStore.getState().recordTransaction(tx),
  updatePoints: (userId, amount) => useAuthStore.getState().updateUserPoints(userId, amount),
});
bindRuntimeAccess({
  getUsers: () => useAuthStore.getState().users,
  getCurrentUser: () => useAuthStore.getState().currentUser,
  updateUserPoints: (userId, amount) => useAuthStore.getState().updateUserPoints(userId, amount),
  updateUserElo: (userId, delta) => useAuthStore.getState().updateUserElo(userId, delta),
  recordMatchStats: (winners, losers) => useAuthStore.getState().recordMatchStats(winners, losers),
  reverseMatchStats: (winners, losers) =>
    useAuthStore.getState().reverseMatchStats(winners, losers),
  adjustCleaningContributions: (userId, delta) =>
    useAuthStore.getState().adjustCleaningContributions(userId, delta),
  pushInbox: (n) => useNotificationStore.getState().pushInbox(n),
  getPointTransactions: () => usePointStore.getState().transactions,
  revokePointTransaction: (txId, adminId, reason) =>
    usePointStore.getState().adminRevokeTransaction(txId, adminId, reason),
});
