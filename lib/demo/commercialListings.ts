import type { DemoListing } from './listings';
import { DEMO_LISTINGS } from './listings';

export const DEMO_COMMERCIAL_LISTINGS: DemoListing[] = DEMO_LISTINGS.filter(
  (l) => l.category === 'commercial',
);

export const ALL_DEMO_LISTINGS: DemoListing[] = DEMO_LISTINGS;
