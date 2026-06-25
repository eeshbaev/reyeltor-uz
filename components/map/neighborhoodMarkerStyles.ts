import type { AmenityCategory } from '@/lib/neighborhood/amenities';

export const POI_CATEGORY_ICON: Record<AmenityCategory, string> = {
  education: 'school-outline',
  amenity: 'storefront-outline',
  entertainment: 'leaf-outline',
  transport: 'bus-outline',
  government: 'medical-outline',
};

export const POI_CATEGORY_COLOR: Record<AmenityCategory, string> = {
  education: '#2563eb',
  amenity: '#7c3aed',
  entertainment: '#16a34a',
  transport: '#ea580c',
  government: '#dc2626',
};

export const POI_MARKER_SIZE = 26;
