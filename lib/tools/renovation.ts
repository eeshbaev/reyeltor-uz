import {
  getRenovationCostPerM2,
  type RenovationLevel,
} from '@/lib/tools/renovationRates';
import { getFurniturePerRoomUzs } from '@/lib/market/marketDataStore';

export interface RenovationParams {
  areaM2: number;
  level: RenovationLevel;
  includeFurniture?: boolean;
}

export interface RenovationLineItem {
  key: string;
  amount: number;
  noteKey: string;
  noteParams?: Record<string, string | number>;
}

export interface RenovationResult {
  level: RenovationLevel;
  ratePerM2: number;
  items: RenovationLineItem[];
  total: number;
}

const MATERIALS_SHARE = 0.52;
const LABOR_SHARE = 0.38;

function estimateRooms(areaM2: number): number {
  return Math.max(1, Math.round(areaM2 / 40));
}

export function calculateRenovation(params: RenovationParams): RenovationResult {
  const { areaM2, level, includeFurniture } = params;
  const ratePerM2 = getRenovationCostPerM2(level);
  const items: RenovationLineItem[] = [];

  if (areaM2 > 0) {
    const baseTotal = Math.round(areaM2 * ratePerM2);
    const materials = Math.round(baseTotal * MATERIALS_SHARE);
    const labor = Math.round(baseTotal * LABOR_SHARE);
    const contingency = baseTotal - materials - labor;

    items.push({ key: 'materials', amount: materials, noteKey: 'materials' });
    items.push({ key: 'labor', amount: labor, noteKey: 'labor' });
    items.push({ key: 'contingency', amount: contingency, noteKey: 'contingency' });
  }

  if (includeFurniture && areaM2 > 0) {
    const rooms = estimateRooms(areaM2);
    const ratePerRoom = getFurniturePerRoomUzs(level);
    items.push({
      key: 'furniture',
      amount: rooms * ratePerRoom,
      noteKey: 'furnitureRooms',
      noteParams: { count: rooms },
    });
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return { level, ratePerM2, items, total };
}
