import React from 'react';
import { type ViewStyle } from 'react-native';
import { ScreenSection } from '@/components/ui/ScreenSection';

interface PostFormSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PostFormSection({
  title,
  subtitle,
  children,
  style,
}: PostFormSectionProps) {
  return (
    <ScreenSection
      title={title}
      subtitle={subtitle}
      style={style}
      elevated={false}
    >
      {children}
    </ScreenSection>
  );
}
