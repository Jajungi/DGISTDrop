import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography } from '@/src/theme';
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

interface AccountLinkCardProps {
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AccountLinkCard({ onToast }: AccountLinkCardProps) {
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

  return (
    <Card style={styles.card}>
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

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.iconSlot} />
        ) : provider ? (
          <Pressable
            onPress={() => void onProviderPress(provider)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={
              isLinked
                ? `${SOCIAL_PROVIDER_LABELS[provider]} 연동됨`
                : `${SOCIAL_PROVIDER_LABELS[provider]} 연동`
            }
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
              <View style={[styles.iconCircle, styles.googleCircle]}>
                <GoogleBrandIcon size={LOGO_SIZE} />
              </View>
            )}
            {isLinked ? (
              <View style={styles.linkedBadge}>
                <Ionicons name="checkmark" size={10} color="#FFF" />
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
  iconSlot: { flexShrink: 0 },
  iconPressable: {
    position: 'relative',
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
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
