import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmWithTelegram, openTelegramBot, type TelegramFlow, type TelegramPurpose } from '@/lib/auth/telegramAuth';

/** Runs one Telegram bot confirmation at a time; stops waiting on cancel or unmount. */
export function useTelegramConfirm(purpose: TelegramPurpose) {
  const { i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const urlsRef = useRef<{ appUrl: string; botUrl: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async (): Promise<TelegramFlow> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConfirming(true);
    try {
      return await confirmWithTelegram(purpose, {
        locale: i18n.language,
        signal: controller.signal,
        onStarted: (urls) => {
          urlsRef.current = urls;
        },
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setConfirming(false);
      }
    }
  }, [i18n.language, purpose]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reopen = useCallback(() => {
    if (urlsRef.current) void openTelegramBot(urlsRef.current);
  }, []);

  return { start, cancel, reopen, confirming };
}
