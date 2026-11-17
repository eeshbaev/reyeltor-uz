import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { captureReferralFromClipboard } from '@/lib/growth/pendingReferral';

/** When logged out, scan clipboard once per app session for a referral code. */
export function ReferralClipboardBootstrap() {
  const { session } = useAuth();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (session?.user?.id || scannedRef.current) return;
    scannedRef.current = true;
    void captureReferralFromClipboard();
  }, [session?.user?.id]);

  return null;
}
