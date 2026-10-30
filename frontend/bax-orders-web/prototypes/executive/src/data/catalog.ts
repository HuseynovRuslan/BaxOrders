/**
 * DEMO MƏLUMAT. The category tree follows the real three-level structure of the owner's workbook (Ana › Orta › Alt,
 * names as the workbook writes them); the products, objects, prices and quantities are invented for the prototype
 * and are not BaxOrders business data.
 */

export interface ProductSeed {
  name: string
  unit: string
  /** Price per unit in January, before the year's drift. */
  price: number
  /** A typical quantity for one object in one month. */
  qty: number
}

/** root → middle → leaf → products */
export type CatalogSeed = Record<string, Record<string, Record<string, ProductSeed[]>>>

export const catalogSeed: CatalogSeed = {
  'Təmizlik': {
    'Təmizlik kimyəvi maddələr': {
      'Döşəmə təmizləyici': [
        { name: 'Döşəmə yuyucu konsentrat 5 L', unit: 'bidon', price: 18.5, qty: 8 },
        { name: 'Neytral döşəmə təmizləyici 1 L', unit: 'şüşə', price: 4.2, qty: 12 },
      ],
      'Şüşə təmizləyiciləri': [{ name: 'Şüşə təmizləyici 750 ml', unit: 'ədəd', price: 3.1, qty: 10 }],
      'Sanitar WC təmizləyici': [{ name: 'WC gel 1 L', unit: 'ədəd', price: 2.9, qty: 14 }],
      'Əl üçün yuyucu vasitə': [{ name: 'Maye sabun 5 L', unit: 'bidon', price: 9.8, qty: 4 }],
    },
    'Təmizlik ləvazimatı': {
      'Təmizlik bezi': [
        { name: 'Mikrofiber əski 40×40', unit: 'ədəd', price: 2, qty: 25 },
        { name: 'Pambıq parça', unit: 'kq', price: 6.5, qty: 5 },
      ],
      'Döşəmə təmizlik ləvazimatı': [{ name: 'Mop başlığı 50 sm', unit: 'ədəd', price: 4.5, qty: 6 }],
      'Süngər və qab simi': [{ name: 'Süngər (10 ədəd)', unit: 'paket', price: 2.4, qty: 6 }],
    },
    'Kağız dəsmal və salfetlər': {
      'Tualet kağızı': [{ name: 'Tualet kağızı', unit: 'rulon', price: 0.65, qty: 120 }],
      'Z katlama salfet': [{ name: 'Z katlama salfet', unit: 'paçka', price: 1.8, qty: 40 }],
    },
    'Tullantı paketi': {
      '80x110': [{ name: 'Zibil paketi 80×110', unit: 'rulon', price: 5.5, qty: 30 }],
      '50x60': [{ name: 'Zibil paketi 50×60', unit: 'rulon', price: 2.2, qty: 20 }],
    },
  },
  'Yaşıllıq': {
    'Bitkilər': {
      'Mövsümi güllər': [
        { name: 'Petuniya şitili', unit: 'ədəd', price: 0.9, qty: 300 },
        { name: 'Bənövşə şitili', unit: 'ədəd', price: 0.8, qty: 250 },
      ],
      'Qazon və çəmən toxumu': [{ name: 'Çəmən toxumu', unit: 'kq', price: 12, qty: 15 }],
      'Kol və həmişəyaşıl bitki': [{ name: 'Şümşad kolu', unit: 'ədəd', price: 7.5, qty: 20 }],
    },
    'Gübrə və torpaq': {
      'Mineral gübrə': [{ name: 'NPK gübrə 25 kq', unit: 'kisə', price: 38, qty: 4 }],
      'Torpaq əlavələri': [{ name: 'Torf qarışığı 50 L', unit: 'kisə', price: 9, qty: 12 }],
    },
    'Bitki mühafizəsi': {
      'Alaq dərmanı': [{ name: 'Alaq dərmanı 1 L', unit: 'şüşə', price: 24, qty: 3 }],
    },
    'Yaşıllıq texnikası': {
      'Ehtiyat hissələri': [
        { name: 'Trimmer üçün leskalı başlıq', unit: 'ədəd', price: 36, qty: 2 },
        { name: 'Trimmer leskası 3 mm', unit: 'metr', price: 0.35, qty: 200 },
      ],
    },
    'Bağ alətləri': {
      'Ləvazimat': [
        { name: 'Bel', unit: 'ədəd', price: 14, qty: 3 },
        { name: 'Dırmıq', unit: 'ədəd', price: 9, qty: 3 },
      ],
    },
  },
  'Usta': {
    'Tikinti ləvazimatı': {
      'Material': [
        { name: 'Sement M400, 50 kq', unit: 'kisə', price: 7.8, qty: 10 },
        { name: 'Qum', unit: 'ton', price: 22, qty: 2 },
      ],
      'Mərmər və Qranit yapış': [{ name: 'Qranit yapışdırıcısı 25 kq', unit: 'kisə', price: 11.5, qty: 6 }],
      'Metal boyası': [{ name: 'Metal boyası 2,5 L', unit: 'bidon', price: 21, qty: 3 }],
      'Əl alətləri': [{ name: 'Kəlbətin', unit: 'ədəd', price: 8, qty: 2 }],
    },
    'Santexnika': {
      'Material': [
        { name: 'PPR boru 25 mm', unit: 'metr', price: 1.4, qty: 40 },
        { name: 'Kran ½″', unit: 'ədəd', price: 6.5, qty: 4 },
      ],
    },
  },
  'Geyim': {
    'Fərdi mühafizə vasitələri': {
      'Əlcək': [{ name: 'İş əlcəyi', unit: 'cüt', price: 1.2, qty: 60 }],
      'İş ayaqqabısı': [{ name: 'İş ayaqqabısı', unit: 'cüt', price: 38, qty: 3 }],
      'Forma': [{ name: 'İş forması (dəst)', unit: 'dəst', price: 45, qty: 2 }],
    },
    'Xəbərdarlıq vasitələri': {
      'Stop lentləri': [{ name: 'Xəbərdarlıq lenti 100 m', unit: 'rulon', price: 4, qty: 5 }],
    },
  },
  'Suvarma': {
    'Suvarma ləvazimatı': {
      'Sprinklər və çiləyicilər': [{ name: 'Sprinkler başlığı', unit: 'ədəd', price: 6.8, qty: 10 }],
      'Şlanq birləşdiriciləri': [{ name: 'Şlanq birləşdiricisi ¾″', unit: 'ədəd', price: 2.6, qty: 12 }],
    },
    'Boru və fitinqlər': {
      'Material': [{ name: 'Damcı suvarma borusu 16 mm', unit: 'metr', price: 0.45, qty: 400 }],
    },
    'Nasos və təzyiq': {
      'Motor': [{ name: 'Dərinlik nasosu 1,1 kVt', unit: 'ədəd', price: 420, qty: 1 }],
    },
  },
  'Fontan': {
    'Kimyəvi vasitələr': {
      'Su kimyəviləri': [
        { name: 'Xlor tableti 5 kq', unit: 'vedrə', price: 32, qty: 3 },
        { name: 'Yosun əleyhinə vasitə 5 L', unit: 'bidon', price: 27, qty: 2 },
      ],
    },
    'Ehtiyat hissələri': {
      'Motor ehtiyat hissələri': [{ name: 'Fontan nasosu üçün salnik dəsti', unit: 'dəst', price: 55, qty: 1 }],
    },
  },
  'Nəqliyyat': {
    'Yanacaq': {
      'Aİ92': [{ name: 'Benzin Aİ-92', unit: 'litr', price: 1, qty: 400 }],
      'Dizel': [{ name: 'Dizel yanacağı', unit: 'litr', price: 1, qty: 300 }],
    },
    'Daşınma xidməti': {
      'Çatdırılma': [{ name: 'Material daşınması', unit: 'reys', price: 25, qty: 3 }],
    },
  },
  'Ofis': {
    'Kağız və kargüzarlıq': {
      'Ləvazimat': [{ name: 'A4 kağız', unit: 'paçka', price: 6.8, qty: 6 }],
    },
  },
  'Elektrik': {
    'İşıqlandırma': {
      'İşıqlandırma': [{ name: 'LED lampa 15 Vt', unit: 'ədəd', price: 3.6, qty: 20 }],
    },
    'Elektrik materialları': {
      'Material': [{ name: 'Kabel 3×2,5', unit: 'metr', price: 1.9, qty: 50 }],
    },
  },
  'Məişət': {
    'Məişət texnikası': {
      'İsidici cihaz': [{ name: 'Elektrik qızdırıcı', unit: 'ədəd', price: 65, qty: 1 }],
    },
  },
}

