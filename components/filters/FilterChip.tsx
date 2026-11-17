import { Chip } from '@/components/ui/Chip';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  activeColor?: string;
  activeTextColor?: string;
}

export function FilterChip({ label, active, onPress, activeColor, activeTextColor }: FilterChipProps) {
  return (
    <Chip
      label={label}
      selected={active}
      onPress={onPress}
      activeColor={activeColor}
      activeTextColor={activeTextColor}
    />
  );
}
