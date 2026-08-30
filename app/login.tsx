import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { DropBrand } from '@/src/components/layout/DropBrand';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import {
  canQuickLogin,
  loadSavedLogin,
  type SavedLoginAccount,
} from '@/src/services/quickLogin';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { validateStudentId } from '@/src/utils/studentId';
import { isSupabaseEnvConfigured, getSupabaseSetupHint } from '@/src/lib/supabaseEnv';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { supabaseRestoreSession } from '@/src/services/supabase/auth';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import { SiteOverlayHost } from '@/src/components/site/SiteOverlayHost';
import { markPostLoginOverlay } from '@/src/components/site/SiteOverlayHost';
import { PwaInstallCard } from '@/src/components/layout/PwaInstallCard';
import { LanguageSwitcher } from '@/src/components/layout/LanguageSwitcher';
import { SocialLoginButtons } from '@/src/components/auth/SocialLoginButtons';
import { useI18n } from '@/src/i18n/useI18n';
import { consumeSocialAuthFlash } from '@/src/services/supabase/socialAuthIntent';
import { fetchRosterSignupPolicy } from '@/src/services/supabase/roster';
import type { SocialProvider } from '@/src/constants/socialAuth';

type Mode = 'login' | 'register' | 'guest';

function RememberCheck({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.rememberRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.textLight} /> : null}
      </View>
      <Text style={styles.rememberLabel}>{label}</Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const login = useAuthStore((s) => s.login);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const restoreSavedLogin = useAuthStore((s) => s.restoreSavedLogin);
  const dismissSavedLogin = useAuthStore((s) => s.dismissSavedLogin);
  const register = useAuthStore((s) => s.register);
  const loginWithSocial = useAuthStore((s) => s.loginWithSocial);
  const showToast = useNotificationStore((s) => s.showToast);
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>('login');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccount, setSavedAccount] = useState<SavedLoginAccount | null>(null);
  const [showSavedPrompt, setShowSavedPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [rosterEnforcement, setRosterEnforcement] = useState(false);

  const refreshSavedLogin = useCallback(async () => {
    const account = await loadSavedLogin();
    let quick = account != null && canQuickLogin(account);
    if (quick && isSupabaseEnabled()) {
      quick = Boolean(await supabaseRestoreSession());
    }
    setSavedAccount(account);
    setShowSavedPrompt(quick);
    if (quick && account?.kind === 'guest') {
      setMode('guest');
      setGuestName(account.name);
    } else if (account?.studentId) {
      setStudentId(account.studentId);
    }
    if (account?.kind === 'guest') {
      setGuestName(account.name);
    }
  }, []);

  useEffect(() => {
    void refreshSavedLogin();
  }, [refreshSavedLogin]);

  useEffect(() => {
    if (tab === 'register') setMode('register');
    else if (tab === 'login') setMode('login');
  }, [tab]);

  useEffect(() => {
    if (mode !== 'register' || !isSupabaseEnabled()) {
      setRosterEnforcement(false);
      return;
    }
    void fetchRosterSignupPolicy().then(({ enforcement }) => {
      setRosterEnforcement(enforcement);
    });
  }, [mode]);

  useEffect(() => {
    void consumeSocialAuthFlash().then((message) => {
      if (message) {
        showToast({ type: 'warning', title: '', message });
      }
    });
  }, [showToast]);

  const finishAuth = (ok: boolean, message: string) => {
    if (ok) {
      markPostLoginOverlay();
      router.replace('/(tabs)');
      return;
    }
    showToast({ type: 'warning', title: '', message });
  };

  const handleLogin = () => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      showToast({ type: 'warning', title: '', message: idCheck.message });
      return;
    }
    setBusy(true);
    void (async () => {
      const result = await login(idCheck.normalized, password, rememberMe);
      setBusy(false);
      finishAuth(result.success, result.message);
    })();
  };

  const handleSavedLogin = () => {
    setBusy(true);
    void (async () => {
      const result = await restoreSavedLogin();
      setBusy(false);
      if (result.success) {
        finishAuth(true, result.message);
        return;
      }
      setShowSavedPrompt(false);
      if (savedAccount?.kind === 'guest') {
        setGuestName(savedAccount.name);
        setMode('guest');
      } else if (savedAccount?.studentId) {
        setStudentId(savedAccount.studentId);
        setMode('login');
      }
      showToast({ type: 'warning', title: '', message: result.message });
    })();
  };

  const handleUseOtherAccount = () => {
    setShowSavedPrompt(false);
    if (savedAccount?.kind === 'guest') {
      setGuestName(savedAccount.name);
    } else if (savedAccount?.studentId) {
      setStudentId(savedAccount.studentId);
    }
    setPassword('');
    void dismissSavedLogin();
  };

  const handleRegister = () => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      showToast({ type: 'warning', title: '', message: idCheck.message });
      return;
    }
    if (password !== passwordConfirm) {
      showToast({ type: 'warning', title: '', message: '비밀번호 확인이 일치하지 않아요.' });
      return;
    }
    setBusy(true);
    void (async () => {
      const result = await register({
        studentId: idCheck.normalized,
        name,
        password,
      });
      setBusy(false);
      showToast({
        type: result.success ? 'success' : 'warning',
        title: '',
        message: result.message,
      });
      if (result.success) {
        setMode('login');
        setStudentId(idCheck.normalized);
        setPassword('');
        setPasswordConfirm('');
        setShowSavedPrompt(false);
      }
    })();
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    setBusy(true);
    setSocialBusy(provider);
    void (async () => {
      const result = await loginWithSocial(provider);
      if (result.oauthRedirect) {
        return;
      }
      setBusy(false);
      setSocialBusy(null);
      if (!result.success) {
        showToast({ type: 'warning', title: '', message: result.message });
        return;
      }
      finishAuth(true, result.message);
    })();
  };

  const handleGuestLogin = () => {
    setBusy(true);
    void (async () => {
      const result = await loginAsGuest(guestName, rememberMe);
      setBusy(false);
      finishAuth(result.success, result.message);
    })();
  };

  const supabaseReady = isSupabaseEnvConfigured();
  const memberPrompt =
    mode === 'login' && showSavedPrompt && savedAccount?.kind === 'member';
  const guestPrompt =
    mode === 'guest' && showSavedPrompt && savedAccount?.kind === 'guest';
  const promptAccount = memberPrompt || guestPrompt ? savedAccount : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.langRow}>
            <LanguageSwitcher />
          </View>
          {!supabaseReady && (
            <View style={styles.setupBanner}>
              <Text style={styles.setupBannerTitle}>{t('login.supabaseTitle')}</Text>
              <Text style={styles.setupBannerText}>{getSupabaseSetupHint()}</Text>
            </View>
          )}
          <View style={styles.brandWrap}>
            <DropBrand />
            <Text style={styles.subtitle}>
              {t('login.subtitle', { school: SCHOOL_NAME, club: CLUB_NAME })}
            </Text>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.tab, mode === 'login' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>{t('login.tabLogin')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('register')}
              style={[styles.tab, mode === 'register' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>{t('login.tabRegister')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('guest')}
              style={[styles.tab, mode === 'guest' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'guest' && styles.tabTextActive]}>{t('login.tabGuest')}</Text>
            </Pressable>
          </View>

          {promptAccount ? (
            <View style={styles.savedCard}>
              <View style={styles.savedHeader}>
                <Avatar name={promptAccount.name} color={colors.primary} size={48} />
                <View style={styles.savedMeta}>
                  <Text style={styles.savedName}>{promptAccount.name}</Text>
                  <Text style={styles.savedId}>
                    {promptAccount.kind === 'guest'
                      ? t('login.savedGuest')
                      : promptAccount.studentId}
                  </Text>
                </View>
              </View>
              <Text style={styles.savedQuestion}>
                {promptAccount.kind === 'guest'
                  ? t('login.savedGuestQuestion')
                  : t('login.savedMemberQuestion')}
              </Text>
              {promptAccount.kind === 'guest' ? (
                <Text style={styles.savedWarning}>{t('login.savedGuestWarning')}</Text>
              ) : null}
              <View style={styles.savedActions}>
                <Button
                  title={promptAccount.kind === 'guest' ? t('login.enter') : t('login.loginButton')}
                  onPress={handleSavedLogin}
                  size="sm"
                  style={styles.savedBtn}
                  loading={busy}
                />
                <Button
                  title={t('login.no')}
                  onPress={handleUseOtherAccount}
                  size="sm"
                  variant="outline"
                  style={styles.savedBtn}
                  disabled={busy}
                />
              </View>
            </View>
          ) : (
          <View style={styles.form}>
            {mode === 'guest' ? (
              <>
                <Text style={styles.guestIntro}>{t('login.guestIntro')}</Text>
                <Text style={styles.guestWarning}>{t('login.guestWarning')}</Text>
                <Text style={styles.label}>{t('login.name')}</Text>
                <TextInput
                  style={styles.input}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder={t('login.placeholderGuestName')}
                  maxLength={12}
                  autoCapitalize="words"
                />
                <RememberCheck
                  checked={rememberMe}
                  onToggle={() => setRememberMe((v) => !v)}
                  label={t('login.rememberGuest')}
                />
                <Button
                  title={t('login.guestEnter')}
                  onPress={handleGuestLogin}
                  fullWidth
                  size="lg"
                  variant="outline"
                  style={styles.submit}
                  loading={busy}
                />
                <Text style={styles.hint}>{t('login.guestHint')}</Text>
              </>
            ) : (
              <>
            <Text style={styles.label}>{t('login.studentId')}</Text>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder={t('login.placeholderStudentId')}
              keyboardType="number-pad"
              maxLength={9}
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('login.password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'login' ? t('login.placeholderPassword') : t('login.placeholderPasswordNew')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {mode === 'register' && (
              <>
                {rosterEnforcement ? (
                  <View style={styles.rosterNotice}>
                    <Text style={styles.rosterNoticeTitle}>{t('login.rosterTitle')}</Text>
                    <Text style={styles.rosterNoticeBody}>{t('login.rosterBody')}</Text>
                  </View>
                ) : null}
                <Text style={styles.label}>{t('login.passwordConfirm')}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder={t('login.placeholderPasswordConfirm')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Text style={styles.label}>{t('login.name')}</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('login.placeholderName')} />
              </>
            )}

            {mode === 'login' ? (
              <>
                <RememberCheck
                  checked={rememberMe}
                  onToggle={() => setRememberMe((v) => !v)}
                  label={t('login.rememberAccount')}
                />
                <Button
                  title={t('login.loginButton')}
                  onPress={handleLogin}
                  fullWidth
                  size="lg"
                  style={styles.submit}
                  loading={busy}
                />
              </>
            ) : (
              <Button
                title={t('login.registerButton')}
                onPress={handleRegister}
                fullWidth
                size="lg"
                variant="secondary"
                style={styles.submit}
                loading={busy}
              />
            )}

            {mode === 'register' && (
              <Text style={styles.hint}>
                {rosterEnforcement ? t('login.registerHintRoster') : t('login.registerHintDefault')}
              </Text>
            )}
              </>
            )}
          </View>
          )}

          <PwaInstallCard placement="login" compact />

          {mode === 'login' && !promptAccount ? (
            <SocialLoginButtons
              busy={busy}
              busyProvider={socialBusy}
              onPress={(provider) => handleSocialLogin(provider)}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <SiteOverlayHost surface="login" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  setupBanner: {
    backgroundColor: '#FFF4E5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFD8A8',
  },
  setupBannerTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  setupBannerText: {
    ...typography.caption,
    color: '#92400E',
    lineHeight: 18,
  },
  brandWrap: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as object }),
  },
  tabText: { ...typography.bodyBold, color: colors.textMuted, fontSize: 13 },
  tabTextActive: { color: colors.primary },
  guestIntro: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  guestWarning: {
    ...typography.caption,
    color: colors.warning,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  savedCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.2),
    gap: spacing.md,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  savedMeta: { flex: 1, gap: 2 },
  savedName: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  savedId: { ...typography.caption, color: colors.textMuted },
  savedQuestion: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  savedWarning: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  savedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  savedBtn: { flex: 1 },
  form: { gap: spacing.xs },
  rosterNotice: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: withAlpha(colors.warning, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.35),
    gap: 4,
  },
  rosterNoticeTitle: { ...typography.caption, fontWeight: '700', color: colors.text },
  rosterNoticeBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  submit: { marginTop: spacing.lg },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
