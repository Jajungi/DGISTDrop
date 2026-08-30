import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/theme';
import { SOCIAL_PROVIDER_LABELS, SOCIAL_LOGIN_PROVIDERS, type SocialProvider } from '@/src/constants/socialAuth';
import { isSocialAuthAvailable } from '@/src/services/supabase/socialAuth';
import { GoogleBrandIcon, NaverBrandIcon } from '@/src/components/auth/SocialBrandIcons';

interface SocialLoginButtonsProps {
  onPress: (provider: SocialProvider) => void;
  busy?: boolean;
  busyProvider?: SocialProvider | null;
  mode?: 'login' | 'signup' | 'link';
  linked?: SocialProvider[];
}

const ICON_SIZE = 56;
const LOGO_SIZE = 26;

function SocialProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === 'google') {
    return (
      <View style={[styles.iconCircle, styles.googleCircle]}>
        <GoogleBrandIcon size={LOGO_SIZE} />
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, styles.naverCircle]}>
      <NaverBrandIcon size={LOGO_SIZE} />
    </View>
  );
}

export function SocialLoginButtons({
  onPress,
  busy = false,
  busyProvider = null,
  mode = 'login',
  linked = [],
}: SocialLoginButtonsProps) {
  if (!isSocialAuthAvailable()) return null;

  return (
    <View style={styles.wrap}>
      {mode === 'login' ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>간편 로그인</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : mode === 'signup' ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>간편 회원가입</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : (
        <Text style={styles.linkLabel}>간편 로그인 연동</Text>
      )}

      <View style={styles.iconRow}>
        {SOCIAL_LOGIN_PROVIDERS.map((provider) => {
          const isLinked = linked.includes(provider);
          const loading = busy && busyProvider === provider;
          return (
            <Pressable
              key={provider}
              onPress={() => onPress(provider)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={
                mode === 'link'
                  ? isLinked
                    ? `${SOCIAL_PROVIDER_LABELS[provider]} 연동됨`
                    : `${SOCIAL_PROVIDER_LABELS[provider]} 연동 안 됨`
                  : mode === 'signup'
                    ? `${SOCIAL_PROVIDER_LABELS[provider]}로 회원가입`
                    : `${SOCIAL_PROVIDER_LABELS[provider]}로 로그인`
              }
              style={({ pressed }) => [
                styles.iconPressable,
                pressed && !busy && styles.iconPressed,
                isLinked && mode === 'link' && styles.iconLinked,
              ]}
            >
              {loading ? (
                <View style={[styles.iconCircle, styles.loadingCircle]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <SocialProviderIcon provider={provider} />
              )}
              {isLinked && mode === 'link' ? (
                <View style={styles.linkedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              ) : null}
              {mode === 'link' ? (
                <Text style={[styles.linkStatus, isLinked ? styles.linkStatusOn : styles.linkStatusOff]}>
                  {isLinked ? '연동됨' : '연동 안 됨'}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {mode === 'login' ? (
        <Text style={styles.hint}>
          설정에서 Google·네이버를 연동한 계정만 간편 로그인할 수 있어요.
        </Text>
      ) : mode === 'signup' ? (
        <Text style={styles.hint}>
          Google·네이버 인증 후 학번·비밀번호를 설정해 가입을 마쳐요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    gap: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  linkLabel: {
    ...typography.caption,
    color: colors.textMuted,
    alignSelf: 'flex-start',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xl,
  },
  iconPressable: {
    position: 'relative',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  iconPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  iconLinked: { opacity: 1 },
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
  naverCircle: {
    backgroundColor: '#03C75A',
  },
  loadingCircle: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
  linkStatus: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  linkStatusOn: {
    color: colors.success,
  },
  linkStatusOff: {
    color: colors.textMuted,
  },
});
