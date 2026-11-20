"""
The historical workbook (2020–2024, from the warehouse) checked before any of it reaches the site — read-only: it
writes nothing but the report it is asked for.

    python -I scripts/check_history.py <tarixi.xlsx> [--current public/data/real-data.json] [--years 2020-2024] [--json report.json]

The workbook is read by import_workbook.convert, the very reader behind the «Excel yüklə» button: the same headings,
found by name (Ana/Orta/Alt kateqoriya, Malın adı, Miqdarı, Ö/V, Qiyməti, Cəmi, Şirkət, Obyekt, Tarix, Cavabdeh şəxs,
Sifariş növü), the same rules (a date in every row, from 2020 to next year; the kind «Aylıq sifariş» or «Aylıqdan
kənar»; object, categories and name filled in; quantity, price and Cəmi numbers). A file it refuses is refused here,
with the same rows to look at. Then what older years need besides (`history_report`, no Excel needed to test it):

- every row's year is one of the declared years (2020–2024 unless told otherwise): a 2025 row would count twice;
- no declared year is in the site's figures already, for the same reason;
- each year's months: with a monthly package, without one (the site shows those as «məlumat yoxdur», never 0), and
  outside-monthly lines in a month with no monthly package (the site reads them only within reporting months);
- the objects' names against the site's: a name the site does not know is listed, never matched to a similar one —
  the map's links (areaFinanceLinks.ts) and every comparison follow an object by its exact name;
- categories and companies new to the site, Qala Baza's free lines, rows whose quantity × price is not their «Cəmi»;
- approval: the workbook has no approval column, so this says so instead of guessing;
- each month's monthly and outside-monthly sums, to set against the workbook's own totals.

Exit 0: the file can be added (warnings are for the owner to look at); 1: it cannot, the problems are printed; 2: the
file or the current figures could not be read.
"""
import argparse
import collections
import json
import os
import sys

FIRST_HISTORY_YEAR, LAST_HISTORY_YEAR = 2020, 2024
LEGACY_YEAR = 2026  # a figures file from before years came in is 2026's alone (as import_workbook says)
MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CURRENT = os.path.join(HERE, '..', 'public', 'data', 'real-data.json')


def parse_years(text):
    """«2020-2024» or «2021,2023»: the years the file is meant to hold."""
    years = set()
    for part in text.split(','):
        part = part.strip()
        if '-' in part:
            first, last = (int(value) for value in part.split('-', 1))
            years.update(range(first, last + 1))
        elif part:
            years.add(int(part))
    if not years:
        raise ValueError('il göstərilməyib')
    return sorted(years)


def months_text(months):
    return ', '.join(MONTH_NAMES[month - 1] for month in sorted(months))


def year_of(line):
    return line.get('year') or LEGACY_YEAR


