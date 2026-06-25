import type { PriceCurrency } from '@/types';
import { uzsToUsd } from '@/lib/exchange/cbuRate';

export function formatPriceUZS(price: number): string {
  return new Intl.NumberFormat('uz-UZ').format(price) + ' UZS';
}

export function formatPriceUSD(priceUzs: number, usdRate: number): string {
  const usd = uzsToUsd(priceUzs, usdRate);
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: usd >= 1000 ? 0 : 2,
    }).format(usd)
  );
}

export function formatListingPrice(priceUzs: number, currency: PriceCurrency, usdRate: number): string {
  return currency === 'USD' ? formatPriceUSD(priceUzs, usdRate) : formatPriceUZS(priceUzs);
}

export function formatPriceShort(
  priceUzs: number,
  currency: PriceCurrency = 'UZS',
  usdRate = 12_017,
): string {
  if (currency === 'USD') {
    const usd = uzsToUsd(priceUzs, usdRate);
    if (usd >= 1_000_000) {
      return `$${(usd / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (usd >= 1_000) {
      return `$${(usd / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `$${Math.round(usd)}`;
  }

  if (priceUzs >= 1_000_000_000) {
    return `${(priceUzs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (priceUzs >= 1_000_000) {
    return `${(priceUzs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (priceUzs >= 100_000) {
    return `${Math.round(priceUzs / 1_000)}K`;
  }
  return String(priceUzs);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 12) return phone;
  return `+998 ${digits.slice(3, 5)} *** **${digits.slice(-2)}`;
}

export function whatsappPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

export function daysSince(dateIso: string): number {
  const start = new Date(dateIso).getTime();
  return Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateIso: string, locale = 'uz-UZ'): string {
  return new Date(dateIso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTrustLabelKey(totalPosted: number): string {
  if (totalPosted < 10) return 'agent.trustNew';
  if (totalPosted < 50) return 'agent.trustActive';
  return 'agent.trustEstablished';
}
