"""
The owner's workbook into the prototype (owner, 2026-10-28) — run by hand, and on the server behind the «Excel yüklə»
button (import_service.py).

Reads the workbook read-only: the «Aylıq» sheet and every sheet named after a month («Oktyabr», «Noyabr», …). «Əsas»
and any other sheet are not read: «Əsas» repeats January–September, and the program reads «Aylıq» only (70b74a6).
Columns are found by their headings, not by their place. The output is the prototype's own shape: objects, the
Ana → Orta → Alt tree, products, lines, the monthly orders (object × month) and the outside-monthly lines grouped the
same way.

Nothing is invented: the workbook has no order numbers, submission days or reasons, so those stay empty. Internal
supply from Qala Baza is free (D-45, D-46). A file that does not hang together is refused whole, with the rows to look
at — a row with no date, a date outside the year, a month in two sheets, a kind that is neither «Aylıq sifariş» nor
«Aylıqdan kənar», an empty object, category or name, a quantity or price that is not a number.

    python -I scripts/import_workbook.py <workbook.xlsx> <out.json>
"""
import collections
import datetime
import hashlib
import io
import json
import re
import sys
import unicodedata

import openpyxl

YEAR = 2026
MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
HEADINGS = {
    'ana kateqoriya': 'root', 'orta kateqoriya': 'mid', 'alt kateqoriya': 'leaf', 'malın adı': 'name', 'ölçü': 'size',
    'vahid': 'size_unit', 'model/kod': 'model', 'miqdarı': 'qty', 'ö/v': 'unit', 'qiyməti': 'price', 'cəmi': 'total',
    'şirkət': 'supplier', 'obyekt': 'site', 'tarix': 'date', 'cavabdeh şəxs': 'person',
}
REQUIRED = ['root', 'mid', 'leaf', 'name', 'qty', 'unit', 'price', 'total', 'supplier', 'site', 'date', 'person']
LABEL = {value: key for key, value in HEADINGS.items()}
KINDS = {'aylıq sifariş': 'monthly', 'aylıqdan kənar': 'outside'}
TRANSLIT = str.maketrans({'ə': 'e', 'ı': 'i', 'ö': 'o', 'ü': 'u', 'ç': 'c', 'ş': 's', 'ğ': 'g', 'İ': 'i', 'Ə': 'e',
                          'Ö': 'o', 'Ü': 'u', 'Ç': 'c', 'Ş': 's', 'Ğ': 'g'})


class WorkbookError(Exception):
    """The file is refused whole: `message` says why, `details` lists the rows to look at."""

    def __init__(self, message, details=()):
        super().__init__(message)
        self.message = message
        self.details = list(details)


def text(value):
    """A cell as the owner wrote it, without stray spaces: «Axundov » and «Axundov» are one object."""
    return ' '.join(unicodedata.normalize('NFC', str(value if value is not None else '')).split())


def fold(value):
    """For telling two spellings of one name apart from two names: case and spaces only."""
    return text(value).casefold().replace('i̇', 'i')


def slug(value):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', value.translate(TRANSLIT).lower()))


def number(value):
    if value is None or (isinstance(value, str) and not value.strip()):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    return float(str(value).replace(' ', '').replace(',', '.'))


def number_or_none(value):
    try:
        return number(value)
    except ValueError:
        return None


def spelling(values):
    """One display name for each name: the spelling the workbook uses most."""
    counts = collections.defaultdict(collections.Counter)
    for value in values:
        counts[fold(value)][text(value)] += 1
    return {k: c.most_common(1)[0][0] for k, c in counts.items()}


