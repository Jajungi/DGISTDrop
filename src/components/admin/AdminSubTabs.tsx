import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export interface AdminSubTabItem<T extends string> {
  key: T;
  label: string;
  badge?: number;
}

interface AdminSubTabsProps<T extends string> {
  items: AdminSubTabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}

/** 관리자 그룹 안쪽 세부 탭 */
export function AdminSubTabs<T extends string>({ items, active, onChange }: AdminSubTabsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.barContent}
    >
      {items.map((item) => {
        const on = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
            {item.badge != null && item.badge > 0 ? (
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, marginBottom: spacing.sm },
  barContent: { gap: 6, paddingBottom: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipOn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  chipTextOn: { color: colors.primary },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: { backgroundColor: colors.primary },
  badgeText: {
    color: colors.textLight,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
