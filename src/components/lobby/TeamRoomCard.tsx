import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TeamRoom } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface TeamRoomCardProps {
  room: TeamRoom;
  onJoin: () => void;
  onLeave?: () => void;
  onReserveCourt?: () => void;
  onAcceptJoin?: (requestId: string) => void;
  onRejectJoin?: (requestId: string) => void;
  isMember: boolean;
  isHost: boolean;
  hasPendingRequest?: boolean;
}

const STATUS_LABELS = {
  open: '모집중',
  ready: '예약가능',
  reserved: '예약완료',
  closed: '종료',
};

export function TeamRoomCard({
  room,
  onJoin,
  onLeave,
  onReserveCourt,
  onAcceptJoin,
  onRejectJoin,
  isMember,
  isHost,
  hasPendingRequest,
}: TeamRoomCardProps) {
  const canReserve = isHost && room.status === 'ready' && room.members.length >= room.minMembers;
  const joinRequests = room.joinRequests ?? [];

  return (
    <Card style={room.isHot ? [styles.card, styles.hotCard] : styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {room.title}
        </Text>
        {room.hasPassword && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>비밀방</Text>
          </View>
        )}
        {room.isHot && (
          <View style={styles.hotBadge}>
            <Text style={styles.hotText}>HOT</Text>
          </View>
        )}
      </View>

      <Text style={styles.host}>방장 {room.hostName}</Text>

      <View style={styles.rankFilter}>
        {room.minRank && <RankBadge rank={room.minRank} size="sm" />}
        {room.minRank && room.maxRank && <Text style={styles.rankSep}>~</Text>}
        {room.maxRank && <RankBadge rank={room.maxRank} size="sm" />}
        {!room.minRank && !room.maxRank && <Text style={styles.noFilter}>랭크 제한 없음</Text>}
      </View>

      <View style={styles.members}>
        {room.members.map((m) => (
          <Avatar key={m.userId} name={m.name} color={m.avatarColor} size={32} />
        ))}
        {Array.from({ length: room.maxMembers - room.members.length }, (_, i) => (
          <View key={`empty-${i}`} style={styles.emptySlot} />
        ))}
      </View>

      {isHost && joinRequests.length > 0 && (
        <View style={styles.requests}>
          <Text style={styles.requestsTitle}>참가 신청 {joinRequests.length}</Text>
          {joinRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Avatar name={req.name} color={req.avatarColor} size={28} />
              <Text style={styles.requestName}>{req.name}</Text>
              <RankBadge rank={req.rank} size="sm" />
              <View style={styles.requestActions}>
                {onAcceptJoin && (
                  <Button title="수락" onPress={() => onAcceptJoin(req.id)} size="sm" />
                )}
                {onRejectJoin && (
                  <Button title="거절" onPress={() => onRejectJoin(req.id)} size="sm" variant="ghost" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.statusWrap}>
          <Text style={[styles.status, room.status === 'ready' && styles.readyStatus]}>
            {STATUS_LABELS[room.status]}
          </Text>
          <Text style={styles.memberCount}>
            {room.members.length}/{room.maxMembers}명
          </Text>
        </View>

        <View style={styles.actions}>
          {canReserve && onReserveCourt && (
            <Button title="코트 예약" onPress={onReserveCourt} size="sm" />
          )}
          {!isMember && !hasPendingRequest && room.status !== 'reserved' && room.status !== 'closed' && (
            <Button title="참가 신청" onPress={onJoin} size="sm" />
          )}
          {!isMember && hasPendingRequest && (
            <Text style={styles.memberLabel}>승인 대기</Text>
          )}
          {isMember && room.status !== 'reserved' && onLeave && (
            <Button title="나가기" onPress={onLeave} size="sm" variant="ghost" />
          )}
          {isMember && room.status === 'reserved' && (
            <Text style={styles.memberLabel}>예약됨</Text>
          )}
          {isMember && room.status !== 'reserved' && !canReserve && (
            <Text style={styles.memberLabel}>참여중</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  hotCard: {},
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  lockBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockText: { ...typography.small, color: colors.textMuted, fontWeight: '600', fontSize: 9 },
  hotBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hotText: { ...typography.small, color: colors.primary, fontSize: 9 },
  host: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  rankFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  rankSep: { color: colors.textMuted },
  noFilter: { ...typography.caption, color: colors.textMuted },
  members: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  emptySlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  requests: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  requestsTitle: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestName: { ...typography.body, color: colors.text, flex: 1, fontSize: 13 },
  requestActions: { flexDirection: 'row', gap: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statusWrap: { gap: 2 },
  status: { ...typography.label, color: colors.textSecondary },
  readyStatus: { color: colors.success },
  memberCount: { ...typography.small, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberLabel: { ...typography.label, color: colors.primary },
});
