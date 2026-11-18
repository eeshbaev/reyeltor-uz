import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TelegramButton } from '@/components/auth/TelegramButton';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { Text } from '@/components/ui/Text';
import { resolveWelcomeDisplayName } from '@/lib/auth/displayName';
import { mapAuthFlowError } from '@/lib/auth/errors';
import { getPasswordResetRedirectUrl } from '@/lib/auth/redirects';
import {
  isValidLoginIdentifier,
  loginWithPassword,
  looksLikeEmail,
  resetPasswordWithTelegram,
  type TelegramFlow,
} from '@/lib/auth/telegramAuth';
import { telegramErrorMessage } from '@/lib/auth/telegramMessages';
import { AuthRequestTimeoutError, withAuthTimeout } from '@/lib/auth/timeouts';
import { resolvePostLoginRoute } from '@/lib/auth/welcomeNavigation';
import { openSupportEmail } from '@/lib/contact/supportEmail';
import { useAuth } from '@/lib/context/AuthContext';
import { motion } from '@/lib/design/motion';
import { radius } from '@/lib/design/radius';
import { useTelegramConfirm } from '@/lib/hooks/useTelegramConfirm';
import { getRegisteredFullName } from '@/lib/onboarding/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, fontSize, spacing, useTheme } from '@/lib/theme';
import { isValidEmail, isValidPassword, passwordsMatch } from '@/lib/validation';

