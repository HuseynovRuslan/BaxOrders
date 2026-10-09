# Sifariş kitabının şablonu

Obyektlərin dolduracağı Excel faylını yaradır. Malın **heç bir xüsusiyyəti yazılmır**: bir siyahıdan variant
seçilir, ad / ölçü / vahid / model / ö-v özü dolur.

## Niyə lazımdır

2026 oktyabr uzlaşdırması göstərdi ki əldən yazmaq bir mala bir vərəqdə bir neçə kimlik verir:
`Xlor Toz 90% qranul` 25 sətirdə, `Xlor toz qranul 90% Pooltech` 9 sətirdə, `Xlor toz qranul 90%` 7 sətirdə;
ölçü gah `115`, gah `115x10x22,23`; model gah `Emaf A300`, gah `EMAF A 300`. Hər yazılışı idxal zamanı əl ilə
tanıtmaq lazım gəlir, səhv tanıdılsa bir mal kataloqda iki dəfə yaranır və hesabatlar onu toplaya bilmir.
Şablon problemi **mənbədə** kəsir — qərarlar D-43 və D-44.

## Necə yaradılır

```bash
# 1. Kataloqu bazadan ixrac et
scp -i ~/.ssh/qrlog_vps_l tools/workbook-template/export-reference.sql deploy@94.20.153.137:/tmp/
ssh -i ~/.ssh/qrlog_vps_l deploy@94.20.153.137 \
  'docker cp /tmp/export-reference.sql baxorders-db-1:/tmp/ && \
   docker exec -u postgres baxorders-db-1 psql -v ON_ERROR_STOP=1 -q -d baxorders -f /tmp/export-reference.sql && \
   for f in variant loc sup resp; do docker cp baxorders-db-1:/tmp/ref-$f.csv /tmp/; done'
mkdir -p ref
for f in variant loc sup resp; do
  scp -i ~/.ssh/qrlog_vps_l "deploy@94.20.153.137:/tmp/ref-$f.csv" ./ref/
done

# 2. Faylı qur
python tools/workbook-template/build_template.py ./ref AI_WORKFLOW/workbooks/template/BaxOrders-sifaris-sablonu.xlsx
```

Yaradılan `.xlsx` git-ə düşmür (`.gitignore`) — içində şirkətin kataloqu var və bu skriptdən yenidən
yaradıla bilər.

## Faylın quruluşu

| vərəq | nədir |
|---|---|
| `Aylıq` | doldurulan cədvəl. **Ad məcburidir** — idxal yalnız bu adda vərəqi oxuyur |
| `Kataloq` | siyahıların mənbəyi: variantlar və onların sütun dəyərləri |
| `Təlimat` | qaydalar və yükləmə addımları |

### Anbardar nə görür

| sütun | necə doldurulur |
|---|---|
| `№` | **avtomatik** — mal seçiləndə düşür |
| `Mal seçimi` | **siyahıdan** — 1368 variant, məsələn `Laqonda daşı almaz · 115 MM · Staunch · Ədəd` |
| `Miqdarı` | rəqəm, sıfırdan böyük |
| `Qiyməti` | rəqəm və ya boş (daxili təminat) |
| `Cəmi` | **avtomatik** = miqdar × qiymət |
| `Şirkət`, `Obyekt`, `Cavabdeh şəxs`, `Növ` | siyahıdan |
| `Tarix` | tarix; sifarişin aid olduğu **ay** əhəmiyyətlidir |

### Gizli sütunlar

`Malın adı`, `Ölçü`, `Vahid`, `Model/Kod`, `Ö/v` — **idxalın oxuduğu sütunlar budur.** Hamısı `Mal seçimi`
sətrindən `VLOOKUP` ilə dolur və gizlədilib: seçilən sətir onsuz da hamısını göstərir, təkrar göstərmək
cədvəli lazımsız genişləndirirdi. Vərəq qorunduğu üçün üzərinə yazıla bilməz.

`Mal seçimi` sütununun adı `ImportHeaders.ExpectedHeaders`-də yoxdur, ona görə idxal onu **görməzdən gəlir**
(tanınmayan başlıq heç vaxt təxmin edilmir).

`Ana/Orta/Alt kateqoriya` sütunları yoxdur: onlar məcburi deyil və kateqoriya malın kataloqdakı
xüsusiyyətidir — sistem onu məhsuldan özü bilir.

## Yoxlamalar

Hər qayda `errorStyle = stop` ilə qurulub: səhv dəyər **rədd edilir**, xəbərdarlıqla keçmir.

| sahə | qayda |
|---|---|
| Mal seçimi, Şirkət, Obyekt, Cavabdeh şəxs, Növ | yalnız siyahıdan |
| Miqdarı | rəqəm > 0 |
| Qiyməti | rəqəm ≥ 0 və ya boş |
| Tarix | tarix |

Vərəq parolsuz qorunur — quruluşu dəyişmək lazım olsa qorunma sadəcə söndürülür.

## Vahidlər haqqında

Gizli `Vahid` və `Ö/v` sütunları vahidin **tam adını** yazır (`Millimetr`, `Ədəd`). İdxal vahidi kodu, adı,
simvolu və ya aliası ilə tanıyır (`ImportCatalogLoader.AddUnit`), ona görə `Millimetr` də `mm` kimi həll
olunur. Siyahıdakı qısa yazılış (`115 MM`) yalnız oxunaqlıq üçündür.

Variantın ölçü vahidi yoxdursa, onun yerində **təsvir** ola bilər (`16 lik`, `28 diş`). Bu halda `Vahid`
sütununa təsvir yazılır — idxal `Vahid` sütunundaki qeyri-vahid sözü məhz təsvir kimi oxuyur.

## Siyahı köhnələndə

Siyahılar faylın yaradıldığı günə olan kataloqdur. Kataloqa yeni mal, **yeni ölçü**, obyekt, şirkət ya da
cavabdeh şəxs əlavə olunanda şablonu yenidən qurun — bir əmrdir.

Siyahıda olmayan mal və ya ölçü sifariş edilə bilmir. Bu qəsdəndir: yeni variant kataloq qərarıdır.
Deaktiv edilmiş məhsul siyahıya düşmür; köhnə adların nə demək olduğu `ProductAliases`-də saxlanılır və
idxal köhnə kitab gələndə onu özü həll edir.
