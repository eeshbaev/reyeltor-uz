import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { registerUser } from '@/lib/auth/registerUser';
import { REGISTRATION_WELCOME_ROUTE } from '@/lib/onboarding/constants';
import {
  formatPhoneInput,
  hasRegistrationFieldErrors,
  type RegistrationFieldErrors,
  validateRegistrationFields,
} from '@/lib/validation';
import { colors, fontSize, spacing, useTheme } from '@/lib/theme';

export default function ProfileRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const renderFieldError = (key: keyof RegistrationFieldErrors) => {
    const code = fieldErrors[key];
    if (!showFieldErrors || !code) return null;
    return <Text style={styles.error}>{t(`auth.${code}`)}</Text>;
  };

  const handleRegister = async () => {
    const nextFieldErrors = validateRegistrationFields({
      fullName,
      phone,
      email,
      password,
      confirmPassword,
    });
    setFieldErrors(nextFieldErrors);
    setShowFieldErrors(true);
    if (hasRegistrationFieldErrors(nextFieldErrors)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await registerUser({
        fullName,
        phone,
        email,
        password,
      });

      if (result.status === 'success') {
        router.replace({
          pathname: REGISTRATION_WELCOME_ROUTE,
          params: { name: fullName.trim() },
        });
        return;
      }

      if (result.status === 'confirm_email') {
        router.replace({
          pathname: '/(tabs)/profile/login',
          params: { message: t('auth.confirmEmail', { email: result.email }) },
        });
        return;
      }

      if (result.code === 'not_configured') {
        setError(t('auth.backendNotConfigured'));
        return;
      }

      if (result.code === 'timeout') {
        setError(t('auth.networkTimeout'));
        return;
      }

      if (result.error?.code === 'emailAlreadyRegistered') {
        setError(t('auth.emailAlreadyRegistered'));
        return;
      }

      if (result.error?.code === 'phoneAlreadyRegistered') {
        setError(t('auth.phoneAlreadyRegistered'));
        return;
      }

      const detail = typeof result.message === 'string' ? result.message.trim() : '';
      if (detail) {
        setError(detail);
        return;
      }

      setError(t('auth.registerError'));
    } catch (unexpected) {
      console.warn('Registration UI error:', unexpected);
      setError(t('auth.registerError'));
    } finally {
      setLoading(false);
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
          <Text style={styles.label}>
            {t('auth.fullName')}
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput style={styles.input} placeholder={t('auth.fullName')} value={fullName} onChangeText={setFullName} />
          {renderFieldError('fullName')}

          <Text style={styles.label}>
            {t('auth.phone')}
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.phone')}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(v) => setPhone(formatPhoneInput(v))}
          />
          {renderFieldError('phone')}

          <Text style={styles.label}>
            {t('auth.email')}
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {renderFieldError('email')}

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {renderFieldError('password')}

          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPassword')}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {renderFieldError('confirmPassword')}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register')}</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>
            {t('auth.hasAccount')}{' '}
            <Link href="/(tabs)/profile/login" style={styles.link}>
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
  content: { padding: spacing.lg, paddingTop: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: { color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.xs,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
  error: { color: colors.error, marginBottom: spacing.xs, fontSize: fontSize.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg, color: colors.textSecondary },
  link: { color: colors.accent, fontWeight: '600' },
});
