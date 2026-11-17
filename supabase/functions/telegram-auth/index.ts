// Telegram-verified registration, phone/password login and password reset — via the bot.
//
// Deploy WITHOUT the JWT check (Telegram's webhook calls carry no Supabase token):
//   supabase functions deploy telegram-auth --no-verify-jwt
// Secrets (scripts/setup-telegram.sh sets them and registers the webhook):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_USERNAME
//
// Flow (see patch-telegram-auth-v1.sql):
//   app  POST {action:'start', purpose, locale}  -> {flowId, secret, botUrl: t.me/<bot>?start=<code>}
//   app  opens botUrl; the user taps Start, then "📱 Share phone number"
//   Telegram -> POST /telegram-auth/webhook (contact = the sender's own verified number)
//   app  polls POST {action:'result', flowId, secret}   -> pending | verified (phone + name) | why not
//   app  POST {action:'register', ...} | {action:'reset_password', ...} -> {tokenHash}
//   app  supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) -> signed in
// Login: POST {action:'login', identifier, password} -> {tokenHash}.
// Email change: POST {action:'sync_email', email} with the user's access token.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  botText,
  cleanRegistrationInput,
  identityFromContact,
  parseStartCommand,
  placeholderEmail,
  randomToken,
  safeEqual,
  sha256Base64Url,
  type BotTextKey,
  type TelegramContact,
  type TelegramUser,
} from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const env = {
  url: Deno.env.get('SUPABASE_URL') ?? '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  botToken: Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '',
  webhookSecret: Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '',
  botUsername: (Deno.env.get('TELEGRAM_BOT_USERNAME') ?? 'Reyeltor_uz_bot').replace(/^@/, ''),
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(error: string, status = 400): Response {
  return json({ error }, status);
}

type Admin = SupabaseClient;

interface FlowRow {
  id: string;
  purpose: 'register' | 'reset';
  secret_hash: string;
  start_code: string;
  locale: string;
  status: string;
  telegram_id: number | null;
  telegram_username: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  expires_at: string;
}

async function loadFlow(admin: Admin, flowId: unknown, secret: unknown): Promise<FlowRow | null> {
  if (typeof flowId !== 'string' || typeof secret !== 'string' || !/^[0-9a-f-]{36}$/.test(flowId)) return null;
  const { data } = await admin.from('telegram_auth_flows').select('*').eq('id', flowId).maybeSingle();
  const flow = data as FlowRow | null;
  if (!flow) return null;
  if (!safeEqual(await sha256Base64Url(secret), flow.secret_hash)) return null;
  if (new Date(flow.expires_at).getTime() < Date.now()) return null;
  return flow;
}

async function findUserByPhone(admin: Admin, phone: string): Promise<string | null> {
  const { data } = await admin.rpc('find_user_by_phone', { p_phone: phone });
  return (data as string | null) ?? null;
}

async function findUserByTelegram(admin: Admin, telegramId: number): Promise<string | null> {
  const { data } = await admin.from('users').select('id').eq('telegram_id', telegramId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** One-time token the app exchanges for a session (supabase.auth.verifyOtp). */
async function sessionToken(admin: Admin, userId: string): Promise<string> {
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userError || !email) throw new Error('session_failed');
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) throw new Error('session_failed');
  return hashed;
}

// --- Telegram Bot API ---------------------------------------------------------------

async function botCall(method: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.warn(`telegram ${method} failed`, res.status, await res.text().catch(() => ''));
}

function say(chatId: number, locale: string | null, key: BotTextKey, keyboard: 'share' | 'remove' = 'remove') {
  return botCall('sendMessage', {
    chat_id: chatId,
    text: botText(locale, key),
    reply_markup:
      keyboard === 'share'
        ? {
            keyboard: [[{ text: botText(locale, 'shareButton'), request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        : { remove_keyboard: true },
  });
}

// --- actions ---------------------------------------------------------------------

async function start(admin: Admin, body: Record<string, unknown>, req: Request): Promise<Response> {
  const purpose = body.purpose === 'reset' ? 'reset' : body.purpose === 'register' ? 'register' : null;
  if (!purpose) return fail('invalid_purpose');
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 5) : 'uz';

  await admin.from('telegram_auth_flows').delete().lt('expires_at', new Date(Date.now() - 86_400_000).toISOString());

  // Rate limit: 10 starts per device/IP per 10 minutes, 500 in total.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ipHash = ip ? await sha256Base64Url(`reyeltor-ip:${ip}`) : null;
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: total } = await admin
    .from('telegram_auth_flows')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if ((total ?? 0) >= 500) return fail('too_many_attempts', 429);
  if (ipHash) {
    const { count: fromIp } = await admin
      .from('telegram_auth_flows')
      .select('id', { count: 'exact', head: true })
      .eq('client_ip_hash', ipHash)
      .gte('created_at', since);
    if ((fromIp ?? 0) >= 10) return fail('too_many_attempts', 429);
  }

  const secret = randomToken();
  const startCode = randomToken(24);
  const { data, error } = await admin
    .from('telegram_auth_flows')
    .insert({ purpose, locale, secret_hash: await sha256Base64Url(secret), start_code: startCode, client_ip_hash: ipHash })
    .select('id')
    .single();
  if (error || !data) return fail('server_error', 500);

  return json({
    flowId: data.id,
    secret,
    botUrl: `https://t.me/${env.botUsername}?start=${startCode}`,
    // Opens the Telegram app directly when it is installed.
    appUrl: `tg://resolve?domain=${env.botUsername}&start=${startCode}`,
  });
}

interface TelegramUpdate {
  message?: {
    chat?: { id: number; type?: string };
    from?: TelegramUser & { language_code?: string };
    text?: string;
    contact?: TelegramContact;
  };
}

/** Telegram -> bot updates. Always answers 200 so Telegram does not retry. */
async function webhook(admin: Admin, req: Request): Promise<Response> {
  const header = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!env.webhookSecret || !safeEqual(header, env.webhookSecret)) return new Response('forbidden', { status: 403 });

  const update = (await req.json().catch(() => ({}))) as TelegramUpdate;
  const message = update.message;
  const chatId = message?.chat?.id;
  const from = message?.from;
  if (!message || !chatId || !from?.id || message.chat?.type !== 'private') return new Response('ok');

  try {
    const code = parseStartCommand(message.text);
    if (code) {
      const { data } = await admin.from('telegram_auth_flows').select('*').eq('start_code', code).maybeSingle();
      const flow = data as FlowRow | null;
      if (!flow || flow.status !== 'pending' || new Date(flow.expires_at).getTime() < Date.now()) {
        await say(chatId, from.language_code ?? null, 'expired');
        return new Response('ok');
      }
      // Bind the flow to this Telegram account; only its own contact can complete it.
      await admin.from('telegram_auth_flows').update({ telegram_id: from.id }).eq('id', flow.id);
      await say(chatId, flow.locale, 'askPhone', 'share');
      return new Response('ok');
    }

    if (message.contact) {
      const { data } = await admin
        .from('telegram_auth_flows')
        .select('*')
        .eq('telegram_id', from.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const flow = data as FlowRow | null;
      if (!flow) {
        await say(chatId, from.language_code ?? null, 'noFlow');
        return new Response('ok');
      }

      const parsed = identityFromContact(from, message.contact);
      if (!parsed.ok) {
        await say(chatId, flow.locale, 'notOwn', 'share');
        return new Response('ok');
      }
      const identity = parsed.identity;
      const phone = identity.phone as string;
      const byTelegram = await findUserByTelegram(admin, identity.telegramId);
      const byPhone = await findUserByPhone(admin, phone);

      let status: string;
      let owner: string | null = null;
      let reply: BotTextKey;
      if (flow.purpose === 'register') {
        status = byTelegram || byPhone ? 'phone_taken' : 'verified';
        reply = status === 'verified' ? 'done' : 'taken';
      } else {
        // Reset: the account linked to this Telegram account, else the one with this phone.
        owner = byTelegram ?? byPhone;
        status = owner ? 'verified' : 'not_registered';
        reply = owner ? 'done' : 'notRegistered';
      }

      await admin
        .from('telegram_auth_flows')
        .update({
          status,
          user_id: owner,
          telegram_username: identity.username,
          phone,
          first_name: identity.firstName,
          last_name: identity.lastName,
          completed_at: new Date().toISOString(),
          // Time to fill in the registration form.
          expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        })
        .eq('id', flow.id);
      await say(chatId, flow.locale, reply);
      return new Response('ok');
    }

    if (typeof message.text === 'string' && message.text.startsWith('/start')) {
      await say(chatId, from.language_code ?? null, 'noFlow');
    }
  } catch (error) {
    console.error('telegram webhook error', error instanceof Error ? error.message : error);
  }
  return new Response('ok');
}

async function result(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const flow = await loadFlow(admin, body.flowId, body.secret);
  if (!flow) return fail('flow_expired');
  return json({
    status: flow.status,
    purpose: flow.purpose,
    phone: flow.phone,
    firstName: flow.first_name,
    lastName: flow.last_name,
    telegramUsername: flow.telegram_username,
  });
}

async function register(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const flow = await loadFlow(admin, body.flowId, body.secret);
  if (!flow || flow.purpose !== 'register') return fail('flow_expired');
  if (flow.status !== 'verified' || !flow.phone || !flow.telegram_id) return fail('flow_expired');

  const input = cleanRegistrationInput(body);
  if ('error' in input) return fail(input.error);

  // Re-check: someone may have registered this phone since the confirmation.
  if ((await findUserByTelegram(admin, flow.telegram_id)) || (await findUserByPhone(admin, flow.phone))) {
    return fail('phone_taken');
  }
  // An email (optional) is added afterwards by the app through Supabase's confirmation link,
  // so nobody can register with someone else's address.
  const fullName = `${input.firstName} ${input.lastName}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: placeholderEmail(flow.telegram_id),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: flow.phone,
      phone_visible: body.phoneVisible !== false,
      locale: typeof body.locale === 'string' ? body.locale.slice(0, 5) : 'uz',
    },
  });
  if (createError || !created?.user) {
    const message = createError?.message?.toLowerCase() ?? '';
    if (message.includes('already') && message.includes('email')) return fail('email_taken');
    if (message.includes('phone') || message.includes('database error')) return fail('phone_taken');
    console.warn('createUser failed', createError?.message);
    return fail('server_error', 500);
  }

  const userId = created.user.id;
  const { error: profileError } = await admin
    .from('users')
    .update({
      full_name: fullName,
      telegram_id: flow.telegram_id,
      telegram_username: flow.telegram_username,
      phone_verified_at: new Date().toISOString(),
      email_visible: body.emailVisible !== false,
    })
    .eq('id', userId);
  if (profileError) {
    // e.g. a parallel registration took this Telegram account a moment ago.
    await admin.auth.admin.deleteUser(userId);
    return fail('phone_taken');
  }

  await admin.from('telegram_auth_flows').update({ status: 'consumed', user_id: userId }).eq('id', flow.id);
  return json({ tokenHash: await sessionToken(admin, userId), pendingEmail: input.email });
}

async function resetPassword(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const flow = await loadFlow(admin, body.flowId, body.secret);
  if (!flow || flow.purpose !== 'reset' || flow.status !== 'verified' || !flow.user_id) return fail('flow_expired');
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8 || password.length > 72) return fail('password_too_short');

  const { error } = await admin.auth.admin.updateUserById(flow.user_id, { password });
  if (error) return fail('server_error', 500);

  // The person proved they own this Telegram account and phone: link them if not yet linked.
  const { data: profile } = await admin.from('users').select('telegram_id').eq('id', flow.user_id).maybeSingle();
  if (profile && !profile.telegram_id && flow.telegram_id && !(await findUserByTelegram(admin, flow.telegram_id))) {
    await admin
      .from('users')
      .update({ telegram_id: flow.telegram_id, telegram_username: flow.telegram_username, phone_verified_at: new Date().toISOString() })
      .eq('id', flow.user_id);
  }

  await admin.from('telegram_auth_flows').update({ status: 'consumed' }).eq('id', flow.id);
  return json({ tokenHash: await sessionToken(admin, flow.user_id) });
}

async function login(admin: Admin, body: Record<string, unknown>, req: Request): Promise<Response> {
  const identifier = typeof body.identifier === 'string' ? body.identifier.slice(0, 254) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 72) : '';
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const { data, error } = await admin.rpc('auth_password_login', {
    p_identifier: identifier,
    p_password: password,
    p_ip: ip,
  });
  if (error) return fail('server_error', 500);
  const row = (Array.isArray(data) ? data[0] : data) as { user_id: string | null; status: string } | undefined;
  if (row?.status === 'too_many_attempts') return fail('too_many_attempts', 429);
  if (row?.status !== 'ok' || !row.user_id) return fail('invalid_credentials', 401);
  return json({ tokenHash: await sessionToken(admin, row.user_id) });
}

/** Removes the account email (adding one goes through Supabase's confirmation email). */
async function syncEmail(admin: Admin, body: Record<string, unknown>, req: Request): Promise<Response> {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(jwt);
  const userId = auth?.user?.id;
  if (!userId) return fail('not_signed_in', 401);
  if (typeof body.email === 'string' && body.email.trim()) return fail('confirmation_required');

  const { data: profile } = await admin.from('users').select('telegram_id').eq('id', userId).maybeSingle();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email: placeholderEmail(profile?.telegram_id ?? userId),
    email_confirm: true,
  });
  if (error) return fail('server_error', 500);
  // The profile follows via the sync_profile_email trigger; set it here too for older databases.
  await admin.from('users').update({ email: null }).eq('id', userId);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!env.url || !env.serviceKey || !env.botToken) return fail('not_configured', 500);

  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
  const url = new URL(req.url);

  try {
    if (req.method === 'POST' && url.pathname.endsWith('/webhook')) return await webhook(admin, req);
    if (req.method !== 'POST') return fail('not_found', 404);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.action) {
      case 'start':
        return await start(admin, body, req);
      case 'result':
        return await result(admin, body);
      case 'register':
        return await register(admin, body);
      case 'reset_password':
        return await resetPassword(admin, body);
      case 'login':
        return await login(admin, body, req);
      case 'sync_email':
        return await syncEmail(admin, body, req);
      default:
        return fail('unknown_action');
    }
  } catch (error) {
    console.error('telegram-auth error', error instanceof Error ? error.message : error);
    return fail('server_error', 500);
  }
});
