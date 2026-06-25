import type { ListingCategory, PriceCurrency } from '@/types';
import { usdToUzs } from '@/lib/exchange/cbuRate';
import {
  getCommercialDistrictMarket,
  getResidentialDistrictMarket,
} from '@/lib/market/marketDataStore';

export type { CommercialDistrictMarketAverages, DistrictMarketAverages } from '@/lib/market/defaultMarketData';

/** @deprecated Use getResidentialDistrictMarket() — kept for district name lists. */
export { DEFAULT_RESIDENTIAL_DISTRICT_MARKET as TASHKENT_DISTRICT_MARKET } from '@/lib/market/defaultMarketData';
/** @deprecated Use getCommercialDistrictMarket() */
export { DEFAULT_COMMERCIAL_DISTRICT_MARKET as TASHKENT_COMMERCIAL_DISTRICT_MARKET } from '@/lib/market/defaultMarketData';

export function getDistrictMarketAverages(district: string) {
  return getResidentialDistrictMarket()[district] ?? null;
}

export function getCommercialDistrictMarketAverages(district: string) {
  return getCommercialDistrictMarket()[district] ?? null;
}

export function formatMarketPerSqm(
  usdPerSqm: number,
  currency: PriceCurrency,
  usdRate: number,
): string {
  if (currency === 'USD') {
    if (usdPerSqm >= 100) return `$${Math.round(usdPerSqm).toLocaleString('en-US')}`;
    return `$${usdPerSqm.toFixed(1)}`;
  }

  const uzs = usdToUzs(usdPerSqm, usdRate);
  if (uzs >= 1_000_000) return `${(uzs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (uzs >= 1_000) return `${Math.round(uzs / 1_000)}K`;
  return new Intl.NumberFormat('uz-UZ').format(uzs);
}

export function buildDistrictMarketLabel(
  district: string,
  currency: PriceCurrency,
  usdRate: number,
  labels: { rent: string; sale: string },
): string | null {
  const stats = getDistrictMarketAverages(district);
  if (!stats) return null;

  const rent = formatMarketPerSqm(stats.rentPerSqmUsd, currency, usdRate);
  const sale = formatMarketPerSqm(stats.salePerSqmUsd, currency, usdRate);

  return `${district}\n${labels.rent} ${rent}/m² · ${labels.sale} ${sale}/m²`;
}

export function buildCommercialDistrictMarketLabel(
  district: string,
  currency: PriceCurrency,
  usdRate: number,
  labels: { lease: string; sale: string },
): string | null {
  const stats = getCommercialDistrictMarketAverages(district);
  if (!stats) return null;

  const lease = formatMarketPerSqm(stats.leasePerSqmUsd, currency, usdRate);
  const sale = formatMarketPerSqm(stats.salePerSqmUsd, currency, usdRate);

  return `${district}\n${labels.lease} ${lease}/m² · ${labels.sale} ${sale}/m²`;
}

export function buildDistrictMarketLabelForCategory(
  district: string,
  category: ListingCategory,
  currency: PriceCurrency,
  usdRate: number,
  labels: { rent: string; sale: string; lease: string },
): string | null {
  if (category === 'commercial') {
    return buildCommercialDistrictMarketLabel(district, currency, usdRate, {
      lease: labels.lease,
      sale: labels.sale,
    });
  }
  return buildDistrictMarketLabel(district, currency, usdRate, {
    rent: labels.rent,
    sale: labels.sale,
  });
}
