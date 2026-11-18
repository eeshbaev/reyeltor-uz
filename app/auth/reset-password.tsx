import { useEffect, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { Text } from '@/components/ui/Text';
import { mapAuthFlowError } from '@/lib/auth/errors';
import { AuthRequestTimeoutError, withAuthTimeout } from '@/lib/auth/timeouts';
import { radius } from '@/lib/design/radius';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, fontSize, spacing, useTheme } from '@/lib/theme';
import { isValidPassword, passwordsMatch } from '@/lib/validation';

function parseAuthParams(url: string): { accessToken?: string; refreshToken?: string; type?: string } {
  const [, hashPart = ''] = url.split('#');
  const [, queryPart = ''] = url.split('?');
  const params = new URLSearchParams(hashPart || queryPart);
  return {
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
    type: params.get('type') ?? undefined,
  };
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!isSupabaseConfigured()) {
        if (active) {
          setError(t('auth.backendNotConfigured'));
          setLoading(false);
        }
        return;
      }

      try {
        const initialUrl = await ExpoLinking.getInitialURL();
        if (initialUrl) {
          const { accessToken, refreshToken, type } = parseAuthParams(initialUrl);
          if (accessToken && refreshToken && type === 'recovery') {
            const { error: sessionError } = await withAuthTimeout(
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
            );
            if (sessionError) {
              if (active) {
                setError(t(`auth.${mapAuthFlowError(sessionError)}`));
                setLoading(false);
              }
              return;
            }
            if (active) {
              setReady(true);
              setLoading(false);
            }
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (active) {
            setReady(true);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setError(t('auth.resetLinkInvalid'));
          setLoading(false);
        }
      } catch (caught) {
        if (!active) return;
        if (caught instanceof AuthRequestTimeoutError) {
          setError(t('auth.networkTimeout'));
        } else {
          setError(t('auth.resetLinkInvalid'));
        }
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const canSubmit = isValidPassword(password) && passwordsMatch(password, confirmPassword);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');
    try {
      const { error: updateError } = await withAuthTimeout(
        supabase.auth.updateUser({ password }),
      );
      if (updateError) {
        setError(t(`auth.${mapAuthFlowError(updateError)}`));
        return;
      }
      setSuccess(t('auth.resetPasswordSuccess'));
      setTimeout(() => router.replace('/(tabs)/map'), 1200);
    } catch (caught) {
      setError(t(caught instanceof AuthRequestTimeoutError ? 'auth.networkTimeout' : 'auth.resetPasswordError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('auth.resetPassword'), headerShown: true }} />
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : ready ? (
              <>
                <Text style={styles.intro}>{t('auth.resetPasswordIntro')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.password')}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.confirmPassword')}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {success ? <Text style={styles.success}>{success}</Text> : null}
                <Pressable
                  style={[styles.button, !canSubmit && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.resetPasswordSubmit')}</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Text style={styles.error}>{error || t('auth.resetLinkInvalid')}</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
  error: { color: colors.error, lineHeight: 20 },
  success: { color: colors.textSecondary, lineHeight: 20 },
});
