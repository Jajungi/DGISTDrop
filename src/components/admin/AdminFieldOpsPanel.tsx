import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useLobbyExpiryStore } from '@/src/stores/lobbyExpiryStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { lobbyExpiryLabel } from '@/src/utils/lobbyExpiry';
import type { LobbyExpiryMode } from '@/src/types';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const ROOM_STATUS: Record<string, string> = {
  open: '모집 중',
  ready: '인원 충족',
  reserved: '코트 예약됨',
  closed: '종료',
};

export type FieldOpsSection = 'arrival' | 'lobby';

interface Props {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
  sections: FieldOpsSection[];
}

export function AdminFieldOpsPanel({ adminId, onToast, sections }: Props) {
  const rooms = useLobbyStore((s) => s.rooms);
  const adminCloseRoom = useLobbyStore((s) => s.adminCloseRoom);
  const users = useAuthStore((s) => s.users);
  const adminSetUserAtGym = useAuthStore((s) => s.adminSetUserAtGym);

  const lobbyExpiry = useLobbyExpiryStore((s) => s.config);
  const saveLobbyExpiry = useLobbyExpiryStore((s) => s.save);
  const [expiryMode, setExpiryMode] = useState<LobbyExpiryMode>(lobbyExpiry.mode);
  const [expiryHours, setExpiryHours] = useState(String(lobbyExpiry.hours));

  useEffect(() => {
    setExpiryMode(lobbyExpiry.mode);
    setExpiryHours(String(lobbyExpiry.hours));
  }, [lobbyExpiry.mode, lobbyExpiry.hours]);

  const approvedMembers = useMemo(
    () => users.filter((u) => u.memberStatus === 'approved'),
    [users]
  );
  const openRooms = rooms.filter((r) => r.status !== 'closed');
  const show = (s: FieldOpsSection) => sections.includes(s);

  return (
    <View style={styles.wrap}>
      {show('arrival') && (
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>체육관 도착 상태</Text>
          <Text style={styles.hint}>출석과 별개로 「지금 체육관」 표시를 바꿉니다.</Text>
          {approvedMembers.slice(0, 10).map((user) => (
            <View key={user.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {user.name}{' '}
                <Text style={user.isAtGym ? styles.atGym : styles.notAtGym}>
                  {user.isAtGym ? '· 도착' : '· 미도착'}
                </Text>
              </Text>
              <View style={styles.rowActions}>
                <Button
                  title="도착 처리"
                  onPress={() => {
                    const r = adminSetUserAtGym(user.id, true, adminId);
                    onToast(r.success ? 'success' : 'warning', r.message);
                  }}
                  size="sm"
                  variant="outline"
                />
                <Button
                  title="미도착 처리"
                  onPress={() => {
                    const r = adminSetUserAtGym(user.id, false, adminId);
                    onToast(r.success ? 'info' : 'warning', r.message);
                  }}
                  size="sm"
                  variant="ghost"
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      {show('lobby') && (
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>모집방 자동 종료</Text>
          <Text style={styles.hint}>
            오래 남은 모집방을 목록에서 정리합니다. 코트 예약까지 완료된 방(예약됨)은 유지됩니다.
            현재: {lobbyExpiryLabel(lobbyExpiry)}
          </Text>
          <View style={styles.chipRow}>
            {(
              [
                { key: 'hours' as const, label: '시간 단위' },
                { key: 'end_of_day' as const, label: '등록 당일까지' },
                { key: 'never' as const, label: '삭제 안 함' },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setExpiryMode(opt.key)}
                style={[styles.chip, expiryMode === opt.key && styles.chipOn]}
              >
                <Text style={[styles.chipText, expiryMode === opt.key && styles.chipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {expiryMode === 'hours' && (
            <View style={{ gap: 4 }}>
              <Text style={styles.fieldLabel}>생성 후 N시간 (1~168)</Text>
              <TextInput
                style={styles.input}
                value={expiryHours}
                onChangeText={setExpiryHours}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}
          <Button
            title="만료 설정 저장"
            size="sm"
            fullWidth
            onPress={async () => {
              const hours = Math.max(1, Math.min(168, Number(expiryHours) || 6));
              const r = await saveLobbyExpiry({ mode: expiryMode, hours });
              onToast(r.success ? 'success' : 'warning', r.message);
            }}
          />

          <View style={styles.divider} />
          <Text style={styles.blockTitle}>모집방 ({openRooms.length})</Text>
          {openRooms.length === 0 && <Text style={styles.empty}>열린 모집방이 없습니다</Text>}
          {openRooms.map((room) => (
            <View key={room.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{room.title}</Text>
              <Text style={styles.itemSub}>
                {room.hostName} · {room.members.length}/{room.maxMembers}명 ·{' '}
                {ROOM_STATUS[room.status] ?? room.status}
              </Text>
              <Button
                title="모집방 강제 종료"
                onPress={() => {
                  const r = adminCloseRoom(room.id);
                  if (r.success) {
                    recordAdminLogAsActor(adminId, {
                      category: 'social',
                      action: 'lobby.close',
                      message: `모집방 종료: ${room.title}`,
                      meta: { roomId: room.id },
                    });
                  }
                  onToast(r.success ? 'info' : 'warning', r.message);
                }}
                size="sm"
                variant="danger"
              />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.sm, padding: spacing.md },
  blockTitle: { ...typography.h3, color: colors.text, fontSize: 15 },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  fieldLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.textLight },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  itemCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  itemTitle: { ...typography.caption, fontWeight: '700', color: colors.text },
  itemSub: { ...typography.small, color: colors.textMuted },
  empty: { ...typography.caption, color: colors.textMuted },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  atGym: { color: colors.success, fontWeight: '600' },
  notAtGym: { color: colors.textMuted },
});
