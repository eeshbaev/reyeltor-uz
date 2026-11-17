import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScreenSection } from '@/components/ui/ScreenSection';
import { TextField } from '@/components/ui/TextField';
import { clearAccountEmail, requestEmailChange } from '@/lib/auth/telegramAuth';
import { telegramErrorMessage } from '@/lib/auth/telegramMessages';
import { spacing } from '@/lib/design/spacing';
import { setRegisteredFullName } from '@/lib/onboarding/storage';
import { combineFullName, splitFullName } from '@/lib/profile/name';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import {
  formatPhoneInput,
  isValidEmail,
  isValidNamePart,
  isValidUzbekPhone,
} from '@/lib/validation';

interface ProfileIdentitySectionProps {
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  /** Phone confirmed through Telegram: shown read-only. */
  phoneVerified?: boolean;
  phoneVisible?: boolean;
  emailVisible?: boolean;
  onSaved: () => Promise<void>;
}

export function ProfileIdentitySection({
  userId,
  fullName,
  phone,
  email,
  phoneVerified = false,
  phoneVisible = true,
  emailVisible = true,
  onSaved,
}: ProfileIdentitySectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const initial = splitFullName(fullName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phoneInput, setPhoneInput] = useState(phone || '+998');
  const [emailInput, setEmailInput] = useState(email ?? '');
  const [showPhonePublicly, setShowPhonePublicly] = useState(phoneVisible !== false);
  const [showEmailPublicly, setShowEmailPublicly] = useState(emailVisible !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = splitFullName(fullName);
    setFirstName(next.firstName);
    setLastName(next.lastName);
  }, [fullName]);

  useEffect(() => {
    setPhoneInput(phone || '+998');
  }, [phone]);

  useEffect(() => {
    setEmailInput(email ?? '');
  }, [email]);

  useEffect(() => {
    setShowPhonePublicly(phoneVisible !== false);
  }, [phoneVisible]);

  useEffect(() => {
    setShowEmailPublicly(emailVisible !== false);
  }, [emailVisible]);

  const saveIdentity = async () => {
    if (!isValidNamePart(firstName)) {
      Alert.alert(t('profile.invalidFirstName'));
      return;
    }
    if (!isValidNamePart(lastName)) {
      Alert.alert(t('profile.invalidLastName'));
      return;
    }
    if (!phoneVerified && !isValidUzbekPhone(phoneInput)) {
      Alert.alert(t('profile.invalidPublicPhone'));
      return;
    }
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      Alert.alert(t('profile.invalidPublicEmail'));
      return;
    }

    const nextFullName = combineFullName(firstName, lastName);
    setSaving(true);
    // The email is also the login/recovery address: a new one must be confirmed by link first.
    let confirmationSentTo: string | null = null;
    if (trimmedEmail !== (email ?? '').trim().toLowerCase()) {
      try {
        if (trimmedEmail) {
          await requestEmailChange(trimmedEmail);
          confirmationSentTo = trimmedEmail;
        } else {
          await clearAccountEmail();
        }
      } catch (caught) {
        setSaving(false);
        Alert.alert(telegramErrorMessage(t, caught));
        return;
      }
    }
    const { error } = await supabase
      .from('users')
      .update({
        full_name: nextFullName,
        ...(phoneVerified ? {} : { phone: phoneInput }),
        phone_visible: showPhonePublicly,
        email_visible: showEmailPublicly,
      })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('users_phone_key') || message.includes('phone')) {
        Alert.alert(t('auth.phoneAlreadyRegistered'));
        return;
      }
      if (message.includes('users_email_key') || message.includes('email')) {
        Alert.alert(t('auth.emailAlreadyRegistered'));
        return;
      }
      Alert.alert(t('common.error'));
      return;
    }

    await setRegisteredFullName(userId, nextFullName);
    await onSaved();
    if (confirmationSentTo) {
      // Keep showing the current email until the new one is confirmed.
      setEmailInput(email ?? '');
      Alert.alert(t('profile.identitySaved'), t('telegramAuth.emailConfirmSent', { email: confirmationSentTo }));
    } else {
      Alert.alert(t('profile.identitySaved'));
    }
  };

  return (
    <ScreenSection title={t('profile.identity')} subtitle={t('profile.identityHint')}>
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
        editable={!phoneVerified}
        required
      />
      {phoneVerified ? (
        <AppText variant="caption" color="secondary" style={styles.lockedHint}>
          {t('telegramAuth.phoneLocked')}
        </AppText>
      ) : null}
      <TextField
        label={t('profile.publicEmail')}
        value={emailInput}
        onChangeText={setEmailInput}
        placeholder={t('telegramAuth.emailOptional')}
        autoCapitalize="none"
        keyboardType="email-address"
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
      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <AppText variant="label">{t('profile.showEmailPublicly')}</AppText>
          <AppText variant="caption" color="secondary">
            {t('profile.showEmailPubliclyHint')}
          </AppText>
        </View>
        <Switch
          value={showEmailPublicly}
          onValueChange={setShowEmailPublicly}
          trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
        />
      </View>
      <Button label={t('common.save')} onPress={saveIdentity} loading={saving} fullWidth={false} />
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  lockedHint: { marginTop: -spacing.xs, marginBottom: spacing.sm },
  toggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
