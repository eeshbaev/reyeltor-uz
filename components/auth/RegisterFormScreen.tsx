import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TelegramButton } from '@/components/auth/TelegramButton';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import {
  registerWithTelegram,
  TelegramAuthError,
  type TelegramFlow,
} from '@/lib/auth/telegramAuth';
import { telegramErrorMessage } from '@/lib/auth/telegramMessages';
import { useGuestFavoriteAuth } from '@/lib/context/GuestFavoriteAuthContext';
import { spacing } from '@/lib/design/spacing';
import { clearPendingReferralCode, getPendingReferralCode } from '@/lib/growth/pendingReferral';
import { applyReferralCode } from '@/lib/growth/referral';
import { useTelegramConfirm } from '@/lib/hooks/useTelegramConfirm';
import { REGISTRATION_WELCOME_ROUTE } from '@/lib/onboarding/constants';
import { setPendingWelcomeName, setRegisteredFullName } from '@/lib/onboarding/storage';
import { combineFullName } from '@/lib/profile/name';
import { colors, fontSize, spacing as themeSpacing, useTheme } from '@/lib/theme';
import { isValidEmail, isValidNamePart, isValidPassword, passwordsMatch } from '@/lib/validation';

interface RegisterFormScreenProps {
  loginHref?: '/(tabs)/profile/login';
}

type FieldKey = 'firstName' | 'lastName' | 'password' | 'confirmPassword' | 'email';

/**
 * Registration: 1) confirm phone + name with Telegram, 2) choose a password (email optional).
 */
