import type { TFunction } from 'i18next';
import { translatePropertyType } from '@/lib/i18n/filterLabels';
import { serverErrorCode } from '@/lib/serverErrors';
import { supabase } from '@/lib/supabase';
import { DEFAULT_FILTERS, type ListingFilters } from '@/types';

/** Must match the limit enforced in supabase/patch-saved-searches-v1.sql. */
export const MAX_SAVED_SEARCHES = 10;
export const SAVED_SEARCH_NAME_MAX = 60;

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: ListingFilters;
  notify_enabled: boolean;
  /** 'last' = the automatic "last search" (one per user, not counted in the 10). */
  kind: 'saved' | 'last';
  created_at: string;
  updated_at: string;
  /** New matches the user has not opened yet. */
  newMatches: number;
}

interface SavedSearchRow extends Omit<SavedSearch, 'filters' | 'newMatches' | 'kind'> {
  filters: Partial<ListingFilters> | null;
  kind?: 'saved' | 'last' | null;
}

/** Saved filters are the map filters, minus "listed since" (alerts are only about new listings). */
export function normalizeSavedFilters(filters: Partial<ListingFilters> | null | undefined): ListingFilters {
  return { ...DEFAULT_FILTERS, ...(filters ?? {}), listedSinceDays: null };
}

/** Normalized filters with sorted lists, as stored in the database (so equal searches compare equal). */
export function canonicalSavedFilters(filters: Partial<ListingFilters> | null | undefined): ListingFilters {
  const normalized = normalizeSavedFilters(filters);
  return { ...normalized, districts: [...normalized.districts].sort(), views: [...normalized.views].sort() };
}

/** Stable key for "is this exact search already saved?" checks. */
export function savedFiltersKey(filters: ListingFilters): string {
  const normalized = normalizeSavedFilters(filters);
  return JSON.stringify({
    ...normalized,
    districts: [...normalized.districts].sort(),
    views: [...normalized.views].sort(),
  });
}

export function hasDrawnArea(filters: ListingFilters): boolean {
  return Boolean(filters.mapArea && filters.mapArea.points?.length);
}

export async function fetchSavedSearches(userId: string): Promise<SavedSearch[]> {
  const [{ data, error }, { data: unseen }] = await Promise.all([
    supabase.from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('saved_search_matches').select('search_id').eq('user_id', userId).is('seen_at', null),
  ]);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (unseen ?? []) as Array<{ search_id: string }>) {
    counts.set(row.search_id, (counts.get(row.search_id) ?? 0) + 1);
  }

  return ((data ?? []) as SavedSearchRow[]).map((row) => ({
    ...row,
    filters: normalizeSavedFilters(row.filters),
    kind: row.kind === 'last' ? 'last' : 'saved',
    newMatches: counts.get(row.id) ?? 0,
  }));
}

export type SavedSearchErrorKind = 'limit' | 'generic';

export class SavedSearchError extends Error {
  constructor(public kind: SavedSearchErrorKind, message?: string) {
    super(message ?? kind);
  }
}

function toSavedSearchError(error: unknown): SavedSearchError {
  return new SavedSearchError(serverErrorCode(error) === 'saved_search_limit' ? 'limit' : 'generic', String(error));
}

export async function createSavedSearch(input: {
  userId: string;
  name: string;
  filters: ListingFilters;
  notifyEnabled: boolean;
}): Promise<void> {
  const filters = canonicalSavedFilters(input.filters);
  const { error } = await supabase.from('saved_searches').insert({
    user_id: input.userId,
    name: input.name.trim().slice(0, SAVED_SEARCH_NAME_MAX),
    filters,
    // Drawn-area alerts are not supported yet; never claim they are on.
    notify_enabled: input.notifyEnabled && !hasDrawnArea(filters),
  });
  if (error) throw toSavedSearchError(error);
}

