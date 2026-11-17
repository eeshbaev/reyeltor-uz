// node --experimental-strip-types supabase/tests/telegram-auth.logic-test.mjs
import {
  botText, cleanRegistrationInput, identityFromClaims, identityFromContact, isPlaceholderEmail, isValidStartCode,
  normalizePhone, parseStartCommand, placeholderEmail, randomToken, safeEqual, sha256Base64Url,
} from '../functions/telegram-auth/logic.ts';

let fail = 0;
const ok = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fail++; };

ok(normalizePhone('998901234567') === '+998901234567', 'Telegram phone gets a + prefix');
ok(normalizePhone('+998 (90) 123-45-67') === '+998901234567', 'formatting stripped');
ok(normalizePhone('123') === null && normalizePhone(undefined) === null, 'short/missing phone rejected');

const id = identityFromClaims({ id: 987654321, given_name: ' Aziz ', family_name: 'Karimov', preferred_username: 'aziz', phone_number: '998901234567', phone_number_verified: true });
ok(id.telegramId === 987654321 && id.firstName === 'Aziz' && id.lastName === 'Karimov' && id.phone === '+998901234567' && id.username === 'aziz', 'claims mapped to identity');
const fromName = identityFromClaims({ id: '5', name: 'Malika Abdullayeva Qizi' });
ok(fromName.firstName === 'Malika' && fromName.lastName === 'Abdullayeva Qizi' && fromName.phone === null, 'full name split when given/family missing; no phone when not shared');
ok(identityFromClaims({ id: 5, phone_number: '998901234567', phone_number_verified: false }).phone === null, 'unverified phone ignored');
ok(identityFromClaims({ name: 'x' }) === null, 'missing Telegram id rejected');


ok(placeholderEmail(555) === 'tg555@telegram.reyeltor.invalid' && isPlaceholderEmail('TG555@telegram.reyeltor.invalid'), 'placeholder email');
ok(isPlaceholderEmail(placeholderEmail('1b2c-3d')) && !isPlaceholderEmail('a@b.uz') && !isPlaceholderEmail(null), 'placeholder detection');

const good = cleanRegistrationInput({ firstName: ' Aziz  ', lastName: 'Karimov', password: 'longenough', email: ' A@B.UZ ' });
ok(!('error' in good) && good.firstName === 'Aziz' && good.email === 'a@b.uz', 'registration input cleaned');
ok(cleanRegistrationInput({ firstName: 'Aziz', lastName: 'Karimov', password: 'longenough', email: '' }).email === null, 'email optional');
ok(cleanRegistrationInput({ firstName: 'A', lastName: 'Karimov', password: 'longenough' }).error === 'first_name_required', 'first name required');
ok(cleanRegistrationInput({ firstName: 'Aziz', lastName: '', password: 'longenough' }).error === 'last_name_required', 'last name required');
ok(cleanRegistrationInput({ firstName: 'Aziz', lastName: 'Karimov', password: 'short' }).error === 'password_too_short', 'password length enforced');
ok(cleanRegistrationInput({ firstName: 'Aziz', lastName: 'Karimov', password: 'longenough', email: 'nope' }).error === 'invalid_email', 'bad email rejected');
ok(cleanRegistrationInput({ firstName: 'Aziz', lastName: 'Karimov', password: 'longenough', email: 'tg1@telegram.reyeltor.invalid' }).error === 'invalid_email', 'placeholder email cannot be claimed');

// PKCE S256 test vector from RFC 7636
ok(await sha256Base64Url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk') === 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'PKCE challenge matches RFC 7636');
ok(safeEqual('abc', 'abc') && !safeEqual('abc', 'abd') && !safeEqual('abc', 'ab'), 'constant-time compare');

// Bot flow
const code = randomToken(24);
ok(isValidStartCode(code) && code.length <= 64, 'start code fits Telegram deep-link rules');
ok(!isValidStartCode('short') && !isValidStartCode('has space in it 1234567') && !isValidStartCode(null), 'bad start codes rejected');
ok(parseStartCommand(`/start ${code}`) === code && parseStartCommand(`/start@Reyeltor_uz_bot ${code}`) === code, '/start payload parsed');
ok(parseStartCommand('/start') === null && parseStartCommand('hello') === null, 'bare /start has no payload');
const me = { id: 42, first_name: 'Aziz', last_name: 'Karimov', username: 'aziz' };
const own = identityFromContact(me, { user_id: 42, phone_number: '998901234567', first_name: 'Aziz', last_name: 'Karimov' });
ok(own.ok && own.identity.phone === '+998901234567' && own.identity.telegramId === 42 && own.identity.lastName === 'Karimov', 'own shared contact accepted');
const forwarded = identityFromContact(me, { user_id: 99, phone_number: '998907777777' });
ok(!forwarded.ok && forwarded.reason === 'not_own_contact', "someone else's contact refused");
ok(!identityFromContact(me, { phone_number: '998907777777' }).ok, 'contact without user id refused');
ok(identityFromContact({ id: 7, first_name: 'Ali' }, { user_id: 7, phone_number: '+998 90 111 22 33' }).identity.firstName === 'Ali', 'name falls back to the Telegram profile');
ok(botText('ru-RU', 'shareButton').includes('Поделиться') && botText('xx', 'done').includes('tasdiqlandi'), 'bot texts localized with Uzbek fallback');

console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
