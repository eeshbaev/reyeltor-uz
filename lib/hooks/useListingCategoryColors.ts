import { getCategoryColors } from '@/lib/design/categoryColors';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { useTheme } from '@/lib/theme';
import type { ListingCategory } from '@/types';

export function useListingCategoryColors(category?: ListingCategory) {
  const theme = useTheme();
  const { filters } = useListingsCache();
  return getCategoryColors(theme.scheme, category ?? filters.category);
}
