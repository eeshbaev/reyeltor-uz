import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EarlyMemberBadge } from '@/components/access/EarlyMemberBadge';
import { GuestPrompt } from '@/components/auth/GuestPrompt';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { NotificationPreferencesSection } from '@/components/profile/NotificationPreferencesSection';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import { ProfileCoinCard } from '@/components/profile/ProfileCoinCard';
import { ProfileIdentitySection } from '@/components/profile/ProfileIdentitySection';
import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { ProfilePurposesSection } from '@/components/profile/ProfilePurposesSection';
import { ProfileScreenSkeleton } from '@/components/profile/ProfileScreenSkeleton';
import { ProfileSetupForm } from '@/components/profile/ProfileSetupForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ScreenAmbientBackground } from '@/components/ui/ScreenAmbientBackground';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { ScreenSection } from '@/components/ui/ScreenSection';
import { TextField } from '@/components/ui/TextField';
import { showToast } from '@/components/ui/Toast';
import { openSupportEmail } from '@/lib/contact/supportEmail';
import { useAuth } from '@/lib/context/AuthContext';
import { screenBottomPadding } from '@/lib/design/layout';
import { spacing } from '@/lib/design/spacing';
import { showActionError } from '@/lib/error/actionError';
import { useUserDisplayName } from '@/lib/hooks/useUserDisplayName';
import { normalizeBio, PROFILE_BIO_MAX_LENGTH } from '@/lib/profile/bio';
import { isProfileComplete } from '@/lib/profile/complete';
import { exportMyData } from '@/lib/profile/exportData';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

