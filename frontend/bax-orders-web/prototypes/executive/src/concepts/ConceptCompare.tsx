import { Link, useLocation } from 'react-router'
import { ThemeToggle, useThemeChoice } from '../ui/theme'

/**
 * The three concepts side by side: a desktop screenshot of each (in the theme the reader has chosen), what each is for,
 * what it costs, and the recommendation. Every screenshot opens the working concept.
 */
const concepts = [
  {
    id: 'a',
    name: 'A — Executive Minimal',
    idea: 'Rəqəm birinci: ümumi məbləğ, yanında üç əsas fakt, 12 ay isə iki sətirlik rəqəm cədvəlində.',
    strong: 'Hər ayın məbləği, fərqi və statusu hover olmadan, birbaşa görünür. Öyrənmək tələb etmir.',
    cost: 'İlin gedişatı qrafikdəki kimi bir baxışda görünmür: ayları müqayisə etmək üçün göz rəqəmlər arasında gəzir.',
  },
  {
    id: 'b',
    name: 'B — Premium Editorial',
    idea: 'İllik hesabatın ilk səhifəsi: böyük rəqəm, rəqəmlərdən yazılmış qısa xülasə, qəpiyədək dəqiq aylıq cədvəl.',
    strong: 'Ən fərqli, ən «premium» görünüş. Mühasib dəqiqliyi var, təqdimata və çapa hazırdır.',
    cost: 'Cədvəli oxumaq lazımdır: ilin gedişatı və ayların müqayisəsi qrafikdəki qədər tez görünmür.',
  },
  {
    id: 'c',
    name: 'C — Modern Analytics',
    idea: 'Analitik qrafik: dəyər oxu, hər sütunda müqayisə səviyyəsi işarəsi və il boyu təsdiq zolağı.',
    strong: '«Adi aydan çox, yoxsa az?» sualına oxumadan cavab verir. Təsdiq vəziyyəti bir xətdə görünür.',
    cost: 'Ən sıx konseptdir: qrafikin işarəsini ilk dəfə bir dəfə başa düşmək lazımdır.',
  },
] as const

export function ConceptCompare() {
  const { search } = useLocation()
  const [theme] = useThemeChoice()
  return (
    <div className="min-h-dvh bg-stone text-ink">
      <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h1 id="page-title" tabIndex={-1} className="font-figure text-[34px] font-semibold leading-tight outline-none">İllik icmal: 3 vizual konsept</h1>
            <p className="mt-2 text-ink-2">
              Üçü də eyni demo məlumatla işləyir və eyni funksiyaları göstərir: 12 ay, ümumi məbləğ, sifariş növü, müqayisə dövrü,
              hər ayın fərqi, aylıq sifarişlərin təsdiqi, aya keçid, açıq və tünd mövzu. Şəkilə klikləyin, işləyən konsept açılır.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <section aria-labelledby="advice" className="mt-6 rounded-lg border border-sea/40 bg-sea-soft/60 px-5 py-4">
          <h2 id="advice" className="font-semibold text-sea-2">Tövsiyə: C — Modern Analytics</h2>
          <p className="mt-1 max-w-4xl text-ink-2">
            Rəhbərin üç sualına — «il necə gedir», «bu ay adi aydan çox, yoxsa az» və «nə təsdiq gözləyir» — C oxumadan, bir
            baxışda cavab verir. Müqayisə işarəsi faizi şəklə çevirir, təsdiq zolağı statusu bir xəttə yığır. Üstəlik mövcud ekranın
            sütun modelinə ən yaxın konseptdir, ona görə əsas tətbiqə köçürmək ən az risklidir. B-dən rəqəmlərdən yazılan
            qısa xülasə cümləsini C-yə əlavə etmək olar.
          </p>
        </section>

        <ol className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {concepts.map((concept) => (
            <li key={concept.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper">
              <Link to={`/konsept/${concept.id}${search}`} className="group block border-b border-line">
                <img
                  src={`${import.meta.env.BASE_URL}shots/konsept-${concept.id}-${theme}.png`}
                  alt={`${concept.name}: masaüstü ekran şəkli`}
                  width={1440}
                  height={900}
                  className="block aspect-[16/10] w-full object-cover object-top transition-opacity group-hover:opacity-90"
                />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="text-lg font-semibold">{concept.name}</h2>
                <p className="text-ink-2">{concept.idea}</p>
                <dl className="flex flex-col gap-2 text-sm">
                  <div><dt className="font-semibold text-down">Güclü tərəfi</dt><dd className="text-ink-2">{concept.strong}</dd></div>
                  <div><dt className="font-semibold text-amber">Nəyə görə diqqət</dt><dd className="text-ink-2">{concept.cost}</dd></div>
                </dl>
                <Link
                  to={`/konsept/${concept.id}${search}`}
                  className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md border border-line-2 px-4 text-sm font-semibold hover:bg-stone"
                >
                  Konsepti aç
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
