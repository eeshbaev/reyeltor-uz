export interface OnboardingSlideConfig {
  id: string;
  imageUri: string;
  headingKey: string;
  subtitleKey: string;
  showCta?: boolean;
  ctaLabelKey?: string;
}

export const ONBOARDING_SLIDE_CONFIG: OnboardingSlideConfig[] = [
  {
    id: 'welcome',
    imageUri: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=90',
    headingKey: 'onboarding.welcome.heading',
    subtitleKey: 'onboarding.welcome.subtitle',
  },
  {
    id: 'residential',
    imageUri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=90',
    headingKey: 'onboarding.residential.heading',
    subtitleKey: 'onboarding.residential.subtitle',
  },
  {
    id: 'commercial',
    imageUri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=90',
    headingKey: 'onboarding.commercial.heading',
    subtitleKey: 'onboarding.commercial.subtitle',
  },
  {
    id: 'trust',
    imageUri: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=90',
    headingKey: 'onboarding.trust.heading',
    subtitleKey: 'onboarding.trust.subtitle',
    showCta: true,
    ctaLabelKey: 'onboarding.trust.cta',
  },
];

export interface OnboardingSlideData {
  id: string;
  imageUri: string;
  heading: string;
  subtitle: string;
  showCta?: boolean;
  ctaLabel?: string;
}
