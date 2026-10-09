# Sifariş kitabının şablonu

Obyektlərin dolduracağı Excel faylını yaradır. Fayl kataloqu **özündə daşıyır**: məhsul, obyekt, şirkət,
cavabdeh şəxs, vahid və növ siyahıdan seçilir, əldən yazılan dəyər Excel tərəfindən rədd edilir.

## Niyə lazımdır

2026 oktyabr uzlaşdırması göstərdi ki adların əldən yazılması bir mala bir vərəqdə bir neçə ad verir —
`Xlor Toz 90% qranul` 25 sətirdə, `Xlor toz qranul 90% Pooltech` 9 sətirdə, `Xlor toz qranul 90%` 7 sətirdə;
on məhsulda eyni vəziyyət. Hər yazılışı idxal zamanı əl ilə tanıtmaq lazım gəlir və səhv tanıdılsa bir mal
kataloqda iki dəfə yaranır, ondan sonra heç bir hesabat onu toplaya bilmir. Şablon problemi **mənbədə**
kəsir: 2026-10-09 qərarı D-43.

## Necə yaradılır

İki addım. Birincisi kataloqu bazadan ixrac edir, ikincisi faylı qurur.

```bash
# 1. Kataloqu ixrac et (serverdə, baza konteynerində)
scp -i ~/.ssh/qrlog_vps_l tools/workbook-template/export-reference.sql deploy@94.20.153.137:/tmp/
ssh -i ~/.ssh/qrlog_vps_l deploy@94.20.153.137 \
  'docker cp /tmp/export-reference.sql baxorders-db-1:/tmp/ && \
   docker exec -u postgres baxorders-db-1 psql -v ON_ERROR_STOP=1 -q -d baxorders -f /tmp/export-reference.sql && \
   for f in prod loc sup resp unit; do docker cp baxorders-db-1:/tmp/ref-$f.csv /tmp/; done'
for f in prod loc sup resp unit; do
  scp -i ~/.ssh/qrlog_vps_l "deploy@94.20.153.137:/tmp/ref-$f.csv" ./ref/
done

# 2. Faylı qur
python tools/workbook-template/build_template.py ./ref AI_WORKFLOW/workbooks/template/BaxOrders-sifaris-sablonu.xlsx
```

Yaradılan `.xlsx` git-ə düşmür (`.gitignore`) — içində şirkətin kataloqu var və onsuz da bu skriptdən
yenidən yaradıla bilər.

## Faylın quruluşu

| vərəq | nədir |
|---|---|
| `Aylıq` | doldurulan cədvəl. **Ad məcburidir** — idxal yalnız bu adda vərəqi oxuyur |
| `Kataloq` | siyahıların mənbəyi; açıq saxlanılır ki mala baxmaq mümkün olsun |
| `Təlimat` | qaydalar və yükləmə addımları |

`Aylıq` vərəqində başlıqlar **3-cü sətirdədir** və `ImportHeaders.ExpectedHeaders` ilə hərfi hərfinə üst-üstə
düşür. İdxal sütunu adına görə tanıyır, yerinə görə yox, amma adı dəyişsə tanımaz.

| sütun | necə doldurulur |
|---|---|
| `№` | əl ilə, ardıcıl nömrə |
| `Ana / Orta / Alt kateqoriya` | **düstur** — məhsuldan özü gəlir, kilidlidir |
| `Malın adı` | siyahıdan (1090 aktiv məhsul) |
| `Ölçü`, `Model/Kod` | əl ilə, sərbəst |
| `Vahid`, `Ö/v` | siyahıdan (vahidin tam adı: `Ədəd`, `Kiloqram`, …) |
| `Miqdarı` | rəqəm, sıfırdan böyük |
| `Qiyməti` | rəqəm və ya boş (daxili təminat) |
| `Cəmi` | **düstur** = miqdar × qiymət, kilidlidir |
| `Şirkət`, `Obyekt`, `Cavabdeh şəxs` | siyahıdan |
| `Tarix` | tarix; sifarişin aid olduğu **ay** əhəmiyyətlidir |
| `Növ` | `Aylıq sifariş` / `Aylıqdan kənar` |

Vərəq qorunur: yalnız doldurulan xanalar açıqdır, düsturlar kilidlidir. Parol yoxdur — quruluşu dəyişmək
lazım olsa qorunma sadəcə söndürülür.

Hər yoxlama `errorStyle = stop` ilə qurulub: səhv dəyər **rədd edilir**, xəbərdarlıqla keçmir.

## Vahidlər haqqında

Siyahı vahidin **tam adını** verir (`Kiloqram`, `Ədəd`, `Metr`). İdxal vahidi kodu, adı, simvolu və ya
qeydiyyatdan keçmiş aliası ilə tanıyır (`ImportCatalogLoader.AddUnit`), ona görə `Kiloqram` da `kq` kimi
həll olunur, amma siyahıda daha aydın oxunur.

## Siyahı köhnələndə

Siyahılar faylın yaradıldığı günə olan kataloqdur. Kataloqa yeni məhsul, obyekt, şirkət ya da cavabdeh şəxs
əlavə olunanda şablonu yenidən qurun — bir əmrdir. Deaktiv edilmiş məhsul siyahıya düşmür; köhnə adların nə
demək olduğu `ProductAliases`-də saxlanılır və idxal köhnə kitab gələndə onu özü həll edir.