export function RegisterFormScreen({ loginHref = '/(tabs)/profile/login' }: RegisterFormScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { pendingListingId } = useGuestFavoriteAuth();

  const [flow, setFlow] = useState<TelegramFlow | null>(null);
  const telegram = useTelegramConfirm('register');
  const confirming = telegram.confirming;
  const [notice, setNotice] = useState<{ kind: TelegramFlow['status'] | 'error'; message: string } | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPhonePublicly, setShowPhonePublicly] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  useEffect(() => {
    void getPendingReferralCode().then((code) => {
      if (code) setReferralCode(code);
    });
  }, []);

  const startTelegram = async () => {
    setNotice(null);
    setError('');
    try {
      const result = await telegram.start();
      if (result.status === 'verified') {
        setFlow(result);
        setFirstName(result.firstName);
        setLastName(result.lastName);
        return;
      }
      const messages: Partial<Record<TelegramFlow['status'], string>> = {
        phone_taken: t('telegramAuth.phoneTaken'),
        no_phone: t('telegramAuth.noPhone'),
        cancelled: t('telegramAuth.cancelled'),
      };
      setNotice({ kind: result.status, message: messages[result.status] ?? t('telegramAuth.failed') });
    } catch (caught) {
      setNotice({ kind: 'error', message: telegramErrorMessage(t, caught) });
    }
  };

  const fieldErrors: Partial<Record<FieldKey, string>> = {};
  if (!isValidNamePart(firstName)) fieldErrors.firstName = t(firstName.trim() ? 'auth.nameTooShort' : 'auth.fieldRequired');
  if (!isValidNamePart(lastName)) fieldErrors.lastName = t(lastName.trim() ? 'auth.nameTooShort' : 'auth.fieldRequired');
  if (!isValidPassword(password)) fieldErrors.password = t(password ? 'auth.passwordTooShort' : 'auth.fieldRequired');
  if (!passwordsMatch(password, confirmPassword)) fieldErrors.confirmPassword = t('auth.passwordMismatch');
  if (email.trim() && !isValidEmail(email)) fieldErrors.email = t('auth.invalidEmail');

  const renderFieldError = (key: FieldKey) =>
    showFieldErrors && fieldErrors[key] ? <Text style={styles.error}>{fieldErrors[key]}</Text> : null;

  const handleRegister = async () => {
    if (!flow) return;
    setShowFieldErrors(true);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const userId = await registerWithTelegram(flow, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        email: email.trim() || undefined,
        phoneVisible: showPhonePublicly,
        locale: i18n.language,
      });

      const fullName = combineFullName(firstName, lastName);
      await setRegisteredFullName(userId, fullName);
      await setPendingWelcomeName(fullName);
      if (referralCode.trim()) {
        await applyReferralCode(userId, referralCode);
        await clearPendingReferralCode();
      }
      if (pendingListingId) return;
      router.replace({ pathname: REGISTRATION_WELCOME_ROUTE, params: { name: fullName, mode: 'first' } });
    } catch (caught) {
      const code = caught instanceof TelegramAuthError ? caught.code : null;
      if (code === 'flow_expired' || code === 'phone_taken') {
        // Start over with a fresh Telegram confirmation.
        setFlow(null);
        setNotice({ kind: code === 'phone_taken' ? 'phone_taken' : 'error', message: telegramErrorMessage(t, caught) });
      } else {
        setError(telegramErrorMessage(t, caught));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const bottomPadding = insets.bottom + TAB_BAR_CLEARANCE;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          {!flow ? (
            <View style={styles.intro}>
              <View style={[styles.stepBadge, { backgroundColor: theme.colors.accentSurface }]}>
                <Ionicons name="shield-checkmark-outline" size={28} color={theme.colors.accent} />
              </View>
              <AppText variant="h3" style={styles.center}>
                {t('telegramAuth.registerTitle')}
              </AppText>
              <AppText variant="body" color="secondary" style={styles.center}>
                {t('telegramAuth.registerIntro')}
              </AppText>

              {confirming ? (
                <View style={[styles.notice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <View style={styles.waitingRow}>
                    <ActivityIndicator color={theme.colors.accent} />
                    <AppText variant="body" style={styles.flex}>
                      {t('telegramAuth.waitingHint')}
                    </AppText>
                  </View>
                  <TelegramButton label={t('telegramAuth.openTelegramAgain')} onPress={telegram.reopen} />
                  <Button label={t('common.cancel')} variant="secondary" onPress={telegram.cancel} />
                </View>
              ) : (
                <TelegramButton label={t('telegramAuth.continueWithTelegram')} onPress={() => void startTelegram()} />
              )}

              {notice ? (
                <View style={[styles.notice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <AppText variant="body" color={notice.kind === 'cancelled' ? 'secondary' : 'danger'}>
                    {notice.message}
                  </AppText>
                  {notice.kind === 'phone_taken' ? (
                    <View style={styles.noticeActions}>
                      <Button label={t('telegramAuth.signInInstead')} onPress={() => router.replace(loginHref)} />
                      <Button
                        label={t('telegramAuth.useAnother')}
                        variant="secondary"
                        onPress={() => void startTelegram()}
                      />
                    </View>
                  ) : notice.kind !== 'cancelled' ? (
                    <Button label={t('telegramAuth.tryAgain')} variant="secondary" onPress={() => void startTelegram()} />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={styles.label}>{t('auth.phone')}</Text>
              <View style={[styles.input, styles.lockedRow]}>
                <Text style={styles.lockedText}>{flow.phone}</Text>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              </View>
              <AppText variant="caption" color="secondary" style={styles.hint}>
                {t('telegramAuth.verifiedPhone')}
              </AppText>

              <Text style={styles.label}>
                {t('auth.firstName')}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
              />
              {renderFieldError('firstName')}

              <Text style={styles.label}>
                {t('auth.lastName')}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.lastName')}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
              {renderFieldError('lastName')}

              <Text style={styles.label}>
                {t('auth.password')}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
              />
              {renderFieldError('password')}

              <Text style={styles.label}>
                {t('auth.confirmPassword')}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPassword')}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {renderFieldError('confirmPassword')}

              <Text style={styles.label}>{t('telegramAuth.emailOptional')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <AppText variant="caption" color="secondary" style={styles.hint}>
                {t('telegramAuth.emailHint')}
              </AppText>
              {renderFieldError('email')}

              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <AppText variant="label">{t('profile.showPhonePublicly')}</AppText>
                  <AppText variant="caption" color="secondary">
                    {t('profile.showPhonePubliclyHint')}
                  </AppText>
                </View>
                <Switch
                  value={showPhonePublicly}
                  onValueChange={setShowPhonePublicly}
                  trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
                />
              </View>

              <Text style={styles.label}>{t('growth.referralCodeLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('growth.referralCodePlaceholder')}
                autoCapitalize="characters"
                value={referralCode}
                onChangeText={(value) => setReferralCode(value.toUpperCase())}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={() => void handleRegister()}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.register')}</Text>
                )}
              </Pressable>
            </>
          )}

          <Text style={styles.footer}>
            {t('auth.hasAccount')}{' '}
            <Link href={loginHref} style={styles.link}>
              {t('auth.login')}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: themeSpacing.lg, paddingTop: themeSpacing.md },
  intro: { gap: spacing.md, alignItems: 'stretch', paddingTop: spacing.lg },
  stepBadge: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notice: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.md },
  noticeActions: { gap: spacing.sm },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: themeSpacing.xs,
  },
  required: { color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: themeSpacing.md,
    marginBottom: themeSpacing.xs,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: 0.85 },
  lockedText: { fontSize: fontSize.md, color: colors.text },
  hint: { marginBottom: themeSpacing.md },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginVertical: themeSpacing.md,
  },
  toggleCopy: { flex: 1, gap: spacing.xs },
  button: {
    backgroundColor: colors.primary,
    padding: themeSpacing.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: themeSpacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
  error: { color: colors.error, marginBottom: themeSpacing.xs, fontSize: fontSize.sm },
  footer: { textAlign: 'center', marginTop: themeSpacing.lg, color: colors.textSecondary },
  link: { color: colors.accent, fontWeight: '600' },
});
