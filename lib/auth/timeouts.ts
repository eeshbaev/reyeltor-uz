const AUTH_TIMEOUT_MS = 20_000;

export class AuthRequestTimeoutError extends Error {
  constructor() {
    super('AUTH_TIMEOUT');
    this.name = 'AuthRequestTimeoutError';
  }
}

/** Accepts any thenable (Supabase query builders are PromiseLike, not Promise). */
export async function withAuthTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new AuthRequestTimeoutError()), AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
