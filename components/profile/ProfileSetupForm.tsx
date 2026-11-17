import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { ScreenAmbientBackground } from '@/components/ui/ScreenAmbientBackground';
import { TextField } from '@/components/ui/TextField';
import { screenBottomPadding } from '@/lib/design/layout';
import { spacing } from '@/lib/design/spacing';
import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';
import { setRegisteredFullName } from '@/lib/onboarding/storage';
import { combineFullName, splitFullName } from '@/lib/profile/name';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import {
  formatPhoneInput,
  isValidNamePart,
  isValidUzbekPhone,
} from '@/lib/validation';

interface ProfileSetupFormProps {
  userId: string;
  fullName: string;
  phone: string;
  phoneVisible?: boolean;
  avatarPath?: string | null;
  onComplete: () => Promise<void>;
}

export function ProfileSetupForm({
  userId,
  fullName,
  phone,
  phoneVisible = true,
  avatarPath,
  onComplete,
}: ProfileSetupFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const initial = splitFullName(fullName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phoneInput, setPhoneInput] = useState(phone || '+998');
  const [showPhonePublicly, setShowPhonePublicly] = useState(phoneVisible !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isValidNamePart(firstName)) {
      Alert.alert(t('profile.invalidFirstName'));
      return;
    }
    if (!isValidNamePart(lastName)) {
      Alert.alert(t('profile.invalidLastName'));
      return;
    }
    if (!isValidUzbekPhone(phoneInput)) {
      Alert.alert(t('profile.invalidPublicPhone'));
      return;
    }

    const nextFullName = combineFullName(firstName, lastName);
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: nextFullName,
        phone: phoneInput,
        phone_visible: showPhonePublicly,
      })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('users_phone_key') || message.includes('phone')) {
        Alert.alert(t('auth.phoneAlreadyRegistered'));
        return;
      }
      Alert.alert(t('common.error'));
      return;
    }

    await setRegisteredFullName(userId, nextFullName);
    await onComplete();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScreenAmbientBackground />
      <LanguageTopBar />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: screenBottomPadding(insets.bottom) + TAB_BAR_CLEARANCE },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="h2" style={styles.title}>
            {t('profile.setupTitle')}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t('profile.setupSubtitle')}
          </AppText>

          <ProfileAvatarEditor
            userId={userId}
            name={combineFullName(firstName, lastName) || fullName}
            avatarPath={avatarPath}
            onUpdated={onComplete}
          />

          <TextField
            label={t('auth.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('auth.firstName')}
            autoCapitalize="words"
            required
          />
          <TextField
            label={t('auth.lastName')}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('auth.lastName')}
            autoCapitalize="words"
            required
          />
          <TextField
            label={t('profile.publicPhone')}
            value={phoneInput}
            onChangeText={(value) => setPhoneInput(formatPhoneInput(value))}
            placeholder={t('auth.phone')}
            keyboardType="phone-pad"
            required
          />

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

          <Button label={t('profile.continue')} onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { textAlign: 'center', marginBottom: spacing.xl, maxWidth: 320, alignSelf: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  toggleCopy: { flex: 1, gap: spacing.xs },
});
