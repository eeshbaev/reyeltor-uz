import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LaunchMilestonePrompt } from '@/components/growth/LaunchMilestonePrompt';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { isEarlyMember } from '@/lib/access/accessModel';
import { useAuth } from '@/lib/context/AuthContext';
import { recordAppLaunch } from '@/lib/growth/launchMilestones';
import { quickShare } from '@/lib/growth/quickShare';
import { getOrCreateReferralCode } from '@/lib/growth/referral';
import { buildReferralShareText } from '@/lib/growth/shareMessage';

const PROMPT_DELAY_MS = 900;

export function LaunchMilestoneHost() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const timer = setTimeout(() => {
      void (async () => {
        const { shouldPrompt } = await recordAppLaunch();
        if (shouldPrompt) setVisible(true);
      })();
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handleInvite = useCallback(() => {
    void (async () => {
      if (!session?.user?.id || !profile?.full_name) {
        void quickShare(
          {
            title: t('growth.inviteTitle'),
            message: t('growth.milestoneInviteFallback'),
          },
          shareSheetRef,
        );
        return;
      }

      const code = await getOrCreateReferralCode(session.user.id, profile.full_name);
      if (!code) {
        void quickShare(
          {
            title: t('growth.inviteTitle'),
            message: t('growth.milestoneInviteFallback'),
          },
          shareSheetRef,
        );
        return;
      }

      void quickShare(
        {
          title: t('growth.inviteTitle'),
          message: buildReferralShareText(code, t),
        },
        shareSheetRef,
      );
    })();
  }, [profile?.full_name, session?.user?.id, t]);

  const showInvite = Boolean(session?.user?.id && profile?.full_name);

  return (
    <>
      <LaunchMilestonePrompt
        visible={visible}
        earlyMember={isEarlyMember(profile)}
        showInvite={showInvite}
        onDismiss={handleDismiss}
        onInvite={handleInvite}
      />
      <ShareSheet ref={shareSheetRef} />
    </>
  );
}
