import type { ColorScheme } from './colors';
import type { ListingCategory } from '@/types';

export interface CategoryColorSet {
  main: string;
  surface: string;
  onMain: string;
  mapCluster: string;
  mapClusterText: string;
}

const CATEGORY_COLORS = {
  light: {
    residential: {
      main: '#0F766E',
      surface: '#F0FDFA',
      onMain: '#FFFFFF',
      mapCluster: '#0F766E',
      mapClusterText: '#FFFFFF',
    },
    commercial: {
      main: '#C2410C',
      surface: '#FFF7ED',
      onMain: '#FFFFFF',
      mapCluster: '#C2410C',
      mapClusterText: '#FFFFFF',
    },
  },
  dark: {
    residential: {
      main: '#2DD4BF',
      surface: '#042F2E',
      onMain: '#042F2E',
      mapCluster: '#14B8A6',
      mapClusterText: '#042F2E',
    },
    commercial: {
      main: '#FB923C',
      surface: '#431407',
      onMain: '#431407',
      mapCluster: '#F97316',
      mapClusterText: '#431407',
    },
  },
} as const satisfies Record<ColorScheme, Record<ListingCategory, CategoryColorSet>>;

export function getCategoryColors(scheme: ColorScheme, category: ListingCategory): CategoryColorSet {
  return CATEGORY_COLORS[scheme][category];
}
