import { initI18n } from '@/lib/i18n';
import { logger } from '@/lib/logging/logger';
import { configureNotificationHandler, setupAndroidChannels } from '@/lib/notifications';
import { StorageCache } from '@/lib/storage/storageCache';

const STEP_TIMEOUT_MS = 5_000;

export interface AppStartupResult {
  errors: string[];
}

async function withTimeout(label: string, task: () => Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), STEP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Run non-blocking startup tasks; never throw — the app should still open. */
export async function runAppStartup(): Promise<AppStartupResult> {
  const errors: string[] = [];

  const steps: Array<[string, () => Promise<void>]> = [
    ['i18n', initI18n],
    ['storage-cache', () => StorageCache.init()],
    ['notifications', async () => {
      configureNotificationHandler();
      await setupAndroidChannels();
    }],
  ];

  await Promise.all(
    steps.map(async ([label, step]) => {
      try {
        await withTimeout(label, step);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        logger.warn('App startup step failed', { context: 'appStartup', extra: { label, message } });
      }
    }),
  );

  return { errors };
}
