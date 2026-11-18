import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { ScreenSection } from '@/components/ui/ScreenSection';
import { spacing } from '@/lib/design/spacing';
import { showActionError } from '@/lib/error/actionError';
import { sanitizePurposes, saveUserPurposes, USER_PURPOSES } from '@/lib/purposes';
import type { UserPurpose } from '@/types';

interface ProfilePurposesSectionProps {
  userId: string;
  purposes: UserPurpose[] | undefined;
  onSaved: () => Promise<void> | void;
}

/** "What brings you here" — personalization only; changeable at any time. */
export function ProfilePurposesSection({ userId, purposes, onSaved }: ProfilePurposesSectionProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<UserPurpose[]>(sanitizePurposes(purposes));

  useEffect(() => {
    setSelected(sanitizePurposes(purposes));
  }, [purposes]);

  const toggle = async (purpose: UserPurpose) => {
    const previous = selected;
    const next = selected.includes(purpose) ? selected.filter((p) => p !== purpose) : [...selected, purpose];
    setSelected(next);
    if (await saveUserPurposes(userId, next)) {
      await onSaved();
    } else {
      setSelected(previous);
      showActionError(t, 'savePurposes');
    }
  };

  return (
    <ScreenSection title={t('purposes.profileTitle')} subtitle={t('purposes.profileHint')}>
      <View style={styles.chips}>
        {USER_PURPOSES.map((purpose) => (
          <Chip
            key={purpose}
            label={t(`purposes.${purpose}`)}
            selected={selected.includes(purpose)}
            onPress={() => void toggle(purpose)}
          />
        ))}
      </View>
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
