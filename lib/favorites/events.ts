type FavoritesListener = () => void;

const listeners = new Set<FavoritesListener>();

export function subscribeFavoritesChanged(listener: FavoritesListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyFavoritesChanged(): void {
  listeners.forEach((listener) => listener());
}