def read_rows(workbook):
    """The data rows of the sheets that hold orders, each with its sheet and row number; problems collected."""
    sheets = [ws for ws in workbook.worksheets if fold(ws.title) == 'aylıq' or fold(ws.title) in MONTHS]
    if not sheets:
        raise WorkbookError('Faylda «Aylıq» vərəqi və ay adlı vərəq (məsələn «Oktyabr») tapılmadı.',
                            [f'Vərəqlər: {", ".join(ws.title for ws in workbook.worksheets)}'])
    rows, problems, month_sheet = [], [], {}
    found = []
    for ws in sheets:
        values = list(ws.iter_rows(values_only=True))
        header_at = next((i for i, row in enumerate(values[:15]) if any(fold(c) == 'malın adı' for c in row)), None)
        col = None
        if header_at is not None:
            col = {HEADINGS[fold(c)]: j for j, c in enumerate(values[header_at]) if fold(c) in HEADINGS}
            missing = [LABEL[k] for k in REQUIRED if k not in col]
            if missing:
                problems.append(f'«{ws.title}»: bu sütunlar tapılmadı — {", ".join(missing)}.')
                continue
            col['kind'] = col['person'] + 1  # the kind has no heading: it is the column after «Cavabdeh şəxs»
        found.append((ws, values, header_at, col))
    # A month sheet without headings («Oktyabr» has none) is laid out as «Aylıq»; its rows are checked all the same.
    layout = next((col for ws, _, _, col in found if col and fold(ws.title) == 'aylıq'), None) or next((col for *_, col in found if col), None)
    for ws, values, header_at, col in found:
        if col is None:
            if layout is None:
                problems.append(f'«{ws.title}»: başlıq sətri («Malın adı» olan sətir) tapılmadı.')
                continue
            col = layout
        width = max(col.values()) + 1
        for index in range(0 if header_at is None else header_at + 1, len(values)):
            r = list(values[index]) + [None] * width
            where = f'«{ws.title}» {index + 1}-ci sətir'
            date = r[col['date']]
            content = any(text(r[col[k]]) for k in ('root', 'mid', 'leaf', 'name', 'site', 'qty', 'price'))
            if not isinstance(date, datetime.datetime):
                if content:
                    problems.append(f'{where}: «Tarix» boşdur və ya tarix deyil ({text(date) or "boş"}).')
                continue
            if date.year != YEAR:
                problems.append(f'{where}: tarix {YEAR}-ci ilə aid deyil ({date:%d.%m.%Y}).')
                continue
            other = month_sheet.setdefault(date.month, ws.title)
            if other != ws.title:
                problems.append(f'{MONTH_NAMES[date.month - 1]} həm «{other}», həm «{ws.title}» vərəqində var ({where}).')
                continue
            rows.append(dict(sheet=ws.title, row=index + 1, where=where, r=r, col=col, month=date.month))
    return sheets, rows, problems