def history_report(history, current, years):
    """
    What the historical figures (import_workbook's output) would bring to the site's current ones: `errors` stop the
    file, `warnings` are for the owner to decide, `notes` are facts. `current` may be None (nothing to set it against).
    """
    years = sorted(years)
    errors, warnings, notes = [], [], []
    lines = history.get('lines', [])
    by_year = collections.Counter(year_of(line) for line in lines)

    stray = sorted(year for year in by_year if year not in years)
    if stray:
        counts = ', '.join(f'{year}: {by_year[year]} sətir' for year in stray)
        errors.append(f'Faylda {years[0]}–{years[-1]} illərindən kənar sətirlər var ({counts}). '
                      'Tarixi fayl yalnız bu illəri daşımalıdır, yoxsa eyni ay iki dəfə sayılar.')

    current_lines = (current or {}).get('lines', [])
    current_years = sorted({year_of(line) for line in current_lines})
    overlap = sorted(set(by_year) & set(current_years))
    if overlap:
        errors.append(f'{", ".join(map(str, overlap))} ili saytın rəqəmlərində artıq var: əlavə edilsə, iki dəfə sayılar.')

    monthly = collections.defaultdict(set)
    outside = collections.defaultdict(set)
    totals = collections.defaultdict(lambda: collections.defaultdict(lambda: {'monthly': 0.0, 'outside': 0.0}))
    for line in lines:
        year, month = year_of(line), line['month']
        (monthly if line['type'] == 'monthly' else outside)[year].add(month)
        totals[year][month][line['type']] += line['amount']

    coverage = {}
    for year in years:
        if not by_year.get(year):
            notes.append(f'{year}: faylda sətir yoxdur — saytda bu il göstərilməyəcək (məlumat yoxdur, 0 ₼ deyil).')
            coverage[year] = {'lines': 0, 'monthlyMonths': [], 'missingMonths': list(range(1, 13)), 'outsideOnlyMonths': []}
            continue
        missing = [month for month in range(1, 13) if month not in monthly[year]]
        outside_only = sorted(outside[year] - monthly[year])
        coverage[year] = {'lines': by_year[year], 'monthlyMonths': sorted(monthly[year]), 'missingMonths': missing,
                          'outsideOnlyMonths': outside_only}
        if not monthly[year]:
            warnings.append(f'{year}: aylıq sifariş yoxdur — il dövr seçimində olmayacaq; aylıqdan kənar sətirlər görünməyəcək.')
        elif missing:
            notes.append(f'{year}: aylıq sifarişi olmayan aylar — {months_text(missing)} (saytda «məlumat yoxdur»).')
        if monthly[year] and outside_only:
            warnings.append(f'{year}: {months_text(outside_only)} aylarında yalnız aylıqdan kənar sifariş var; '
                            'sayt onları aylıq paketi olan aylar daxilində oxuyur, ona görə görünməyəcək.')

    current_sites = {site['id']: site['name'] for site in (current or {}).get('sites', [])}
    history_sites = {site['id']: site['name'] for site in history.get('sites', [])}
    new_sites = sorted((name for site_id, name in history_sites.items() if site_id not in current_sites), key=str.casefold)
    if current is not None and new_sites:
        warnings.append(f'Saytda olmayan {len(new_sites)} obyekt adı: {", ".join(new_sites)}. Eyni obyektin fərqli yazılışıdırsa, '
                        'Excel-də cari adla düzəldin; yeni obyektdirsə, belə qalır (heç nə oxşar ada bağlanmır).')
    absent_sites = sorted((name for site_id, name in current_sites.items() if site_id not in history_sites), key=str.casefold)
    if current is not None and absent_sites:
        notes.append(f'Cari {len(absent_sites)} obyekt tarixi faylda yoxdur (o illərdə sifarişi olmayıb və ya başqa adla yazılıb): '
                     f'{", ".join(absent_sites)}.')

    current_roots = {category['id'] for category in (current or {}).get('categories', []) if category.get('level') == 1}
    new_roots = sorted({category['name'] for category in history.get('categories', [])
                        if category.get('level') == 1 and category['id'] not in current_roots})
    if current is not None and new_roots:
        warnings.append(f'Saytda olmayan ana kateqoriya: {", ".join(new_roots)}.')
    current_suppliers = {line.get('supplier', '').casefold() for line in current_lines}
    new_suppliers = sorted({line['supplier'] for line in lines if line.get('supplier') and line['supplier'].casefold() not in current_suppliers})
    if current is not None and new_suppliers:
        notes.append(f'Saytda olmayan {len(new_suppliers)} şirkət: {", ".join(new_suppliers[:15])}{" …" if len(new_suppliers) > 15 else ""}.')

    notes.append('Təsdiq: Excel-də təsdiq sütunu yoxdur. Hazırkı qayda ilə (proqram sentyabr 2026 daxil bütün ayları təsdiqləyib) '
                 'bu illərin ayları «Təsdiqlənib» görünəcək — sahib təsdiqləməlidir.')

    return {
        'years': years,
        'currentYears': current_years,
        'errors': errors,
        'warnings': warnings,
        'notes': notes,
        'coverage': coverage,
        'objects': {'inFile': len(history_sites), 'newToSite': new_sites},
        'totals': {
            str(year): {f'{year}-{month:02d}': {kind: round(value, 2) for kind, value in figures.items()}
                        for month, figures in sorted(months.items())}
            for year, months in sorted(totals.items())
        },
    }


