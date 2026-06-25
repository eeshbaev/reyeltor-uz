import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GuestPrompt } from '@/components/auth/GuestPrompt';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/context/AuthContext';
import { normalizeTelegramUsername } from '@/lib/contact';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [telegramInput, setTelegramInput] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    setTelegramInput(profile?.telegram_username ? `@${profile.telegram_username}` : '');
  }, [profile?.telegram_username]);

  const saveTelegram = async () => {
    if (!session?.user?.id) return;
    setSavingTelegram(true);
    const normalized = normalizeTelegramUsername(telegramInput);
    const { error } = await supabase
      .from('users')
      .update({ telegram_username: normalized })
      .eq('id', session.user.id);
    setSavingTelegram(false);
    if (error) {
      Alert.alert(t('common.error'));
      return;
    }
    await refreshProfile();
    Alert.alert(t('profile.telegramSaved'));
  };

  if (!session || !profile) {
    return (
      <View style={styles.screen}>
        <GuestPrompt title={t('profile.guestTitle')} subtitle={t('profile.guestSubtitle')} />
        <Pressable style={styles.privacyLink} onPress={() => router.push('/profile/privacy')}>
          <Text style={styles.privacyLinkText}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LanguageTopBar />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Avatar name={profile.full_name} size={72} />
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        <View style={styles.telegramSection}>
          <Text style={styles.sectionTitle}>{t('profile.telegram')}</Text>
          <Text style={styles.telegramHint}>{t('profile.telegramHint')}</Text>
          <TextInput
            value={telegramInput}
            onChangeText={setTelegramInput}
            placeholder={t('profile.telegramPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.telegramInput}
          />
          <Pressable style={styles.telegramSave} onPress={saveTelegram} disabled={savingTelegram}>
            <Text style={styles.telegramSaveText}>{t('common.save')}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.menuItem} onPress={() => router.push('/profile/my-listings')}>
          <Text style={styles.menuText}>{t('profile.myListings')}</Text>
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => router.push('/profile/coins')}>
          <Text style={styles.menuText}>{t('profile.coins')} — {profile.coin_balance} 🪙</Text>
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => router.push('/profile/privacy')}>
          <Text style={styles.menuText}>{t('profile.privacyPolicy')}</Text>
        </Pressable>

        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.sm, color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.textSecondary },
  telegramSection: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  telegramHint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  telegramInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  telegramSave: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  telegramSaveText: { color: colors.surface, fontWeight: '700' },
  menuItem: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  logout: { marginTop: spacing.lg, alignItems: 'center' },
  logoutText: { color: colors.error, fontWeight: '600' },
  privacyLink: { alignItems: 'center', paddingVertical: spacing.md, paddingBottom: spacing.lg },
  privacyLinkText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
});