def convert(source, display_name):
    """The workbook (a path or bytes) as the prototype's data, and a short report; WorkbookError if it does not hold."""
    raw = source if isinstance(source, (bytes, bytearray)) else open(source, 'rb').read()
    sha = hashlib.sha256(raw).hexdigest()
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception as error:  # not an xlsx, or a damaged one
        raise WorkbookError('Fayl oxunmadı: bu, düzgün .xlsx faylı deyil.', [str(error)[:200]]) from error

    sheets, rows, problems = read_rows(workbook)
    # «Cəmi» is a formula; Excel stores its result when it saves. A file saved by a tool that does not (or never opened
    # in Excel) has no results at all — and then «Qala Baza with an empty Cəmi» would make paid lines free.
    priced = [row for row in rows if number_or_none(row['r'][row['col']['price']]) and number_or_none(row['r'][row['col']['qty']])]
    unset = sum(1 for row in priced if row['r'][row['col']['total']] is None)
    if priced and unset > len(priced) / 2:
        raise WorkbookError('«Cəmi» sütununun hesablanmış dəyərləri faylda yoxdur. Faylı Excel-də açıb bir dəfə saxlayın və '
                            'yenidən yükləyin. Rəqəmlər dəyişmədi.', [f'{unset} sətirdə «Cəmi» boşdur.'])
    site_name = spelling(row['r'][row['col']['site']] for row in rows)
    cat_name = spelling(row['r'][row['col'][k]] for row in rows for k in ('root', 'mid', 'leaf'))

    sites, categories, products, lines = {}, {}, {}, []
    product_by_identity, first_of_display = {}, {}
    orders, outside = {}, {}
    free = missing_price = 0
    mismatch = []

    for row in rows:
        r, col, month, where = row['r'], row['col'], row['month'], row['where']
        kind = KINDS.get(fold(r[col['kind']]))
        if kind is None:
            problems.append(f'{where}: növ «{text(r[col["kind"]]) or "boş"}» — «Aylıq sifariş» və ya «Aylıqdan kənar» olmalıdır.')
            continue
        site_label = site_name.get(fold(r[col['site']]), '')
        root_label, mid_label, leaf_label = (cat_name.get(fold(r[col[k]]), '') for k in ('root', 'mid', 'leaf'))
        name = text(r[col['name']])
        empty = [label for label, value in (('Obyekt', site_label), ('Ana kateqoriya', root_label),
                                             ('Orta kateqoriya', mid_label), ('Alt kateqoriya', leaf_label), ('Malın adı', name)) if not value]
        if empty:
            problems.append(f'{where}: boşdur — {", ".join(empty)}.')
            continue
        try:
            qty, price, total = number(r[col['qty']]), number(r[col['price']]), number(r[col['total']])
        except ValueError:
            problems.append(f'{where}: «Miqdarı», «Qiyməti» və ya «Cəmi» rəqəm deyil.')
            continue

        site_id = slug(site_label)
        sites.setdefault(site_id, dict(id=site_id, name=site_label, kind=''))
        root_id = slug(root_label)
        mid_id = f'{root_id}--{slug(mid_label)}'
        leaf_id = f'{mid_id}--{slug(leaf_label)}'
        categories.setdefault(root_id, dict(id=root_id, name=root_label, level=1, parentId=None, path=[root_id]))
        categories.setdefault(mid_id, dict(id=mid_id, name=mid_label, level=2, parentId=root_id, path=[root_id, mid_id]))
        categories.setdefault(leaf_id, dict(id=leaf_id, name=leaf_label, level=3, parentId=mid_id, path=[root_id, mid_id, leaf_id]))

        # A product is its name with its size, under its sub-category; the model/code tells two apart only where the
        # name and the size are the same.
        size, size_unit = text(r[col['size']]) if 'size' in col else '', text(r[col['size_unit']]) if 'size_unit' in col else ''
        model = text(r[col['model']]) if 'model' in col else ''
        display = ' '.join(part for part in (name, size, size_unit) if part)
        identity = (leaf_id, fold(display), fold(model))
        product_id = product_by_identity.get(identity)
        if product_id is None:
            twin = first_of_display.setdefault((leaf_id, fold(display)), identity) != identity
            label = f'{display} ({model})' if twin and model else display
            base = slug(label) or 'mal'
            product_id, n = base, 1
            while product_id in products:
                n += 1
                product_id = f'{base}--{slug(leaf_label)}' if n == 2 else f'{base}--{slug(leaf_label)}-{n}'
            product_by_identity[identity] = product_id
            products[product_id] = dict(id=product_id, name=label, unit='', leafId=leaf_id, midId=mid_id, rootId=root_id, units=collections.Counter())

        unit = text(r[col['unit']]).lower()
        products[product_id]['units'][unit] += 1
        supplier = text(r[col['supplier']])
        # Internal supply from Qala Baza is free (D-45, D-46): the workbook leaves its «Cəmi» empty, the program
        # deleted its prices. Every other line is quantity × price, as in the program.
        if fold(supplier) == 'qala baza' and not total:
            price = 0.0
            free += 1
        elif not price:
            missing_price += 1
        amount = qty * price
        if abs(round(amount, 2) - round(total, 2)) > 0.011:
            mismatch.append(where)

        group = (site_id, month)
        if kind == 'monthly':
            order = orders.setdefault(group, dict(id=f'{site_id}-{month}', number='', siteId=site_id, month=month, submittedDay=0, lineIds=[]))
        else:
            order = outside.setdefault(group, dict(id=f'kenar-{site_id}-{month}', number='', siteId=site_id, month=month, day=0, reason='', lineIds=[]))
        line_id = f'{slug(row["sheet"])[:3]}-{row["row"]}'
        order['lineIds'].append(line_id)
        lines.append(dict(id=line_id, type=kind, orderId=order['id'], month=month, siteId=site_id, productId=product_id,
                          qty=qty, unit=unit, price=price, amount=amount, supplier=supplier))

    if problems:
        raise WorkbookError(f'Fayl qəbul edilmədi: {len(problems)} problem. Rəqəmlər dəyişmədi.', problems[:12])
    if not lines:
        raise WorkbookError('Faylda sifariş sətri tapılmadı. Rəqəmlər dəyişmədi.')

    for product in products.values():
        product['unit'] = product.pop('units').most_common(1)[0][0]

    months = collections.defaultdict(lambda: dict(monthly=0.0, outside=0.0))
    for line in lines:
        months[line['month']][line['type']] += line['amount']
    report = dict(
        file=display_name, sheets=[ws.title for ws in sheets], lines=len(lines), objects=len(sites), products=len(products),
        months={m: dict(monthly=round(v['monthly'], 2), outside=round(v['outside'], 2)) for m, v in sorted(months.items())},
        freeLines=free, missingPrice=missing_price, mismatchedTotals=len(mismatch), mismatchExamples=mismatch[:5],
    )
    data = dict(
        meta=dict(source=display_name, sha256=sha, sheets=report['sheets'], lines=len(lines), freeLines=free),
        sites=sorted(sites.values(), key=lambda s: s['name']),
        categories=list(categories.values()),
        products=list(products.values()),
        lines=lines,
        orders=list(orders.values()),
        outsideRequests=list(outside.values()),
    )
    return data, report


if __name__ == '__main__':
    source, target = sys.argv[1], sys.argv[2]
    try:
        data, report = convert(source, source.replace('\\', '/').split('/')[-1])
    except WorkbookError as error:
        print(error.message)
        for detail in error.details:
            print('  -', detail)
        sys.exit(1)
    with open(target, 'w', encoding='utf-8') as out:
        json.dump(data, out, ensure_ascii=False, separators=(',', ':'))
    print(f'sheets {report["sheets"]}: {report["lines"]} lines, {report["objects"]} objects, {report["products"]} products; '
          f'Qala Baza free {report["freeLines"]}, no price {report["missingPrice"]}, qty × price ≠ Cəmi {report["mismatchedTotals"]}')
    for month, figures in report['months'].items():
        print(f'  {month:2d}: aylıq {figures["monthly"]:12,.2f}  kənar {figures["outside"]:10,.2f}')
