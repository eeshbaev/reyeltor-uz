import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ONBOARDING_SLIDE_CONFIG,
  type OnboardingSlideData,
} from '@/lib/onboarding/slides';

export function useOnboardingSlides(): OnboardingSlideData[] {
  const { t, i18n } = useTranslation();

  return useMemo(
    () =>
      ONBOARDING_SLIDE_CONFIG.map((slide) => ({
        id: slide.id,
        image: slide.image,
        heading: t(slide.headingKey),
        subtitle: t(slide.subtitleKey),
        showCta: slide.showCta,
        ctaLabel: slide.ctaLabelKey ? t(slide.ctaLabelKey) : undefined,
      })),
    // i18n.language: rebuild the slides when the user switches language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );
}
