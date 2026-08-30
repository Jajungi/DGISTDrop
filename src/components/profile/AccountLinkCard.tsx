import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { GoogleBrandIcon } from '@/src/components/auth/SocialBrandIcons';
import {
  ACTIVE_SOCIAL_PROVIDERS,
  SOCIAL_PROVIDER_LABELS,
  type SocialProvider,
} from '@/src/constants/socialAuth';
import {
  getLinkedSocialProviders,
  linkSocialProvider,
  unlinkSocialProvider,
  isSocialAuthAvailable,
} from '@/src/services/supabase/socialAuth';

const ICON_SIZE = 32;
const LOGO_SIZE = 15;
const WIDE_ICON_SIZE = 22;
const WIDE_LOGO_SIZE = 18;

/** 로그인 탭 간편 로그인과 동일 — 넓으면 가로 전체 버튼 */
const WIDE_LAYOUT_MIN_WIDTH = 420;

interface AccountLinkCardProps {
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

function GoogleIconCircle({
  size = ICON_SIZE,
  logoSize = LOGO_SIZE,
}: {
  size?: number;
  logoSize?: number;
}) {
  return (
    <View
      style={[
        styles.iconCircle,
        styles.googleCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <GoogleBrandIcon size={logoSize} />
    </View>
  );
}

export function AccountLinkCard({ onToast }: AccountLinkCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const wideLayout = windowWidth >= WIDE_LAYOUT_MIN_WIDTH;
  const [linked, setLinked] = useState<SocialProvider[]>([]);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSocialAuthAvailable()) {
      setLinked([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setLinked(await getLinkedSocialProviders());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const onProviderPress = async (provider: SocialProvider) => {
    const isLinked = linked.includes(provider);
    setBusy(provider);
    try {
      const result = isLinked
        ? await unlinkSocialProvider(provider)
        : await linkSocialProvider(provider);
      if (result.oauthRedirect) return;
      onToast(
        result.success ? (isLinked ? 'info' : 'success') : 'warning',
        result.message || (isLinked ? '연동 해제에 실패했어요.' : '연동에 실패했어요.')
      );
      if (result.success) await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!isSocialAuthAvailable()) return null;

  const provider = ACTIVE_SOCIAL_PROVIDERS[0];
  const isLinked = provider ? linked.includes(provider) : false;
  const loadingIcon = busy === provider;
  const providerLabel = provider ? SOCIAL_PROVIDER_LABELS[provider] : 'Google';
  const actionLabel = isLinked ? `${providerLabel} 연동됨` : `${providerLabel} 연동`;

  const renderProviderControl = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={wideLayout ? styles.wideLoading : styles.iconSlot}
        />
      );
    }
    if (!provider) return null;

    if (wideLayout) {
      return (
        <Pressable
          onPress={() => void onProviderPress(provider)}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.wideButton,
            isLinked && styles.wideButtonLinked,
            pressed && busy === null && styles.iconPressed,
          ]}
        >
          {loadingIcon ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <GoogleIconCircle size={WIDE_ICON_SIZE} logoSize={WIDE_LOGO_SIZE} />
              <Text style={styles.wideLabel}>{actionLabel}</Text>
              {isLinked ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </>
          )}
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => void onProviderPress(provider)}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [
          styles.iconPressable,
          pressed && busy === null && styles.iconPressed,
        ]}
      >
        {loadingIcon ? (
          <View style={[styles.iconCircle, styles.loadingCircle]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <GoogleIconCircle />
        )}
        {isLinked ? (
          <View style={styles.linkedBadge}>
            <Ionicons name="checkmark" size={10} color="#FFF" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Card style={styles.card}>
      {wideLayout ? (
        <View style={styles.wideWrap}>
          <View style={styles.headerRow}>
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={styles.title}>간편 로그인</Text>
            {isLinked ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ON</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.wideHint}>
            Google을 연동하면 로그인 탭에서 간편 로그인을 쓸 수 있어요.
          </Text>
          {renderProviderControl()}
        </View>
      ) : (
        <View style={styles.row}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>
            간편 로그인
          </Text>
          {isLinked ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ON</Text>
            </View>
          ) : null}
          <Text style={styles.hint} numberOfLines={1}>
            Google을 연동하면 로그인 탭에서 간편 로그인을 쓸 수 있어요.
          </Text>
          {renderProviderControl()}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  wideWrap: {
    width: '100%',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  title: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.text,
    flexShrink: 0,
  },
  badge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 16,
  },
  wideHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  iconSlot: { flexShrink: 0 },
  wideLoading: { alignSelf: 'center', paddingVertical: spacing.sm },
  iconPressable: {
    position: 'relative',
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  wideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  wideButtonLinked: {
    backgroundColor: colors.surfaceAlt,
  },
  wideLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  googleCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingCircle: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
