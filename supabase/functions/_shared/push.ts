export type PushLocale = 'en' | 'uz' | 'ru';

export interface PushCopy {
  title: string;
  body: string;
}

type PushMessageKey = 'expiry15' | 'expiry5' | 'delete10' | 'priceDrop' | 'reengagement' | 'confirmAvailability';

const MESSAGES: Record<PushMessageKey, Record<PushLocale, PushCopy>> = {
  expiry15: {
    en: {
      title: 'Listing expiring soon',
      body: 'Your listing expires in 15 days — edit any detail to keep it active.',
    },
    uz: {
      title: "E'lon muddati tugamoqda",
      body: "E'loningiz 15 kun ichida tugaydi — faol saqlash uchun tahrirlang.",
    },
    ru: {
      title: 'Объявление скоро истекает',
      body: 'Срок объявления истекает через 15 дней — отредактируйте, чтобы продлить.',
    },
  },
  expiry5: {
    en: {
      title: 'Listing expiring soon',
      body: '5 days until your listing archives. A small edit resets the timer.',
    },
    uz: {
      title: "E'lon muddati tugamoqda",
      body: "5 kundan keyin e'lon arxivlanadi. Kichik tahrir muddatni yangilaydi.",
    },
    ru: {
      title: 'Объявление скоро истекает',
      body: 'Через 5 дней объявление уйдёт в архив. Редактирование продлевает срок.',
    },
  },
  delete10: {
    en: {
      title: 'Listing will be deleted',
      body: "Your archived listing disappears in 10 days. Reactivate it or it's gone.",
    },
    uz: {
      title: "E'lon o'chiriladi",
      body: "Arxivdagi e'lon 10 kundan keyin yo'qoladi. Qayta faollashtiring.",
    },
    ru: {
      title: 'Объявление будет удалено',
      body: 'Архивное объявление исчезнет через 10 дней. Активируйте снова.',
    },
  },
  priceDrop: {
    en: {
      title: 'Price changed on a favorite',
      body: 'A listing you saved has a new price. Tap to view.',
    },
    uz: {
      title: 'Sevimlidagi narx o\'zgardi',
      body: 'Saqlagan e\'loningiz narxi yangilandi. Ko\'rish uchun bosing.',
    },
    ru: {
      title: 'Изменилась цена в избранном',
      body: 'У сохранённого объявления новая цена. Нажмите, чтобы открыть.',
    },
  },
  confirmAvailability: {
    en: {
      title: 'Is your property still available?',
      body: 'Tap to confirm in one step. Buyers see when a listing was last confirmed.',
    },
    uz: {
      title: 'Obyektingiz hali ham mavjudmi?',
      body: "Bir bosishda tasdiqlang. Xaridorlar e'lon qachon tasdiqlanganini ko'radi.",
    },
    ru: {
      title: 'Объект ещё актуален?',
      body: 'Подтвердите в одно нажатие. Покупатели видят, когда объявление подтверждали в последний раз.',
    },
  },
  reengagement: {
    en: {
      title: 'New listings in Tashkent',
      body: "See what's new on the map.",
    },
    uz: {
      title: 'Toshkentda yangi e\'lonlar',
      body: 'Xaritada yangiliklarni ko\'ring.',
    },
    ru: {
      title: 'Новые объявления в Ташкенте',
      body: 'Посмотрите новинки на карте.',
    },
  },
};

export function getPushCopy(key: PushMessageKey, locale: string | null | undefined): PushCopy {
  const base = (locale?.split('-')[0] ?? 'en') as PushLocale;
  const bucket = MESSAGES[key];
  return bucket[base] ?? bucket.en;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
  channelId?: string;
  data?: Record<string, string>;
}

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Expo push failed:', res.status, text);
    }
  }
}
