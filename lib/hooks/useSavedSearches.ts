import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/context/AuthContext';
import {
  createSavedSearch,
  deleteSavedSearch,
  fetchSavedSearches,
  keepLastSearch,
  markSavedSearchSeen,
  updateSavedSearch,
  type SavedSearch,
} from '@/lib/savedSearches';
import type { ListingFilters } from '@/types';

export function savedSearchesKey(userId: string | undefined) {
  return ['saved-searches', userId ?? 'guest'] as const;
}

export function useSavedSearches() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const key = savedSearchesKey(userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSavedSearches(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (input: { name: string; filters: ListingFilters; notifyEnabled: boolean }) =>
      createSavedSearch({ userId: userId as string, ...input }),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: (input: { id: string; name?: string; filters?: ListingFilters; notifyEnabled?: boolean }) =>
      updateSavedSearch(input.id, input),
    onMutate: async (input) => {
      // Optimistic toggle/rename so switches feel instant.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedSearch[]>(key);
      queryClient.setQueryData<SavedSearch[]>(key, (list) =>
        (list ?? []).map((s) =>
          s.id === input.id
            ? {
                ...s,
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.notifyEnabled !== undefined ? { notify_enabled: input.notifyEnabled } : {}),
              }
            : s,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSettled: invalidate,
  });

  const keepLast = useMutation({
    mutationFn: (input: { id: string; name: string }) => keepLastSearch(input.id, input.name),
    onSettled: invalidate,
  });

  const markSeen = useMutation({
    mutationFn: (id: string) => markSavedSearchSeen(id),
    onSettled: invalidate,
  });

  const all = query.data ?? [];
  return {
    userId,
    /** Saved searches (the 10-slot list). */
    searches: all.filter((s) => s.kind !== 'last'),
    /** The automatic "last search", if any. */
    lastSearch: all.find((s) => s.kind === 'last') ?? null,
    loading: query.isLoading && Boolean(userId),
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    keepLast,
    markSeen,
  };
}
