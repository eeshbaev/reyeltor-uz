import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FrostedView } from '@/components/ui/FrostedView';
import { TextField } from '@/components/ui/TextField';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface GuestFavoriteAuthSheetContentProps {
  email: string;
  password: string;
  error: string;
  loginLoading: boolean;
  canSubmit: boolean;
  bottomInset: number;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
  onRegisterPress: () => void;
  onDismiss: () => void;
}

export function GuestFavoriteAuthSheetContent({
  email,
  password,
  error,
  loginLoading,
  canSubmit,
  bottomInset,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onRegisterPress,
  onDismiss,
}: GuestFavoriteAuthSheetContentProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: theme.colors.accent, opacity: theme.isDark ? 0.12 : 0.08 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glowSecondary, { backgroundColor: theme.colors.danger, opacity: theme.isDark ? 0.08 : 0.06 }]}
      />

      <View style={styles.hero}>
        <View style={[styles.iconRing, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={[styles.iconCore, { backgroundColor: theme.colors.accentSurface }]}>
            <Ionicons name="heart" size={26} color={theme.colors.danger} />
          </View>
        </View>
        <AppText variant="h2" style={styles.title}>
          {t('auth.signInToFavorite')}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          {t('favorites.signInHint')}
        </AppText>
      </View>

      <FrostedView style={[styles.formCard, { borderColor: theme.colors.border }]}>
        <View style={styles.fields}>
          <TextField
            placeholder={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={onEmailChange}
          />
          <TextField
            placeholder={t('auth.password')}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={onPasswordChange}
          />
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
              <AppText variant="caption" color="danger" style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}
          <Button label={t('auth.login')} onPress={onLogin} disabled={!canSubmit} loading={loginLoading} />
        </View>
      </FrostedView>

      <Button
        label={t('auth.register')}
        variant="secondary"
        onPress={onRegisterPress}
        style={styles.registerBtn}
      />

      <Pressable onPress={onDismiss} style={styles.skip} accessibilityRole="button">
        <AppText variant="label" color="tertiary">
          {t('auth.continueBrowsing')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    top: -120,
    alignSelf: 'center',
  },
  glowSecondary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    top: -70,
    right: -20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCore: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  formCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fields: {
    gap: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  errorText: {
    flex: 1,
    lineHeight: 18,
  },
  registerBtn: {
    marginTop: spacing.sm,
  },
  skip: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
