/** Localized copy for saved-search alerts (app languages: uz, ru, en, zh, tr). */
export type SearchPushLocale = 'uz' | 'ru' | 'en' | 'zh' | 'tr';

export interface SearchPushCopy {
  title: string;
  body: string;
}

type Vars = { name: string; count: number; district: string };

const COPY: Record<SearchPushLocale, Record<'single' | 'multiple' | 'digest', (v: Vars) => SearchPushCopy>> = {
  uz: {
    single: (v) => ({
      title: `Yangi e'lon: «${v.name}»`,
      body: `${v.district}da saqlangan qidiruvingizga mos e'lon chiqdi. Ko'rish uchun bosing.`,
    }),
    multiple: (v) => ({
      title: `«${v.name}» bo'yicha yangi e'lonlar`,
      body: `Saqlangan qidiruvingizga ${v.count} ta yangi e'lon mos keldi.`,
    }),
    digest: (v) => ({
      title: 'Bugungi yangi mos e\'lonlar',
      body: `Saqlangan qidiruvlaringizga yana ${v.count} ta e'lon mos keldi.`,
    }),
  },
  ru: {
    single: (v) => ({
      title: `Новое объявление: «${v.name}»`,
      body: `В районе ${v.district} появилось объявление по вашему сохранённому поиску. Нажмите, чтобы открыть.`,
    }),
    multiple: (v) => ({
      title: `Новые объявления: «${v.name}»`,
      body: `${v.count} новых объявлений подходят под ваш сохранённый поиск.`,
    }),
    digest: (v) => ({
      title: 'Подходящие объявления за день',
      body: `Ещё ${v.count} объявлений подошли под ваши сохранённые поиски.`,
    }),
  },
  en: {
    single: (v) => ({
      title: `New match: “${v.name}”`,
      body: `A new listing in ${v.district} matches your saved search. Tap to view.`,
    }),
    multiple: (v) => ({
      title: `New matches: “${v.name}”`,
      body: `${v.count} new listings match your saved search.`,
    }),
    digest: (v) => ({
      title: 'Your matches today',
      body: `${v.count} more listings matched your saved searches.`,
    }),
  },
  zh: {
    single: (v) => ({
      title: `新匹配：「${v.name}」`,
      body: `${v.district}有一条新房源符合您保存的搜索。点击查看。`,
    }),
    multiple: (v) => ({
      title: `新匹配：「${v.name}」`,
      body: `有 ${v.count} 条新房源符合您保存的搜索。`,
    }),
    digest: (v) => ({
      title: '今日匹配房源',
      body: `另有 ${v.count} 条房源符合您保存的搜索。`,
    }),
  },
  tr: {
    single: (v) => ({
      title: `Yeni eşleşme: “${v.name}”`,
      body: `${v.district} bölgesinde kayıtlı aramanıza uyan yeni bir ilan var. Görmek için dokunun.`,
    }),
    multiple: (v) => ({
      title: `Yeni eşleşmeler: “${v.name}”`,
      body: `Kayıtlı aramanıza uyan ${v.count} yeni ilan var.`,
    }),
    digest: (v) => ({
      title: 'Bugünkü eşleşmeleriniz',
      body: `Kayıtlı aramalarınıza ${v.count} ilan daha uydu.`,
    }),
  },
};

/** Alerts for the user's most recent map search (not explicitly saved). */
const LAST_COPY: Record<SearchPushLocale, Record<'single' | 'multiple', (v: Vars) => SearchPushCopy>> = {
  uz: {
    single: (v) => ({ title: 'Oxirgi qidiruvingiz bo\'yicha yangi e\'lon', body: `${v.district}: ${v.name}. Ko'rish uchun bosing.` }),
    multiple: (v) => ({ title: 'Oxirgi qidiruvingiz bo\'yicha yangi e\'lonlar', body: `${v.name}: ${v.count} ta yangi e'lon.` }),
  },
  ru: {
    single: (v) => ({ title: 'Новое по вашему последнему поиску', body: `${v.district}: ${v.name}. Нажмите, чтобы открыть.` }),
    multiple: (v) => ({ title: 'Новые объявления по последнему поиску', body: `${v.name}: ${v.count} новых объявлений.` }),
  },
  en: {
    single: (v) => ({ title: 'New for your last search', body: `${v.district}: ${v.name}. Tap to view.` }),
    multiple: (v) => ({ title: 'New listings for your last search', body: `${v.name}: ${v.count} new listings.` }),
  },
  zh: {
    single: (v) => ({ title: '您最近的搜索有新房源', body: `${v.district}：${v.name}。点击查看。` }),
    multiple: (v) => ({ title: '您最近的搜索有新房源', body: `${v.name}：${v.count} 条新房源。` }),
  },
  tr: {
    single: (v) => ({ title: 'Son aramanız için yeni ilan', body: `${v.district}: ${v.name}. Görmek için dokunun.` }),
    multiple: (v) => ({ title: 'Son aramanız için yeni ilanlar', body: `${v.name}: ${v.count} yeni ilan.` }),
  },
};

export function getSearchPushCopy(
  kind: 'single' | 'multiple' | 'digest',
  locale: string | null | undefined,
  vars: Partial<Vars>,
  searchKind: 'saved' | 'last' = 'saved',
): SearchPushCopy {
  const base = (locale?.split('-')[0] ?? 'uz') as SearchPushLocale;
  const v = { name: vars.name ?? '', count: vars.count ?? 0, district: vars.district ?? '' };
  if (searchKind === 'last' && kind !== 'digest') return (LAST_COPY[base] ?? LAST_COPY.uz)[kind](v);
  const bucket = COPY[base] ?? COPY.uz;
  return bucket[kind](v);
}
