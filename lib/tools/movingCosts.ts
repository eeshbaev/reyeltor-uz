import { getMovingRenovationCostPerM2, type MovingRenovationLevel } from '@/lib/tools/renovationRates';
import {
  getMovingFurniturePerRoomUzs,
  getMovingServiceUzs,
  getTechnicalInspectionUzs,
} from '@/lib/market/marketDataStore';

export interface MovingCostParams {
  transactionType: 'rent' | 'buy';
  propertyPrice: number;
  monthlyRent: number;
  areaM2: number;
  renovationLevel: MovingRenovationLevel;
  includesFurniture: boolean;
  rooms: number;
}

export type MovingCostItemKey =
  | 'securityDeposit'
  | 'agencyCommission'
  | 'firstMonthRent'
  | 'notaryFee'
  | 'stateRegistration'
  | 'technicalInspection'
  | 'renovation'
  | 'furniture'
  | 'movingService';

export type MovingCostNoteKey =
  | 'depositMonths'
  | 'agencyRent'
  | 'paidUpfront'
  | 'notaryPct'
  | 'registrationPct'
  | 'agencyBuy'
  | 'inspectionOptional'
  | 'ratePerM2'
  | 'ratePerM2Estimated'
  | 'roomsCount'
  | 'movingService';

export interface MovingCostLineItem {
  key: MovingCostItemKey;
  amount: number;
  noteKey: MovingCostNoteKey;
  noteParams?: Record<string, string | number>;
  renovationLevel?: MovingRenovationLevel;
}

/** ~40 m² per room — matches renovation tool room estimate inverse. */
function estimateAreaFromRooms(rooms: number): number {
  return Math.max(40, rooms * 40);
}

function resolveRenovationArea(areaM2: number, rooms: number): { area: number; estimated: boolean } {
  if (areaM2 > 0) return { area: areaM2, estimated: false };
  return { area: estimateAreaFromRooms(rooms), estimated: true };
}

export interface MovingCostResult {
  items: MovingCostLineItem[];
  total: number;
}

export function calculateMovingCosts(params: MovingCostParams): MovingCostResult {
  const { transactionType, propertyPrice, monthlyRent, areaM2, renovationLevel, includesFurniture, rooms } =
    params;
  const items: MovingCostLineItem[] = [];

  if (transactionType === 'rent') {
    items.push({ key: 'securityDeposit', amount: monthlyRent * 2, noteKey: 'depositMonths' });
    items.push({ key: 'agencyCommission', amount: monthlyRent, noteKey: 'agencyRent' });
    items.push({ key: 'firstMonthRent', amount: monthlyRent, noteKey: 'paidUpfront' });
  } else {
    const notaryFee = Math.round(propertyPrice * 0.005);
    items.push({ key: 'notaryFee', amount: notaryFee, noteKey: 'notaryPct' });
    const registrationFee = Math.round(propertyPrice * 0.003);
    items.push({ key: 'stateRegistration', amount: registrationFee, noteKey: 'registrationPct' });
    const agencyFee = Math.round(propertyPrice * 0.02);
    items.push({ key: 'agencyCommission', amount: agencyFee, noteKey: 'agencyBuy' });
    items.push({ key: 'technicalInspection', amount: getTechnicalInspectionUzs(), noteKey: 'inspectionOptional' });
  }

  if (renovationLevel !== 'none') {
    const { area, estimated } = resolveRenovationArea(areaM2, rooms);
    const rate = getMovingRenovationCostPerM2(renovationLevel);
    const renovationTotal = Math.round(area * rate);
    items.push({
      key: 'renovation',
      amount: renovationTotal,
      noteKey: estimated ? 'ratePerM2Estimated' : 'ratePerM2',
      noteParams: estimated
        ? { rate: rate.toLocaleString('uz-UZ'), area, rooms }
        : { rate: rate.toLocaleString('uz-UZ') },
      renovationLevel,
    });
  }

  if (includesFurniture) {
    const furnitureTotal = rooms * getMovingFurniturePerRoomUzs();
    items.push({
      key: 'furniture',
      amount: furnitureTotal,
      noteKey: 'roomsCount',
      noteParams: { count: rooms },
    });
  }

  items.push({ key: 'movingService', amount: getMovingServiceUzs(), noteKey: 'movingService' });

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total };
}
