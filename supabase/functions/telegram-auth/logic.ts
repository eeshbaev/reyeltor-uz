// Pure helpers for the telegram-auth function (no Deno/Supabase APIs, unit-tested in
// supabase/tests/telegram-auth.logic-test.mjs).

export const PLACEHOLDER_EMAIL_DOMAIN = 'telegram.reyeltor.invalid';

/** Internal sign-in address for accounts registered without an email (never shown or mailed). */
export function placeholderEmail(key: string | number): string {
  return `tg${String(key).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

/** Telegram sends "998901234567"; the app stores "+998901234567". */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  return `+${digits}`;
}

export interface TelegramClaims {
  sub?: string;
  id?: number | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
}

export interface TelegramIdentity {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export function identityFromClaims(claims: TelegramClaims): TelegramIdentity | null {
  const telegramId = Number(claims.id ?? NaN);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) return null;

  let firstName = (claims.given_name ?? '').trim();
  let lastName = (claims.family_name ?? '').trim();
  if (!firstName && !lastName && claims.name) {
    const parts = claims.name.trim().split(/\s+/);
    firstName = parts.shift() ?? '';
    lastName = parts.join(' ');
  }

  // Only a phone Telegram marks as verified counts (the claim is absent if the user declined).
  const phone = claims.phone_number_verified === false ? null : normalizePhone(claims.phone_number);

  return {
    telegramId,
    username: claims.preferred_username?.trim() || null,
    firstName: firstName.slice(0, 60),
    lastName: lastName.slice(0, 60),
    phone,
  };
}

export type RegistrationError =
  | 'first_name_required'
  | 'last_name_required'
  | 'password_too_short'
  | 'invalid_email';

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  password: string;
  email: string | null;
}

export function cleanRegistrationInput(body: Record<string, unknown>): RegistrationInput | { error: RegistrationError } {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim().replace(/\s+/g, ' ') : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim().replace(/\s+/g, ' ') : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (firstName.length < 2 || firstName.length > 60) return { error: 'first_name_required' };
  if (lastName.length < 2 || lastName.length > 60) return { error: 'last_name_required' };
  if (password.length < 8 || password.length > 72) return { error: 'password_too_short' };
  if (rawEmail && (!isValidEmail(rawEmail) || isPlaceholderEmail(rawEmail))) return { error: 'invalid_email' };

  return { firstName, lastName, password, email: rawEmail || null };
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

/** Constant-time comparison for equal-length strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// --- Bot-based confirmation (t.me/<bot>?start=<code> + "Share phone number") -------------

/** Telegram deep-link start parameters: 1-64 chars of A-Z a-z 0-9 _ -. */
export function isValidStartCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(code);
}

/** "/start abc" or "/start@Bot abc" -> "abc" (null for a bare /start or other text). */
export function parseStartCommand(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const match = /^\/start(?:@\w+)?\s+(\S+)\s*$/.exec(text.trim());
  return match ? match[1] : null;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramContact {
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
}

export type ContactResult = { ok: true; identity: TelegramIdentity } | { ok: false; reason: 'not_own_contact' | 'invalid' };

/**
 * A shared contact counts only if it is the sender's own (button "Share phone number"):
 * forwarded contacts of other people have a different or missing user_id.
 */
export function identityFromContact(from: TelegramUser | undefined, contact: TelegramContact | undefined): ContactResult {
  if (!from?.id || !contact) return { ok: false, reason: 'invalid' };
  if (contact.user_id !== from.id) return { ok: false, reason: 'not_own_contact' };
  const phone = normalizePhone(contact.phone_number);
  if (!phone) return { ok: false, reason: 'invalid' };
  return {
    ok: true,
    identity: {
      telegramId: from.id,
      username: from.username?.trim() || null,
      firstName: (contact.first_name ?? from.first_name ?? '').trim().slice(0, 60),
      lastName: (contact.last_name ?? from.last_name ?? '').trim().slice(0, 60),
      phone,
    },
  };
}

export type BotTextKey = 'askPhone' | 'shareButton' | 'done' | 'taken' | 'notRegistered' | 'expired' | 'noFlow' | 'notOwn';

const BOT_TEXT: Record<string, Record<BotTextKey, string>> = {
  uz: {
    askPhone: "Reyeltor-uz: telefon raqamingizni tasdiqlash uchun pastdagi «📱 Raqamni ulashish» tugmasini bosing.",
    shareButton: '📱 Raqamni ulashish',
    done: "✅ Raqamingiz tasdiqlandi. Reyeltor-uz ilovasiga qayting.",
    taken: "Bu raqam allaqachon roʻyxatdan oʻtgan. Ilovaga qaytib, raqam va parol bilan kiring.",
    notRegistered: "Bu raqam bilan hisob topilmadi. Ilovaga qaytib, roʻyxatdan oʻting.",
    expired: "Bu havola eskirgan. Ilovada qaytadan «Telegram bilan davom etish» tugmasini bosing.",
    noFlow: "Roʻyxatdan oʻtish yoki parolni tiklash uchun Reyeltor-uz ilovasini oching va «Telegram bilan davom etish» tugmasini bosing.",
    notOwn: "Iltimos, oʻzingizning raqamingizni pastdagi tugma orqali ulashing.",
  },
  ru: {
    askPhone: 'Reyeltor-uz: нажмите кнопку «📱 Поделиться номером» внизу, чтобы подтвердить номер телефона.',
    shareButton: '📱 Поделиться номером',
    done: '✅ Номер подтверждён. Вернитесь в приложение Reyeltor-uz.',
    taken: 'Этот номер уже зарегистрирован. Вернитесь в приложение и войдите по номеру и паролю.',
    notRegistered: 'Аккаунт с этим номером не найден. Вернитесь в приложение и зарегистрируйтесь.',
    expired: 'Ссылка устарела. Нажмите «Продолжить с Telegram» в приложении ещё раз.',
    noFlow: 'Чтобы зарегистрироваться или сбросить пароль, откройте приложение Reyeltor-uz и нажмите «Продолжить с Telegram».',
    notOwn: 'Пожалуйста, поделитесь своим номером с помощью кнопки внизу.',
  },
  en: {
    askPhone: 'Reyeltor-uz: tap "📱 Share phone number" below to confirm your phone number.',
    shareButton: '📱 Share phone number',
    done: '✅ Your number is confirmed. Return to the Reyeltor-uz app.',
    taken: 'This number is already registered. Return to the app and sign in with your phone and password.',
    notRegistered: 'No account uses this number. Return to the app and register.',
    expired: 'This link has expired. Tap "Continue with Telegram" in the app again.',
    noFlow: 'To register or reset your password, open the Reyeltor-uz app and tap "Continue with Telegram".',
    notOwn: 'Please share your own number using the button below.',
  },
  zh: {
    askPhone: 'Reyeltor-uz：请点击下方「📱 分享手机号」按钮确认您的手机号。',
    shareButton: '📱 分享手机号',
    done: '✅ 手机号已确认。请返回 Reyeltor-uz 应用。',
    taken: '该手机号已注册。请返回应用，使用手机号和密码登录。',
    notRegistered: '没有使用该手机号的账户。请返回应用注册。',
    expired: '链接已过期。请在应用中再次点击「使用 Telegram 继续」。',
    noFlow: '如需注册或重置密码，请打开 Reyeltor-uz 应用并点击「使用 Telegram 继续」。',
    notOwn: '请使用下方按钮分享您自己的手机号。',
  },
  tr: {
    askPhone: 'Reyeltor-uz: telefon numaranızı doğrulamak için aşağıdaki "📱 Numarayı paylaş" düğmesine dokunun.',
    shareButton: '📱 Numarayı paylaş',
    done: '✅ Numaranız doğrulandı. Reyeltor-uz uygulamasına dönün.',
    taken: 'Bu numara zaten kayıtlı. Uygulamaya dönüp numaranız ve şifrenizle giriş yapın.',
    notRegistered: 'Bu numarayla bir hesap yok. Uygulamaya dönüp kayıt olun.',
    expired: 'Bu bağlantının süresi doldu. Uygulamada tekrar "Telegram ile devam et"e dokunun.',
    noFlow: 'Kayıt olmak veya şifrenizi sıfırlamak için Reyeltor-uz uygulamasını açıp "Telegram ile devam et"e dokunun.',
    notOwn: 'Lütfen aşağıdaki düğmeyle kendi numaranızı paylaşın.',
  },
};

export function botText(locale: string | null | undefined, key: BotTextKey): string {
  const lang = (locale ?? '').slice(0, 2).toLowerCase();
  return (BOT_TEXT[lang] ?? BOT_TEXT.uz)[key];
}
