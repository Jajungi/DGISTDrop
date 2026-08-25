import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/ui/Avatar';
import type { User } from '@/src/types';
import { formatClockRange, formatClockTime, getSeoulTodayKey } from '@/src/utils/dateFormat';
import { colors, spacing, typography, borderRadius, glass, shadows } from '@/src/theme';

const SCROLL_AFTER = 8;
const SHEET_MS = 220;

function scheduleLabel(u: User, today: string): string {
  if (u.scheduleDate === today && u.scheduledStart) {
    return formatClockRange(u.scheduledStart, u.scheduledEnd) || formatClockTime(u.scheduledStart) || '시간 없음';
  }
  return '시간 없음';
}

function PeopleSection({
  title,
  empty,
  people,
  today,
  showOnline,
}: {
  title: string;
  empty: string;
  people: User[];
  today: string;
  showOnline?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} {people.length}명
      </Text>
      {people.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        people.map((u) => (
          <View key={u.id} style={styles.row}>
            <Avatar
              name={u.nickname || u.name}
              color={u.avatarColor}
              size={32}
              imageUri={u.avatarUri}
              showOnline={showOnline ? u.isAtGym : false}
            />
            <View style={styles.meta}>
              <Text style={styles.name}>{u.nickname || u.name}</Text>
              <Text style={styles.time}>{scheduleLabel(u, today)}</Text>
            </View>
            {showOnline && u.isAtGym ? (
              <View style={styles.hereBadge}>
                <Text style={styles.hereText}>체육관</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

export function GoingPeopleSheet({
  visible,
  onClose,
  goingPeople,
  atGymPeople,
}: {
  visible: boolean;
  onClose: () => void;
  goingPeople: User[];
  atGymPeople: User[];
}) {
  const today = getSeoulTodayKey();
  const total = goingPeople.length + atGymPeople.length;
  const scroll = total > SCROLL_AFTER;
  const { height } = useWindowDimensions();
  const overlayOp = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(height)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      overlayOp.setValue(0);
      sheetY.setValue(Math.min(height, 560));
      Animated.parallel([
        Animated.timing(overlayOp, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: SHEET_MS, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(overlayOp, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: Math.min(height, 560), duration: SHEET_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visible 전환만 처리
  }, [visible, height, overlayOp, sheetY]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOp }]} pointerEvents="none">
          {Platform.OS === 'web' ? (
            <View style={styles.blurWeb} />
          ) : (
            <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.dim} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>오늘 인원</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={scroll ? styles.listScroll : undefined}
            contentContainerStyle={styles.listInner}
            nestedScrollEnabled
          >
            <PeopleSection
              title="올 사람"
              empty="아직 참석을 고른 사람이 없어요."
              people={goingPeople}
              today={today}
            />
            <PeopleSection
              title="온 사람"
              empty="지금 체육관에 표시된 사람이 없어요."
              people={atGymPeople}
              today={today}
              showOnline
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  blurWeb: {
    ...StyleSheet.absoluteFillObject,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as object,
      default: {},
    }),
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '58%',
    ...shadows.md,
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  listScroll: { maxHeight: 340 },
  listInner: { gap: spacing.md, paddingBottom: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  empty: { ...typography.caption, color: colors.textSecondary, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, minWidth: 0 },
  name: { ...typography.body, color: colors.text },
  time: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  hereBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  hereText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});
