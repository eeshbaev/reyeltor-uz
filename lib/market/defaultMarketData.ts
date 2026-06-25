import type { RenovationLevel } from '@/lib/tools/renovationRates';

export interface DistrictMarketAverages {
  rentPerSqmUsd: number;
  salePerSqmUsd: number;
}

export interface CommercialDistrictMarketAverages {
  leasePerSqmUsd: number;
  salePerSqmUsd: number;
}

export const DEFAULT_RESIDENTIAL_DISTRICT_MARKET: Record<string, DistrictMarketAverages> = {
  Mirobod: { rentPerSqmUsd: 11.1, salePerSqmUsd: 1820 },
  Shaykhontohur: { rentPerSqmUsd: 11.0, salePerSqmUsd: 1454 },
  Yakkasaroy: { rentPerSqmUsd: 10.0, salePerSqmUsd: 1684 },
  Hamza: { rentPerSqmUsd: 10.2, salePerSqmUsd: 1420 },
  'Mirzo Ulugbek': { rentPerSqmUsd: 9.2, salePerSqmUsd: 1663 },
  Yashnobod: { rentPerSqmUsd: 9.0, salePerSqmUsd: 1396 },
  Yunusobod: { rentPerSqmUsd: 8.6, salePerSqmUsd: 1528 },
  Chilanzar: { rentPerSqmUsd: 8.0, salePerSqmUsd: 1538 },
  Olmazor: { rentPerSqmUsd: 8.0, salePerSqmUsd: 1156 },
  Uchtepa: { rentPerSqmUsd: 7.2, salePerSqmUsd: 1314 },
  Yangihayot: { rentPerSqmUsd: 7.0, salePerSqmUsd: 845 },
  Sergeli: { rentPerSqmUsd: 6.9, salePerSqmUsd: 1024 },
  Bektemir: { rentPerSqmUsd: 6.3, salePerSqmUsd: 828 },
};

export const DEFAULT_COMMERCIAL_DISTRICT_MARKET: Record<string, CommercialDistrictMarketAverages> = {
  Mirobod: { leasePerSqmUsd: 18.5, salePerSqmUsd: 2100 },
  Shaykhontohur: { leasePerSqmUsd: 14.2, salePerSqmUsd: 1650 },
  Yakkasaroy: { leasePerSqmUsd: 16.8, salePerSqmUsd: 1950 },
  Hamza: { leasePerSqmUsd: 13.5, salePerSqmUsd: 1480 },
  'Mirzo Ulugbek': { leasePerSqmUsd: 12.4, salePerSqmUsd: 1750 },
  Yashnobod: { leasePerSqmUsd: 11.2, salePerSqmUsd: 1500 },
  Yunusobod: { leasePerSqmUsd: 13.8, salePerSqmUsd: 1680 },
  Chilanzar: { leasePerSqmUsd: 10.5, salePerSqmUsd: 1400 },
  Olmazor: { leasePerSqmUsd: 9.2, salePerSqmUsd: 1100 },
  Uchtepa: { leasePerSqmUsd: 8.4, salePerSqmUsd: 1250 },
  Yangihayot: { leasePerSqmUsd: 7.5, salePerSqmUsd: 900 },
  Sergeli: { leasePerSqmUsd: 6.8, salePerSqmUsd: 1050 },
  Bektemir: { leasePerSqmUsd: 6.2, salePerSqmUsd: 850 },
};

/** Renovation cost anchors in USD/m² (scaled to UZS via CBU rate on sync). */
export const RENOVATION_COST_PER_M2_USD: Record<RenovationLevel, number> = {
  cosmetic: 67,
  basic: 125,
  medium: 250,
  premium: 500,
  luxury: 833,
};

export const FURNITURE_PER_ROOM_USD: Record<RenovationLevel, number> = {
  cosmetic: 417,
  basic: 667,
  medium: 1000,
  premium: 1833,
  luxury: 3333,
};

export const MOVING_FURNITURE_PER_ROOM_USD = 667;
export const MOVING_SERVICE_USD = 67;
export const TECHNICAL_INSPECTION_USD = 125;

export const DEFAULT_ANNUAL_APPRECIATION_PCT = 8;
export const DEFAULT_ANNUAL_RENT_INCREASE_PCT = 7;

export const MIN_LISTINGS_PER_DISTRICT_METRIC = 3;
