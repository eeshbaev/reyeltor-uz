import { FlippingReyeltorCoin } from '@/components/brand/FlippingReyeltorCoin';

interface WelcomeCoinProps {
  size?: 'md' | 'lg' | 'hero';
}

export function WelcomeCoin({ size = 'hero' }: WelcomeCoinProps) {
  return <FlippingReyeltorCoin size={size} flips={2.25} />;
}