export default function ProfileLoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { session, profile, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetFlow, setResetFlow] = useState<TelegramFlow | null>(null);
  const telegram = useTelegramConfirm('reset');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (authLoading || !session) return;

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, motion.standard));
      const userId = session.user?.id;
      const registeredFullName = userId ? await getRegisteredFullName(userId) : undefined;
      const metadataName =
        typeof session.user.user_metadata?.full_name === 'string'
          ? session.user.user_metadata.full_name
          : undefined;
      const welcomeName = resolveWelcomeDisplayName({
        registeredFullName,
        metadataName,
        profileName: profile?.full_name,
      });
      const href = await resolvePostLoginRoute(welcomeName === 'there' ? undefined : welcomeName, userId);
      router.replace(href);
    })().catch(() => {
      setError(t('auth.networkTimeout'));
    });
  }, [authLoading, profile?.full_name, router, session, t]);

  if (authLoading) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.signingIn, { color: theme.colors.textSecondary }]}>{t('auth.signingIn')}</Text>
      </View>
    );
  }

  const canSubmit = isValidLoginIdentifier(identifier) && password.length >= 6;
  const email = looksLikeEmail(identifier) ? identifier.trim() : '';

  const handleResetPassword = async () => {
    if (!isValidEmail(email)) {
      setError(t('telegramAuth.resetEmailNeeded'));
      return;
    }
    if (!isSupabaseConfigured()) {
      setError(t('auth.backendNotConfigured'));
      return;
    }

    setResetLoading(true);
    setError('');
    setResetMessage('');
    try {
      const { error: resetError } = await withAuthTimeout(
        supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getPasswordResetRedirectUrl(),
        }),
      );
      if (resetError) {
        setError(t(`auth.${mapAuthFlowError(resetError, false, 'resetPasswordError')}`));
        return;
      }
      setResetMessage(t('auth.resetPasswordSent', { email: email.trim() }));
    } catch (caught) {
      setError(t(caught instanceof AuthRequestTimeoutError ? 'auth.networkTimeout' : 'auth.resetPasswordError'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleReportIssue = () => {
    openSupportEmail(t('auth.reportIssueSubject'), t('auth.reportIssueBody'));
  };

  const handleLogin = async () => {
    if (!isSupabaseConfigured()) {
      setError(t('auth.backendNotConfigured'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await withAuthTimeout(loginWithPassword(identifier, password));
    } catch (caught) {
      setError(caught instanceof AuthRequestTimeoutError ? t('auth.networkTimeout') : telegramErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramReset = async () => {
    setError('');
    setResetMessage('');
    try {
      const flow = await telegram.start();
      if (flow.status === 'verified') {
        setResetFlow(flow);
      } else if (flow.status === 'not_registered') {
        setError(t('telegramAuth.notRegistered'));
      } else if (flow.status === 'no_phone') {
        setError(t('telegramAuth.noPhone'));
      } else if (flow.status === 'cancelled') {
        setResetMessage(t('telegramAuth.cancelled'));
      } else {
        setError(t('telegramAuth.failed'));
      }
    } catch (caught) {
      setError(telegramErrorMessage(t, caught));
    }
  };

  const handleSaveNewPassword = async () => {
    if (!resetFlow) return;
    if (!isValidPassword(newPassword)) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (!passwordsMatch(newPassword, confirmNewPassword)) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    setError('');
    try {
      await resetPasswordWithTelegram(resetFlow, newPassword);
      // Signed in: the session effect above navigates on.
    } catch (caught) {
      setError(telegramErrorMessage(t, caught));
      setResetFlow(null);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {typeof message === 'string' ? <Text style={styles.message}>{message}</Text> : null}
          <Text style={styles.label}>{t('telegramAuth.phoneOrEmail')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('telegramAuth.phoneOrEmailPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="username"
            textContentType="username"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            onPress={() => setResetOpen((open) => !open)}
            style={styles.resetLink}
            accessibilityRole="button"
          >
            <Text style={styles.link}>{t('telegramAuth.forgotPassword')}</Text>
          </Pressable>
          {resetOpen && !resetFlow ? (
            <View style={styles.resetPanel}>
              {telegram.confirming ? (
                <>
                  <View style={styles.waitingRow}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={[styles.message, styles.waitingText]}>{t('telegramAuth.waitingHint')}</Text>
                  </View>
                  <TelegramButton label={t('telegramAuth.openTelegramAgain')} onPress={telegram.reopen} />
                  <Pressable onPress={telegram.cancel} style={styles.emailReset} accessibilityRole="button">
                    <Text style={styles.link}>{t('common.cancel')}</Text>
                  </Pressable>
                </>
              ) : (
                <TelegramButton label={t('telegramAuth.resetWithTelegram')} onPress={() => void handleTelegramReset()} />
              )}
              <Pressable onPress={handleResetPassword} disabled={resetLoading} style={styles.emailReset} accessibilityRole="button">
                {resetLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={styles.link}>{t('telegramAuth.resetWithEmail')}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {resetFlow ? (
            <View style={styles.resetPanel}>
              <Text style={styles.label}>{t('telegramAuth.newPasswordTitle')}</Text>
              <Text style={styles.message}>{resetFlow.phone}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPassword')}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
              />
              <Pressable
                style={[styles.button, savingPassword && styles.buttonDisabled]}
                onPress={() => void handleSaveNewPassword()}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>{t('telegramAuth.savePassword')}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {resetMessage ? <Text style={styles.message}>{resetMessage}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login')}</Text>
            )}
          </Pressable>
          <Text style={styles.footer}>
            {t('auth.noAccount')}{' '}
            <Link href="/(tabs)/profile/register" style={styles.link}>
              {t('auth.signUp')}
            </Link>
          </Text>
          <Pressable onPress={handleReportIssue} style={styles.reportLink} accessibilityRole="link">
            <Text style={styles.link}>{t('auth.reportIssue')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitingText: { flex: 1, textAlign: 'left', marginBottom: 0 },
  resetPanel: { gap: spacing.sm, marginBottom: spacing.md },
  emailReset: { alignSelf: 'center', paddingVertical: spacing.sm, minHeight: 24 },
  resetLink: {
    alignSelf: 'flex-end',
    minHeight: 24,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
  error: { color: colors.error, marginTop: spacing.sm, marginBottom: spacing.sm, fontSize: fontSize.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg, color: colors.textSecondary },
  reportLink: { alignSelf: 'center', marginTop: spacing.lg, paddingVertical: spacing.xs },
  signingIn: { fontSize: fontSize.sm },
  link: { color: colors.accent, fontWeight: '600' },
});