def print_report(report, workbook_report=None):
    years = report['years']
    print(f'Tarixi fayl: {years[0]}–{years[-1]} illəri gözlənilir; saytda indi {", ".join(map(str, report["currentYears"])) or "heç bir il"} var.')
    if workbook_report:
        print(f'Oxundu: {workbook_report["lines"]} sətir, {workbook_report["objects"]} obyekt, {workbook_report["products"]} məhsul; '
              f'Qala Baza pulsuz {workbook_report["freeLines"]}, qiyməti boş {workbook_report["missingPrice"]}, '
              f'miqdar × qiymət ≠ Cəmi {workbook_report["mismatchedTotals"]}'
              + (f' (məsələn {", ".join(workbook_report["mismatchExamples"])})' if workbook_report['mismatchedTotals'] else ''))
    for title, items in (('QƏBUL EDİLMİR', report['errors']), ('Diqqət', report['warnings']), ('Qeyd', report['notes'])):
        for item in items:
            print(f'  [{title}] {item}')
    for year, months in report['totals'].items():
        total = sum(figures['monthly'] for figures in months.values())
        print(f'  {year}: aylıq cəmi {total:,.2f} ₼')
        for key, figures in months.items():
            print(f'    {key}: aylıq {figures["monthly"]:12,.2f}  kənar {figures["outside"]:10,.2f}')


def main(argv=None):
    parser = argparse.ArgumentParser(description='Tarixi (2020–2024) Excel faylını sayta əlavə etməzdən əvvəl yoxlayır; heç nə yazmır.')
    parser.add_argument('workbook')
    parser.add_argument('--current', help='saytın cari rəqəmləri (real-data.json); verilməzsə, prototipin öz faylı, varsa')
    parser.add_argument('--years', default=f'{FIRST_HISTORY_YEAR}-{LAST_HISTORY_YEAR}')
    parser.add_argument('--json', help='hesabatı bu fayla JSON kimi yazır')
    args = parser.parse_args(argv)
    # Azerbaijani letters on a Windows console or in a redirected file, as on the server.
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    sys.path.insert(0, HERE)
    from import_workbook import WorkbookError, convert  # needs openpyxl, as the upload does

    try:
        years = parse_years(args.years)
    except ValueError as error:
        print(f'--years oxunmadı: {error}')
        return 2
    current_path = args.current or (DEFAULT_CURRENT if os.path.exists(DEFAULT_CURRENT) else None)
    current = None
    if current_path:
        try:
            with open(current_path, encoding='utf-8') as source:
                current = json.load(source)
        except (OSError, ValueError) as error:
            print(f'Cari rəqəmlər oxunmadı ({current_path}): {error}')
            return 2
    try:
        history, workbook_report = convert(args.workbook, os.path.basename(args.workbook))
    except WorkbookError as error:
        print(error.message)
        for detail in error.details:
            print('  -', detail)
        return 1
    except OSError as error:
        print(f'Fayl oxunmadı: {error}')
        return 2

    report = history_report(history, current, years)
    report['workbook'] = {key: workbook_report[key] for key in ('file', 'sheets', 'lines', 'objects', 'products', 'years', 'freeLines',
                                                                   'missingPrice', 'mismatchedTotals', 'mismatchExamples')}
    print_report(report, workbook_report)
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as out:
            json.dump(report, out, ensure_ascii=False, indent=2)
    return 1 if report['errors'] else 0


if __name__ == '__main__':
    sys.exit(main())