function ProfileScreenContent() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session, profile, loading, profileLoading, signOut, refreshProfile, deleteAllUserData } = useAuth();
  const { displayName } = useUserDisplayName();
  const insets = useSafeAreaInsets();
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  useEffect(() => {
    if (session && !profile && !loading && !profileLoading) {
      void refreshProfile();
    }
  }, [session, profile, loading, profileLoading, refreshProfile]);

  useEffect(() => {
    setBioInput(profile?.bio ?? '');
  }, [profile?.bio]);

  const saveBio = async () => {
    if (!session?.user?.id) return;
    setSavingBio(true);
    const bio = normalizeBio(bioInput);
    const { error } = await supabase.from('users').update({ bio }).eq('id', session.user.id);
    setSavingBio(false);
    if (error) {
      showActionError(t, 'saveBio', error);
      return;
    }
    await refreshProfile();
    Alert.alert(t('profile.bioSaved'));
  };

  const handleDeleteAllData = () => {
    Alert.alert(t('profile.deleteDataTitle'), t('profile.deleteDataWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteDataConfirm'),
        onPress: async () => {
          setDeletingData(true);
          try {
            await deleteAllUserData();
            Alert.alert(t('profile.deleteDataSuccess'), t('profile.deleteDataSuccessMessage'));
            router.replace('/auth/welcome');
          } catch {
            setDeletingData(false);
            Alert.alert(t('common.error'), t('profile.deleteDataError'));
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!session?.user?.id || exporting) return;
    setExporting(true);
    try {
      const result = await exportMyData(session.user.id);
      if (result === 'unavailable') showToast({ tone: 'error', message: t('profile.exportUnavailable') });
    } catch (error) {
      showActionError(t, 'exportData', error);
    } finally {
      setExporting(false);
    }
  };

  const handleReportIssue = () => {
    openSupportEmail(t('auth.reportIssueSubject'), t('auth.reportIssueBody'));
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ScreenAmbientBackground />
        <LanguageTopBar />
        <ScreenScroll contentContainerStyle={styles.scrollContent}>
          <ProfileScreenSkeleton />
        </ScreenScroll>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <GuestPrompt title={t('profile.guestTitle')} subtitle={t('profile.guestSubtitle')} />
        <View style={[styles.guestLinks, { paddingBottom: screenBottomPadding(insets.bottom) }]}>
          <Pressable style={styles.privacyLink} onPress={() => router.push('/profile/about')}>
            <AppText variant="caption" color="accent" style={styles.privacyLinkText}>
              {t('access.aboutTitle')}
            </AppText>
          </Pressable>
          <Pressable style={styles.privacyLink} onPress={() => router.push('/profile/privacy')}>
            <AppText variant="caption" color="accent" style={styles.privacyLinkText}>
              {t('profile.privacyPolicy')}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ScreenAmbientBackground />
        <LanguageTopBar />
        <View style={styles.setup}>
          {profileLoading ? (
            <ProfileScreenSkeleton />
          ) : (
            <>
              <AppText variant="h2" style={styles.setupTitle}>
                {t('profile.profileLoadFailed')}
              </AppText>
              <AppText variant="body" color="secondary" style={styles.setupSubtitle}>
                {t('profile.loadingProfileHint')}
              </AppText>
              <Button label={t('common.retry')} onPress={() => void refreshProfile()} />
              <Button
                label={t('auth.logout')}
                variant="secondary"
                onPress={() => void signOut()}
                style={styles.setupSecondary}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  if (!isProfileComplete(profile)) {
    return (
      <ProfileSetupForm
        userId={profile.id}
        fullName={profile.full_name}
        phone={profile.phone}
        phoneVisible={profile.phone_visible}
        avatarPath={profile.avatar_url}
        onComplete={refreshProfile}
      />
    );
  }

  const profileName = displayName ?? profile.full_name;
  const bioHelper = t('profile.bioCharCount', { count: bioInput.length, max: PROFILE_BIO_MAX_LENGTH });

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScreenAmbientBackground />
      <LanguageTopBar />
      <ScreenScroll
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: screenBottomPadding(insets.bottom) + TAB_BAR_CLEARANCE },
        ]}
      >
        <View style={styles.header}>
          <ProfileAvatarEditor
            userId={profile.id}
            name={profileName}
            avatarPath={profile.avatar_url}
            onUpdated={refreshProfile}
          />
          <AppText variant="h3" style={styles.name}>
            {profileName}
          </AppText>
          {profile.early_member_since ? (
            <EarlyMemberBadge since={profile.early_member_since} onPress={() => router.push('/profile/about')} />
          ) : null}
        </View>

        <ProfileCoinCard balance={profile.coin_balance} label={t('profile.coins')} />

        <ProfilePurposesSection userId={profile.id} purposes={profile.purposes} onSaved={refreshProfile} />

        <ProfileIdentitySection
          userId={profile.id}
          fullName={profile.full_name}
          phone={profile.phone}
          email={profile.email}
          phoneVerified={!!profile.phone_verified_at}
          phoneVisible={profile.phone_visible}
          emailVisible={profile.email_visible}
          onSaved={refreshProfile}
        />

        <ScreenSection title={t('profile.bio')} subtitle={t('profile.bioHint')}>
          <TextField
            value={bioInput}
            onChangeText={(text) => setBioInput(text.slice(0, PROFILE_BIO_MAX_LENGTH))}
            placeholder={t('profile.bioPlaceholder')}
            multiline
            textAlignVertical="top"
            style={styles.bioInput}
            helperText={bioHelper}
          />
          <Button label={t('common.save')} onPress={saveBio} loading={savingBio} fullWidth={false} />
        </ScreenSection>

        <NotificationPreferencesSection userId={profile.id} />

        <ProfileMenuRow
          label={t('profile.myListings')}
          icon="home-outline"
          onPress={() => router.push('/profile/my-listings')}
        />
        <ProfileMenuRow
          label={t('profile.privacyPolicy')}
          icon="shield-checkmark-outline"
          onPress={() => router.push('/profile/privacy')}
        />
        <ProfileMenuRow
          label={exporting ? t('profile.exporting') : t('profile.exportData')}
          icon="download-outline"
          onPress={() => void handleExport()}
        />
        <ProfileMenuRow
          label={t('access.aboutTitle')}
          icon="information-circle-outline"
          onPress={() => router.push('/profile/about')}
        />
        <ProfileMenuRow
          label={t('profile.reportIssue')}
          icon="mail-outline"
          onPress={handleReportIssue}
        />

        <Pressable style={styles.logout} onPress={signOut}>
          <AppText variant="label" color="danger">
            {t('auth.logout')}
          </AppText>
        </Pressable>

        <Pressable style={styles.deleteData} onPress={handleDeleteAllData} disabled={deletingData}>
          {deletingData ? (
            <ActivityIndicator size="small" color={theme.colors.danger} />
          ) : (
            <AppText variant="label" color="danger">
              {t('profile.deleteAllData')}
            </AppText>
          )}
        </Pressable>
      </ScreenScroll>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <ErrorBoundary context="ProfileScreen">
      <ProfileScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { alignItems: 'center', marginBottom: spacing.md },
  name: { marginTop: spacing.sm, textAlign: 'center' },
  bioInput: { minHeight: 100, textAlignVertical: 'top' },
  logout: { marginTop: spacing.lg, alignItems: 'center' },
  deleteData: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  guestLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  privacyLink: { alignItems: 'center', paddingTop: spacing.md },
  privacyLinkText: { fontWeight: '600' },
  setup: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  setupTitle: { textAlign: 'center', marginBottom: spacing.sm },
  setupSubtitle: { textAlign: 'center', marginBottom: spacing.xl, maxWidth: 320, alignSelf: 'center' },
  setupSecondary: { marginTop: spacing.sm },
});
