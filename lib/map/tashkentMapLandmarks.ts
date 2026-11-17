/** Curated map landmarks for Tashkent — metro, parks, transport hubs, culture. */

export type MapLandmarkKind = 'metro' | 'park' | 'railway' | 'airport' | 'museum' | 'stadium';

export interface MapLandmark {
  id: string;
  kind: MapLandmarkKind;
  name: string;
  nameUz: string;
  lat: number;
  lng: number;
}

export function landmarkDisplayName(landmark: MapLandmark, language: string): string {
  return language.startsWith('uz') ? landmark.nameUz : landmark.name;
}

/**
 * Hand-curated coordinates (OpenStreetMap / official sources, Aug 2026).
 * Metro positions align with station entrances, not bus stops.
 */
export const TASHKENT_MAP_LANDMARKS: MapLandmark[] = [
  // —— Chilonzor line ——
  { id: 'metro-chinor', kind: 'metro', name: 'Chinor', nameUz: 'Chinor', lat: 41.2067, lng: 69.21896 },
  { id: 'metro-yangihayot', kind: 'metro', name: 'Yangihayot', nameUz: 'Yangihayot', lat: 41.21351, lng: 69.21402 },
  { id: 'metro-sirgali', kind: 'metro', name: 'Sirgali', nameUz: 'Sirgali', lat: 41.26612, lng: 69.20785 },
  { id: 'metro-ozgarish', kind: 'metro', name: "O'zgarish", nameUz: "O'zgarish", lat: 41.22734, lng: 69.20397 },
  { id: 'metro-choshtepa', kind: 'metro', name: 'Choshtepa', nameUz: 'Choshtepa', lat: 41.23825, lng: 69.19603 },
  { id: 'metro-olmazor', kind: 'metro', name: 'Olmazor', nameUz: 'Olmazor', lat: 41.25667, lng: 69.1961 },
  { id: 'metro-chilonzor', kind: 'metro', name: 'Chilonzor', nameUz: 'Chilonzor', lat: 41.27436, lng: 69.20497 },
  { id: 'metro-mirzo-ulugbek', kind: 'metro', name: "Mirzo Ulug'bek", nameUz: "Mirzo Ulug'bek", lat: 41.28203, lng: 69.21258 },
  { id: 'metro-novza', kind: 'metro', name: 'Novza', nameUz: 'Novza', lat: 41.29187, lng: 69.22362 },
  { id: 'metro-milliy-bog', kind: 'metro', name: 'Milliy Bog', nameUz: 'Milliy bog', lat: 41.30339, lng: 69.23567 },
  { id: 'metro-xalqlar-dostligi', kind: 'metro', name: "Xalqlar Do'stligi", nameUz: "Xalqlar do'stligi", lat: 41.3119, lng: 69.2431 },
  { id: 'metro-pakhtakor', kind: 'metro', name: 'Pakhtakor', nameUz: 'Paxtakor', lat: 41.31779, lng: 69.25509 },
  { id: 'metro-mustaqillik', kind: 'metro', name: 'Mustaqillik Maidoni', nameUz: 'Mustaqillik maydoni', lat: 41.31495, lng: 69.27106 },
  { id: 'metro-amir-temur', kind: 'metro', name: 'Amir Temur Xiyoboni', nameUz: 'Amir Temur xiyoboni', lat: 41.31267, lng: 69.28327 },
  { id: 'metro-hamid-olimjon', kind: 'metro', name: 'Hamid Olimjon', nameUz: 'Hamid Olimjon', lat: 41.31816, lng: 69.29574 },
  { id: 'metro-pushkin', kind: 'metro', name: 'Pushkin', nameUz: 'Pushkin', lat: 41.32195, lng: 69.3111 },
  { id: 'metro-buyuk-ipak-yoli', kind: 'metro', name: "Buyuk Ipak Yo'li", nameUz: "Buyuk Ipak yo'li", lat: 41.32611, lng: 69.32856 },

  // —— O'zbekiston line ——
  { id: 'metro-beruniy', kind: 'metro', name: 'Beruniy', nameUz: 'Beruniy', lat: 41.34462, lng: 69.2062 },
  { id: 'metro-tinchlik', kind: 'metro', name: 'Tinchlik', nameUz: 'Tinchlik', lat: 41.3323, lng: 69.21912 },
  { id: 'metro-chorsu', kind: 'metro', name: 'Chorsu', nameUz: 'Chorsu', lat: 41.32586, lng: 69.23682 },
  { id: 'metro-gafur-gulom', kind: 'metro', name: 'Gafur Gulom', nameUz: 'Gafur Gulom', lat: 41.32788, lng: 69.24583 },
  { id: 'metro-alisher-navoi', kind: 'metro', name: 'Alisher Navoi', nameUz: 'Alisher Navoi', lat: 41.31892, lng: 69.2543 },
  { id: 'metro-ozbekiston', kind: 'metro', name: "O'zbekiston", nameUz: "O'zbekiston", lat: 41.31194, lng: 69.25341 },
  { id: 'metro-kosmonavtlar', kind: 'metro', name: 'Kosmonavtlar', nameUz: 'Kosmonavtlar', lat: 41.30516, lng: 69.26472 },
  { id: 'metro-oybek', kind: 'metro', name: 'Oybek', nameUz: 'Oybek', lat: 41.29801, lng: 69.27405 },
  { id: 'metro-toshkent', kind: 'metro', name: 'Toshkent', nameUz: 'Toshkent', lat: 41.29329, lng: 69.28772 },
  { id: 'metro-mashinasozlar', kind: 'metro', name: 'Mashinasozlar', nameUz: 'Mashinasozlar', lat: 41.29898, lng: 69.30513 },
  { id: 'metro-dostlik', kind: 'metro', name: "Do'stlik", nameUz: "Do'stlik", lat: 41.29364, lng: 69.32224 },

  // —— Yunusobod line ——
  { id: 'metro-ming-orik', kind: 'metro', name: "Ming O'rik", nameUz: "Ming o'rik", lat: 41.29966, lng: 69.27441 },
  { id: 'metro-yunus-rajabiy', kind: 'metro', name: 'Yunus Rajabiy', nameUz: 'Yunus Rajabiy', lat: 41.31389, lng: 69.28351 },
  { id: 'metro-abdulla-qodiri', kind: 'metro', name: 'Abdulla Qodiri', nameUz: 'Abdulla Qodiriy', lat: 41.32019, lng: 69.28176 },
  { id: 'metro-minor', kind: 'metro', name: 'Minor', nameUz: 'Minor', lat: 41.32689, lng: 69.28342 },
  { id: 'metro-bodomzor', kind: 'metro', name: 'Bodomzor', nameUz: 'Bodomzor', lat: 41.33717, lng: 69.28457 },
  { id: 'metro-shahriston', kind: 'metro', name: 'Shahriston', nameUz: 'Shahriston', lat: 41.35312, lng: 69.28811 },
  { id: 'metro-yunusobod', kind: 'metro', name: 'Yunusobod', nameUz: 'Yunusobod', lat: 41.36664, lng: 69.29211 },
  { id: 'metro-turkiston', kind: 'metro', name: 'Turkiston', nameUz: 'Turkiston', lat: 41.37752, lng: 69.29602 },

  // —— Circle line (Wikipedia / OpenStreetMap, Aug 2026) ——
  { id: 'metro-texnopark', kind: 'metro', name: 'Texnopark', nameUz: 'Texnopark', lat: 41.29453, lng: 69.32289 },
  { id: 'metro-yashnobod', kind: 'metro', name: 'Yashnobod', nameUz: 'Yashnobod', lat: 41.29758, lng: 69.34992 },
  { id: 'metro-tuzel', kind: 'metro', name: 'Tuzel', nameUz: 'Tuzel', lat: 41.29206, lng: 69.35617 },
  { id: 'metro-olmos', kind: 'metro', name: 'Olmos', nameUz: 'Olmos', lat: 41.28197, lng: 69.36031 },
  { id: 'metro-rohat', kind: 'metro', name: 'Rohat', nameUz: 'Rohat', lat: 41.26553, lng: 69.36492 },
  { id: 'metro-yangiobod', kind: 'metro', name: 'Yangiobod', nameUz: 'Yangiobod', lat: 41.25547, lng: 69.35808 },
  { id: 'metro-qoyliq', kind: 'metro', name: "Qo'yliq", nameUz: "Qo'yliq", lat: 41.23742, lng: 69.32744 },
  { id: 'metro-matonat', kind: 'metro', name: 'Matonat', nameUz: 'Matonat', lat: 41.24444, lng: 69.30833 },
  { id: 'metro-qiyot', kind: 'metro', name: 'Qiyot', nameUz: 'Qiyot', lat: 41.24444, lng: 69.29972 },
  { id: 'metro-toliriq', kind: 'metro', name: 'Tolariq', nameUz: 'Tolariq', lat: 41.24451, lng: 69.28496 },
  { id: 'metro-xonobod', kind: 'metro', name: 'Xonobod', nameUz: 'Xonobod', lat: 41.23, lng: 69.27028 },
  { id: 'metro-quruvchilar', kind: 'metro', name: 'Quruvchilar', nameUz: 'Quruvchilar', lat: 41.22139, lng: 69.25972 },
  { id: 'metro-turon', kind: 'metro', name: 'Turon', nameUz: 'Turon', lat: 41.21083, lng: 69.23417 },
  { id: 'metro-qipchoq', kind: 'metro', name: 'Qipchoq', nameUz: 'Qipchoq', lat: 41.20556, lng: 69.22139 },

  // —— Railway & airport ——
  {
    id: 'railway-tashkent-central',
    kind: 'railway',
    name: 'Tashkent Central Railway Station',
    nameUz: 'Toshkent markaziy vokzali',
    lat: 41.25972,
    lng: 69.28722,
  },
  {
    id: 'airport-tas',
    kind: 'airport',
    name: 'Tashkent International Airport',
    nameUz: 'Toshkent xalqaro aeroporti',
    lat: 41.25996,
    lng: 69.28512,
  },

  // —— Major parks ——
  {
    id: 'park-navoi-national',
    kind: 'park',
    name: 'Alisher Navoi National Park',
    nameUz: 'Alisher Navoiy nomidagi milliy bog',
    lat: 41.30144,
    lng: 69.24167,
  },
  {
    id: 'park-japanese',
    kind: 'park',
    name: 'Japanese Garden',
    nameUz: 'Yapon bogi',
    lat: 41.33955,
    lng: 69.28202,
  },
  {
    id: 'park-ecopark',
    kind: 'park',
    name: 'Ecopark',
    nameUz: 'Ecopark',
    lat: 41.3096,
    lng: 69.29555,
  },
  {
    id: 'park-lokomotiv',
    kind: 'park',
    name: 'Lokomotiv Park',
    nameUz: 'Lokomotiv bogi',
    lat: 41.35312,
    lng: 69.34541,
  },
  {
    id: 'park-bobur',
    kind: 'park',
    name: 'Bobur Park',
    nameUz: 'Bobur bogi',
    lat: 41.28879,
    lng: 69.25741,
  },

  // —— Museums ——
  {
    id: 'museum-history',
    kind: 'museum',
    name: 'State Museum of History of Uzbekistan',
    nameUz: "O'zbekiston tarixi davlat muzeyi",
    lat: 41.31152,
    lng: 69.26933,
  },
  {
    id: 'museum-arts',
    kind: 'museum',
    name: 'State Museum of Arts of Uzbekistan',
    nameUz: "O'zbekiston davlat san'at muzeyi",
    lat: 41.31082,
    lng: 69.28672,
  },
  {
    id: 'museum-amir-timur',
    kind: 'museum',
    name: 'Amir Timur Museum',
    nameUz: 'Amir Temur muzeyi',
    lat: 41.31361,
    lng: 69.27889,
  },
  {
    id: 'museum-applied-arts',
    kind: 'museum',
    name: 'Museum of Applied Arts',
    nameUz: 'Amaliy sanʼat muzeyi',
    lat: 41.30102,
    lng: 69.25959,
  },
  {
    id: 'museum-savitsky',
    kind: 'museum',
    name: 'Ikuo Hirayama International Caravanserai of Culture',
    nameUz: 'Xalqaro madaniyat karvonsaroyi',
    lat: 41.31138,
    lng: 69.27842,
  },

  // —— Stadiums ——
  {
    id: 'stadium-pakhtakor',
    kind: 'stadium',
    name: 'Pakhtakor Stadium',
    nameUz: 'Paxtakor stadioni',
    lat: 41.30442,
    lng: 69.27062,
  },
  {
    id: 'stadium-milliy',
    kind: 'stadium',
    name: 'Milliy Stadium',
    nameUz: 'Milliy stadion',
    lat: 41.27974,
    lng: 69.21262,
  },
  {
    id: 'stadium-jar',
    kind: 'stadium',
    name: 'JAR Stadium',
    nameUz: 'JAR stadioni',
    lat: 41.29752,
    lng: 69.23782,
  },
];

export const TASHKENT_METRO_LANDMARKS = TASHKENT_MAP_LANDMARKS.filter((l) => l.kind === 'metro');