export async function updateSavedSearch(
  id: string,
  patch: { name?: string; filters?: ListingFilters; notifyEnabled?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim().slice(0, SAVED_SEARCH_NAME_MAX);
  if (patch.filters !== undefined) {
    update.filters = canonicalSavedFilters(patch.filters);
    if (hasDrawnArea(update.filters as ListingFilters)) update.notify_enabled = false;
  }
  if (patch.notifyEnabled !== undefined) update.notify_enabled = patch.notifyEnabled;
  const { error } = await supabase.from('saved_searches').update(update).eq('id', id);
  if (error) throw toSavedSearchError(error);
}

/**
 * Is this map search specific enough to alert on? Plain "all residential" would match
 * everything; drawn areas are not matched by the server yet.
 */
export function isAlertableSearch(filters: ListingFilters): boolean {
  if (hasDrawnArea(filters)) return false;
  const f = normalizeSavedFilters(filters);
  return (
    f.districts.length > 0 ||
    Boolean(f.priceMin.trim() || f.priceMax.trim()) ||
    f.roomsMin != null ||
    Boolean(f.propertyType && f.propertyType !== 'any') ||
    Boolean(f.areaMin.trim() || f.areaMax.trim()) ||
    Boolean(f.keywords.trim())
  );
}

/** Remembers the user's latest map search on the server (alerts like a saved search). */
export async function setLastSearch(filters: ListingFilters, name: string): Promise<void> {
  const { error } = await supabase.rpc('set_last_search', {
    p_filters: canonicalSavedFilters(filters),
    p_name: name.trim().slice(0, SAVED_SEARCH_NAME_MAX),
  });
  if (error) throw toSavedSearchError(error);
}

/** Turns the last search into a normal saved search (uses one of the 10 slots). */
export async function keepLastSearch(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({ kind: 'saved', name: name.trim().slice(0, SAVED_SEARCH_NAME_MAX) })
    .eq('id', id);
  if (error) throw toSavedSearchError(error);
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (error) throw toSavedSearchError(error);
}

export async function markSavedSearchSeen(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_saved_search_seen', { p_search_id: id });
  if (error) console.warn('mark_saved_search_seen failed:', error.message);
}

function formatAmount(value: string): string {
  const num = Number(value.replace(/\s/g, ''));
  if (!Number.isFinite(num) || num <= 0) return '';
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function rangeLabel(min: string, max: string, unit: string): string | null {
  const lo = formatAmount(min);
  const hi = formatAmount(max);
  if (lo && hi) return `${lo}–${hi} ${unit}`;
  if (lo) return `≥ ${lo} ${unit}`;
  if (hi) return `≤ ${hi} ${unit}`;
  return null;
}

function transactionLabel(t: TFunction, filters: ListingFilters): string | null {
  const tx = filters.category === 'residential' ? filters.residentialTransaction : filters.commercialTransaction;
  if (!tx) return null;
  return t(`filters.${tx}`);
}

/** Short human-readable pieces describing a saved search (used for chips and default names). */
export function describeSavedSearch(t: TFunction, filters: ListingFilters): string[] {
  const parts: string[] = [];
  parts.push(
    filters.propertyType && filters.propertyType !== 'any'
      ? translatePropertyType(t, filters.category, filters.propertyType)
      : t(`filters.${filters.category}`),
  );
  const tx = transactionLabel(t, filters);
  if (tx) parts.push(tx);
  if (filters.category === 'residential' && filters.roomsMin != null) {
    parts.push(t('savedSearches.roomsMin', { count: filters.roomsMin }));
  }
  const price = rangeLabel(filters.priceMin, filters.priceMax, filters.priceCurrency);
  if (price) parts.push(price);
  const area = rangeLabel(filters.areaMin, filters.areaMax, 'm²');
  if (area) parts.push(area);
  if (hasDrawnArea(filters)) {
    parts.push(t('savedSearches.drawnArea'));
  } else if (filters.districts.length === 1) {
    parts.push(filters.districts[0]);
  } else if (filters.districts.length > 1) {
    parts.push(t('filters.districtsSelected', { count: filters.districts.length }));
  }
  if (filters.keywords.trim()) parts.push(`“${filters.keywords.trim()}”`);
  return parts;
}

export function defaultSavedSearchName(t: TFunction, filters: ListingFilters): string {
  const [what] = describeSavedSearch(t, filters);
  const where = hasDrawnArea(filters)
    ? t('savedSearches.drawnArea')
    : filters.districts.length === 1
      ? filters.districts[0]
      : null;
  return [what, transactionLabel(t, filters), where].filter(Boolean).join(' · ').slice(0, SAVED_SEARCH_NAME_MAX);
}
