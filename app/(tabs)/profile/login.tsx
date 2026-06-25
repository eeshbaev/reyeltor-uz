import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useAuth } from '@/lib/context/AuthContext';
import { withAuthTimeout } from '@/lib/auth/timeouts';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isValidEmail, isValidPassword } from '@/lib/validation';
import { colors, fontSize, spacing, useTheme } from '@/lib/theme';

export default function ProfileLoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) router.replace('/(tabs)/map');
  }, [session, router]);

  const canSubmit = isValidEmail(email) && isValidPassword(password);

  const handleLogin = async () => {
    if (!isSupabaseConfigured()) {
      setError(t('auth.backendNotConfigured'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: authError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );
      if (authError) {
        setError(t('auth.loginError'));
        return;
      }
      router.replace('/(tabs)/map');
    } catch {
      setError(t('auth.networkTimeout'));
    } finally {
      setLoading(false);
    }
  };

  if (session) return null;

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
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
          >
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>{t('auth.login')}</Text>}
          </Pressable>
          <Text style={styles.footer}>
            {t('auth.noAccount')}{' '}
            <Link href="/(tabs)/profile/register" style={styles.link}>
              {t('auth.register')}
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
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  error: { color: colors.error, marginTop: spacing.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg, color: colors.textSecondary },
  link: { color: colors.accent, fontWeight: '600' },
});
