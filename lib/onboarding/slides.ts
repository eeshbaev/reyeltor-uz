import type { ImageSourcePropType } from 'react-native';

export interface OnboardingSlideConfig {
  id: string;
  image: ImageSourcePropType;
  headingKey: string;
  subtitleKey: string;
  showCta?: boolean;
  ctaLabelKey?: string;
}

export const ONBOARDING_SLIDE_CONFIG: OnboardingSlideConfig[] = [
  {
    id: 'welcome',
    image: require('../../assets/onboarding/welcome.jpg'),
    headingKey: 'onboarding.welcome.heading',
    subtitleKey: 'onboarding.welcome.subtitle',
  },
  {
    id: 'residential',
    image: require('../../assets/onboarding/residential.jpg'),
    headingKey: 'onboarding.residential.heading',
    subtitleKey: 'onboarding.residential.subtitle',
  },
  {
    id: 'commercial',
    image: require('../../assets/onboarding/commercial.jpg'),
    headingKey: 'onboarding.commercial.heading',
    subtitleKey: 'onboarding.commercial.subtitle',
  },
  {
    id: 'trust',
    image: require('../../assets/onboarding/trust.jpg'),
    headingKey: 'onboarding.trust.heading',
    subtitleKey: 'onboarding.trust.subtitle',
    showCta: true,
    ctaLabelKey: 'onboarding.trust.cta',
  },
];

export interface OnboardingSlideData {
  id: string;
  image: ImageSourcePropType;
  heading: string;
  subtitle: string;
  showCta?: boolean;
  ctaLabel?: string;
}
