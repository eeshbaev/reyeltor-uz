import type { RenovationLevel } from '@/lib/tools/renovationRates';
import {
  DEFAULT_ANNUAL_APPRECIATION_PCT,
  DEFAULT_ANNUAL_RENT_INCREASE_PCT,
  DEFAULT_COMMERCIAL_DISTRICT_MARKET,
  DEFAULT_RESIDENTIAL_DISTRICT_MARKET,
  FURNITURE_PER_ROOM_USD,
  MOVING_FURNITURE_PER_ROOM_USD,
  MOVING_SERVICE_USD,
  RENOVATION_COST_PER_M2_USD,
  TECHNICAL_INSPECTION_USD,
  type CommercialDistrictMarketAverages,
  type DistrictMarketAverages,
} from '@/lib/market/defaultMarketData';

export interface MarketMacroRates {
  annualAppreciationPct: number;
  annualRentIncreasePct: number;
}

export interface MarketDataSnapshot {
  updatedAt: number;
  usdRateAtSync: number;
  residential: Record<string, DistrictMarketAverages>;
  commercial: Record<string, CommercialDistrictMarketAverages>;
  renovationCostPerM2Uzs: Record<RenovationLevel, number>;
  movingFurniturePerRoomUzs: number;
  movingServiceUzs: number;
  technicalInspectionUzs: number;
  furniturePerRoomUzs: Record<RenovationLevel, number>;
  macro: MarketMacroRates;
  districtSource: 'listings' | 'default' | 'blended';
}

function buildFurniturePerRoom(usdRate: number): Record<RenovationLevel, number> {
  return {
    cosmetic: Math.round(FURNITURE_PER_ROOM_USD.cosmetic * usdRate),
    basic: Math.round(FURNITURE_PER_ROOM_USD.basic * usdRate),
    medium: Math.round(FURNITURE_PER_ROOM_USD.medium * usdRate),
    premium: Math.round(FURNITURE_PER_ROOM_USD.premium * usdRate),
    luxury: Math.round(FURNITURE_PER_ROOM_USD.luxury * usdRate),
  };
}

function buildDefaultRenovationCosts(usdRate: number): Record<RenovationLevel, number> {
  return {
    cosmetic: Math.round(RENOVATION_COST_PER_M2_USD.cosmetic * usdRate),
    basic: Math.round(RENOVATION_COST_PER_M2_USD.basic * usdRate),
    medium: Math.round(RENOVATION_COST_PER_M2_USD.medium * usdRate),
    premium: Math.round(RENOVATION_COST_PER_M2_USD.premium * usdRate),
    luxury: Math.round(RENOVATION_COST_PER_M2_USD.luxury * usdRate),
  };
}

export function createDefaultMarketSnapshot(usdRate: number): MarketDataSnapshot {
  return {
    updatedAt: Date.now(),
    usdRateAtSync: usdRate,
    residential: { ...DEFAULT_RESIDENTIAL_DISTRICT_MARKET },
    commercial: { ...DEFAULT_COMMERCIAL_DISTRICT_MARKET },
    renovationCostPerM2Uzs: buildDefaultRenovationCosts(usdRate),
    movingFurniturePerRoomUzs: Math.round(MOVING_FURNITURE_PER_ROOM_USD * usdRate),
    movingServiceUzs: Math.round(MOVING_SERVICE_USD * usdRate),
    technicalInspectionUzs: Math.round(TECHNICAL_INSPECTION_USD * usdRate),
    furniturePerRoomUzs: buildFurniturePerRoom(usdRate),
    macro: {
      annualAppreciationPct: DEFAULT_ANNUAL_APPRECIATION_PCT,
      annualRentIncreasePct: DEFAULT_ANNUAL_RENT_INCREASE_PCT,
    },
    districtSource: 'default',
  };
}

let snapshot: MarketDataSnapshot = createDefaultMarketSnapshot(12_017);

type Listener = () => void;
const listeners = new Set<Listener>();

export function getMarketDataSnapshot(): MarketDataSnapshot {
  return snapshot;
}

export function setMarketDataSnapshot(next: MarketDataSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeMarketData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResidentialDistrictMarket(): Record<string, DistrictMarketAverages> {
  return snapshot.residential;
}

export function getCommercialDistrictMarket(): Record<string, CommercialDistrictMarketAverages> {
  return snapshot.commercial;
}

export function getRenovationCostPerM2Uzs(level: RenovationLevel): number {
  return snapshot.renovationCostPerM2Uzs[level];
}

export function getMovingFurniturePerRoomUzs(): number {
  return snapshot.movingFurniturePerRoomUzs;
}

export function getMovingServiceUzs(): number {
  return snapshot.movingServiceUzs;
}

export function getTechnicalInspectionUzs(): number {
  return snapshot.technicalInspectionUzs;
}

export function getFurniturePerRoomUzs(level: RenovationLevel): number {
  return snapshot.furniturePerRoomUzs[level];
}

export function getMarketMacroRates(): MarketMacroRates {
  return snapshot.macro;
}

export function getMarketDataUpdatedAt(): number | null {
  return snapshot.updatedAt || null;
}