export interface SiteSeed {
  name: string
  kind: string
  /** How much of each root category the object orders: 0 = never, 1 = typical, 2 = heavy. */
  profile: Partial<Record<string, number>>
  /** First month with an order (1–12). */
  from?: number
  /** Months with no order at all. */
  skip?: number[]
  /** Supplier price level for this object, against the company's usual price. */
  priceLevel: number
}

export const siteSeeds: SiteSeed[] = [
  { name: 'Sahil parkı', kind: 'Park', priceLevel: 1, profile: { 'Yaşıllıq': 2, 'Suvarma': 2, 'Fontan': 1, 'Təmizlik': 1, 'Geyim': 1, 'Usta': 1 } },
  { name: 'Dənizkənarı bulvar', kind: 'Bulvar', priceLevel: 1.02, profile: { 'Təmizlik': 2, 'Yaşıllıq': 2, 'Suvarma': 1, 'Fontan': 2, 'Elektrik': 1, 'Usta': 1, 'Geyim': 1 } },
  { name: 'Şəhər bağı', kind: 'Park', priceLevel: 0.98, profile: { 'Yaşıllıq': 2, 'Suvarma': 1, 'Təmizlik': 1, 'Geyim': 1 } },
  { name: 'Botanika bağı', kind: 'Park', priceLevel: 1, profile: { 'Yaşıllıq': 2, 'Suvarma': 2, 'Təmizlik': 1 } },
  { name: 'Gənclik meydanı', kind: 'Meydan', priceLevel: 1.04, profile: { 'Təmizlik': 2, 'Fontan': 2, 'Elektrik': 1, 'Yaşıllıq': 1 } },
  { name: 'Mərkəzi xiyaban', kind: 'Xiyaban', priceLevel: 1, profile: { 'Təmizlik': 1, 'Yaşıllıq': 1, 'Suvarma': 1, 'Elektrik': 1 } },
  { name: 'Mədəniyyət evi', kind: 'Bina', priceLevel: 1.03, profile: { 'Təmizlik': 2, 'Elektrik': 1, 'Ofis': 1, 'Məişət': 1, 'Usta': 1 } },
  { name: 'İdman kompleksi', kind: 'Bina', priceLevel: 1, profile: { 'Təmizlik': 2, 'Usta': 1, 'Geyim': 1, 'Məişət': 1 } },
  { name: 'Göl parkı', kind: 'Park', priceLevel: 0.97, from: 4, profile: { 'Yaşıllıq': 1, 'Fontan': 1, 'Suvarma': 1, 'Təmizlik': 1 } },
  { name: 'Şərq meydanı', kind: 'Meydan', priceLevel: 1.01, skip: [6], profile: { 'Təmizlik': 1, 'Fontan': 1, 'Yaşıllıq': 1 } },
  { name: 'Universitet şəhərciyi', kind: 'Şəhərcik', priceLevel: 1, from: 2, profile: { 'Təmizlik': 2, 'Yaşıllıq': 1, 'Ofis': 1 } },
  { name: 'Texniki baza', kind: 'Baza', priceLevel: 0.99, profile: { 'Usta': 2, 'Nəqliyyat': 2, 'Geyim': 2, 'Ofis': 1 } },
]

