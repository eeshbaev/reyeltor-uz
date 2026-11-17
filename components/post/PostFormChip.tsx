import type { ViewStyle } from 'react-native';
import { Chip } from '@/components/ui/Chip';

interface PostFormChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  activeColor?: string;
  activeTextColor?: string;
  compact?: boolean;
  style?: ViewStyle;
}

export function PostFormChip({ selected, style, ...rest }: PostFormChipProps) {
  return <Chip {...rest} selected={selected} style={style} />;
}
