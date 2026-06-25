import type { ListingCategory } from '@/types';
import type { ColorScheme } from './colors';

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
      main: '#0D9488',
      surface: '#F0FDFA',
      onMain: '#FFFFFF',
      mapCluster: '#0D9488',
      mapClusterText: '#FFFFFF',
    },
    commercial: {
      main: '#EA580C',
      surface: '#FFF7ED',
      onMain: '#FFFFFF',
      mapCluster: '#EA580C',
      mapClusterText: '#FFFFFF',
    },
  },
  dark: {
    residential: {
      main: '#14B8A6',
      surface: '#042F2E',
      onMain: '#FFFFFF',
      mapCluster: '#14B8A6',
      mapClusterText: '#FFFFFF',
    },
    commercial: {
      main: '#F97316',
      surface: '#431407',
      onMain: '#FFFFFF',
      mapCluster: '#F97316',
      mapClusterText: '#FFFFFF',
    },
  },
} as const satisfies Record<ColorScheme, Record<ListingCategory, CategoryColorSet>>;

export function getCategoryColors(scheme: ColorScheme, category: ListingCategory): CategoryColorSet {
  return CATEGORY_COLORS[scheme][category];
}
