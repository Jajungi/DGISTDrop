import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography } from '@/src/theme';
import { SocialLoginButtons } from '@/src/components/auth/SocialLoginButtons';
import {
  getLinkedSocialProviders,
  linkSocialProvider,
  unlinkSocialProvider,
  isSocialAuthAvailable,
} from '@/src/services/supabase/socialAuth';
import type { SocialProvider } from '@/src/constants/socialAuth';

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onProviderPress = async (provider: SocialProvider) => {
    const isLinked = linked.includes(provider);
    setBusy(provider);
    try {
      const result = isLinked
        ? await unlinkSocialProvider(provider)
        : await linkSocialProvider(provider);
      onToast(
        result.success ? (isLinked ? 'info' : 'success') : 'warning',
        result.message || (isLinked ? '연동 해제에 실패했어요.' : '연동을 시도했어요.')
      );
      if (result.success) await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!isSocialAuthAvailable()) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="link-outline" size={20} color={colors.primary} />
        <Text style={styles.title}>간편 로그인 연동</Text>
      </View>
      <Text style={styles.hint}>
        아이콘을 눌러 Google·네이버를 연동하세요. 연동 후 로그인 탭에서 간편 로그인을 쓸 수 있어요.
      </Text>

      {loading ? (
        <Text style={styles.muted}>불러오는 중...</Text>
      ) : (
        <SocialLoginButtons
          mode="link"
          busy={busy !== null}
          busyProvider={busy}
          linked={linked}
          onPress={(provider) => void onProviderPress(provider)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  muted: { ...typography.caption, color: colors.textMuted },
});
