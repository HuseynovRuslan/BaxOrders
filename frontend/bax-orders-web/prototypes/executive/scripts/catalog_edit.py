"""
Edits the owner makes on the site itself (owner, 2026-10-28, «Mallar»): a product's price from a month on, a new
product (and, if wanted, its first order line), a product's name or category, a product taken out. Each works on the
figures as they stand and returns the new figures with a short account of what it did, for the «Yoxla» step to show;
nothing is written here (import_service.py writes, with the history and the undo).

A price changes the order lines of that product from the chosen month on, in one unit — a pair and a box are never
priced alike; internal supply from Qala Baza stays free (D-45, D-46).
"""
import copy
import math

from import_workbook import MONTH_NAMES, fold, slug, text

FREE_SUPPLIER = 'qala baza'


class EditError(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


def need(condition, message):
    if not condition:
        raise EditError(message)


def az_money(value):
    """«1.234,50 ₼», as the site writes money."""
    whole, cents = f'{abs(value):,.2f}'.split('.')
    return f'{"−" if value < 0 else ""}{whole.replace(",", ".")},{cents} ₼'


def az_number(value):
    return f'{value:,.3f}'.rstrip('0').rstrip('.').replace(',', ' ').replace('.', ',').replace(' ', '.')


def amount_of(value, field, low=0.0, high=10_000_000.0):
    try:
        number = float(str(value).replace(',', '.'))
    except (TypeError, ValueError):
        raise EditError(f'{field} rəqəm olmalıdır.')
    need(math.isfinite(number) and low <= number <= high, f'{field} {az_number(low)} ilə {az_number(high)} arasında olmalıdır.')
    return number


def month_of(value):
    try:
        month = int(value)
    except (TypeError, ValueError):
        raise EditError('Ay seçilməyib.')
    need(1 <= month <= 12, 'Ay 1 ilə 12 arasında olmalıdır.')
    return month


def path_of(categories, leaf_id):
    leaf = categories[leaf_id]
    return ' › '.join(categories[node]['name'] for node in leaf['path'])


def apply_edit(current, edit):
    """The figures after one edit, and what it did in a few plain sentences; EditError if it cannot be done."""
    data = copy.deepcopy(current)
    need(isinstance(edit, dict), 'Sorğu oxunmadı.')
    op = edit.get('op')
    products = {product['id']: product for product in data['products']}
    categories = {category['id']: category for category in data['categories']}
    sites = {site['id']: site for site in data['sites']}

    def product_of():
        product = products.get(edit.get('productId'))
        need(product is not None, 'Mal tapılmadı. Səhifəni yeniləyin.')
        return product

    def leaf_of(leaf_id):
        leaf = categories.get(leaf_id)
        need(leaf is not None and leaf['level'] == 3, 'Alt kateqoriya seçilməyib.')
        return leaf

    def unique_name(name, leaf_id, except_id=None):
        clash = any(fold(p['name']) == fold(name) and p['leafId'] == leaf_id and p['id'] != except_id for p in products.values())
        need(not clash, f'«{name}» adlı mal bu alt kateqoriyada artıq var.')

    if op == 'price':
        product = product_of()
        price = amount_of(edit.get('price'), 'Qiymət')
        start = month_of(edit.get('fromMonth', 1))
        unit = text(edit.get('unit')).lower() or None
        lines = [line for line in data['lines'] if line['productId'] == product['id'] and line['month'] >= start]
        free = [line for line in lines if fold(line['supplier']) == FREE_SUPPLIER and not line['price']]
        free_ids = {line['id'] for line in free}
        paid = [line for line in lines if line['id'] not in free_ids]
        units = sorted({line['unit'] for line in paid})
        if unit is None and len(units) > 1:
            raise EditError(f'Bu malın sətirləri fərqli vahidlərdədir ({", ".join(units)}): qiymətin hansı vahidə aid olduğunu seçin.')
        if unit is not None:
            paid = [line for line in paid if line['unit'] == unit]
            free = [line for line in free if line['unit'] == unit]
        unit = unit or (units[0] if units else product['unit'])
        for line in paid:
            line['price'] = price
            line['amount'] = line['qty'] * price
        product['price'] = price
        summary = [f'«{product["name"]}»: yeni qiymət {az_money(price)} / {unit}, {MONTH_NAMES[start - 1]} ayından etibarən.']
        summary.append(f'{len(paid)} sifariş sətri yeni qiymətlə hesablanır.' if paid
                       else f'{MONTH_NAMES[start - 1]} ayından sonra bu malın {unit} ilə sifariş sətri yoxdur: qiymət yalnız siyahıda yazılır.')
        if free:
            summary.append(f'Qala Bazadan {len(free)} pulsuz daxili təchizat sətri pulsuz qalır.')

    elif op == 'add':
        name = text(edit.get('name'))
        need(name, 'Malın adı yazılmayıb.')
        need(len(name) <= 200, 'Malın adı çox uzundur.')
        leaf = leaf_of(edit.get('leafId'))
        unit = text(edit.get('unit')).lower()
        need(unit, 'Vahid yazılmayıb (məsələn: ədəd, kq, litr).')
        price = amount_of(edit.get('price'), 'Qiymət')
        unique_name(name, leaf['id'])
        base = slug(name) or 'mal'
        product_id, n = base, 1
        while product_id in products:
            n += 1
            product_id = f'{base}-{n}'
        product = dict(id=product_id, name=name, unit=unit, leafId=leaf['id'], midId=leaf['parentId'],
                       rootId=categories[leaf['parentId']]['parentId'], price=price)
        data['products'].append(product)
        products[product_id] = product
        summary = [f'Yeni mal: «{name}» — {path_of(categories, leaf["id"])}, {az_money(price)} / {unit}.']
        line = edit.get('line')
        if line:
            site = sites.get(line.get('siteId'))
            need(site is not None, 'Obyekt seçilməyib.')
            month = month_of(line.get('month'))
            qty = amount_of(line.get('qty'), 'Miqdar', 0.001)
            kind = line.get('kind')
            need(kind in ('monthly', 'outside'), 'Sifarişin növü seçilməyib.')
            taken = {item['id'] for item in data['lines']}
            n = 1
            while f'sayt-{n}' in taken:
                n += 1
            line_id = f'sayt-{n}'
            if kind == 'monthly':
                group_id = f'{site["id"]}-{month}'
                groups = data['orders']
                fresh = dict(id=group_id, number='', siteId=site['id'], month=month, submittedDay=0, lineIds=[])
            else:
                group_id = f'kenar-{site["id"]}-{month}'
                groups = data['outsideRequests']
                fresh = dict(id=group_id, number='', siteId=site['id'], month=month, day=0, reason='', lineIds=[])
            group = next((item for item in groups if item['id'] == group_id), None)
            if group is None:
                groups.append(fresh)
                group = fresh
            group['lineIds'].append(line_id)
            data['lines'].append(dict(id=line_id, type=kind, orderId=group_id, month=month, siteId=site['id'],
                                      productId=product_id, qty=qty, unit=unit, price=price, amount=qty * price, supplier=''))
            summary.append(f'Sifariş sətri: {site["name"]}, {MONTH_NAMES[month - 1]}, '
                           f'{"aylıq" if kind == "monthly" else "aylıqdan kənar"} — {az_number(qty)} {unit} × {az_money(price)} = {az_money(qty * price)}.')
        else:
            summary.append('Sifariş sətri əlavə olunmur: mal yalnız siyahıya düşür, rəqəmlər dəyişmir.')

    elif op == 'edit':
        product = product_of()
        name = text(edit.get('name')) or product['name']
        need(len(name) <= 200, 'Malın adı çox uzundur.')
        leaf = leaf_of(edit.get('leafId') or product['leafId'])
        renamed, moved = name != product['name'], leaf['id'] != product['leafId']
        need(renamed or moved, 'Heç nə dəyişməyib: yeni ad və ya başqa kateqoriya seçin.')
        unique_name(name, leaf['id'], product['id'])
        summary = []
        if renamed:
            summary.append(f'Ad: «{product["name"]}» → «{name}».')
        if moved:
            lines = [line for line in data['lines'] if line['productId'] == product['id']]
            summary.append(f'Kateqoriya: {path_of(categories, product["leafId"])} → {path_of(categories, leaf["id"])}.')
            summary.append(f'{len(lines)} sifariş sətri, {az_money(sum(line["amount"] for line in lines))}, yeni kateqoriyaya keçir.'
                           if lines else 'Sifariş sətri yoxdur: yalnız siyahıda kateqoriya dəyişir.')
        product.update(name=name, leafId=leaf['id'], midId=leaf['parentId'], rootId=categories[leaf['parentId']]['parentId'])

    elif op == 'delete':
        product = product_of()
        lines = [line for line in data['lines'] if line['productId'] == product['id']]
        ids = {line['id'] for line in lines}
        data['lines'] = [line for line in data['lines'] if line['productId'] != product['id']]
        for key in ('orders', 'outsideRequests'):
            for group in data[key]:
                group['lineIds'] = [line_id for line_id in group['lineIds'] if line_id not in ids]
            data[key] = [group for group in data[key] if group['lineIds']]
        data['products'] = [item for item in data['products'] if item['id'] != product['id']]
        summary = [f'«{product["name"]}» silinir: {len(lines)} sifariş sətri, {az_money(sum(line["amount"] for line in lines))}.'
                   if lines else f'«{product["name"]}» silinir: sifariş sətri yoxdur, rəqəmlər dəyişmir.']

    else:
        raise EditError('Naməlum əməliyyat.')

    data['meta']['lines'] = len(data['lines'])
    return data, summary