/** How a root category's demand moves through the year (index 0 = January). */
export const seasonality: Record<string, number[]> = {
  'Təmizlik': [1, 1, 1, 1, 1.05, 1.05, 1.1, 1.1, 1, 1, 1, 1],
  'Yaşıllıq': [0.4, 0.6, 1.3, 1.5, 1.3, 0.9, 0.8, 0.8, 1, 1.35, 0.7, 0.4],
  'Usta': [0.8, 0.9, 1.1, 1.2, 1.2, 1.1, 1, 1, 1.1, 1, 0.9, 0.8],
  'Geyim': [1.2, 0.8, 1, 1.4, 0.8, 0.8, 0.8, 0.8, 1, 1.3, 0.8, 0.8],
  'Suvarma': [0.1, 0.2, 0.6, 1.1, 1.5, 1.7, 1.7, 1.6, 1.2, 0.6, 0.2, 0.1],
  'Fontan': [0.2, 0.3, 0.8, 1.3, 1.5, 1.6, 1.6, 1.5, 1.2, 0.5, 0.2, 0.1],
  'Nəqliyyat': [1, 1, 1, 1.05, 1.1, 1.1, 1.1, 1.1, 1.05, 1.15, 1, 1],
  'Ofis': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'Elektrik': [1.3, 1.1, 0.9, 0.8, 0.7, 0.7, 0.7, 0.8, 1, 1.4, 1.5, 1.5],
  'Məişət': [1.5, 1, 0.3, 0, 0, 0, 0, 0, 0.2, 1.4, 1.5, 1.5],
}
