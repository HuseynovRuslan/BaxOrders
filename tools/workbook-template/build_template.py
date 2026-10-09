"""Build the order workbook the objects fill in, with the catalogue built into it as dropdowns.

Why this exists. Every name in the workbook used to be typed by hand, and the reconciliation of October 2026
showed what that costs: one article written «Xlor Toz 90% qranul» on 25 rows, «Xlor toz qranul 90% Pooltech»
on 9 and «Xlor toz qranul 90%» on 7, and the same for nine other articles. Each spelling then has to be
recognised by hand at import time, and a wrong guess puts one article in the catalogue twice, after which no
report can add it up. A dropdown sourced from the catalogue removes the whole class of problem at the source
rather than cleaning up after it.

What the file enforces. «Malın adı», «Obyekt», «Şirkət», «Cavabdeh şəxs», «Vahid», «Ö/v» and «Növ» accept
only a value from the catalogue: Excel refuses anything else outright rather than warning. «Miqdarı» and
«Qiyməti» accept only numbers, «Tarix» only a date. The three category columns and «Cəmi» are formulas and
the sheet is protected so they cannot be typed over - a product's category is a fact of the catalogue, not
something to restate.

What it cannot do. The lists are a snapshot of the catalogue on the day the file is built. A product that
does not exist yet cannot be ordered through this template, which is the point: a new product is a catalogue
decision, so it is added to the catalogue first and the template rebuilt. Rebuild it whenever the catalogue
changes - it takes one command.

Usage:
    python build_template.py <reference-csv-dir> <output.xlsx>
"""
import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

SHEET = "Aylıq"          # ImportSheets.Authoritative - the import reads this sheet and no other
REFERENCE = "Kataloq"
GUIDE = "Təlimat"
HEADER_ROW = 3
FIRST_ROW = HEADER_ROW + 1
LAST_ROW = 1003

# Exactly the headers ImportHeaders.ExpectedHeaders declares. The import finds the row by these names, so
# they must match character for character; «*» marks the five ImportHeaders.RequiredFields.
COLUMNS = [
    ("№", 8, "manual"),
    ("Ana kateqoriya", 22, "formula"),
    ("Orta kateqoriya", 24, "formula"),
    ("Alt kateqoriya", 24, "formula"),
    ("Malın adı", 42, "product"),
    ("Ölçü", 12, "manual"),
    ("Vahid", 12, "unit"),
    ("Model/Kod", 18, "manual"),
    ("Miqdarı", 10, "quantity"),
    ("Ö/v", 12, "unit"),
    ("Qiyməti", 12, "money"),
    ("Cəmi", 12, "formula"),
    ("Şirkət", 28, "supplier"),
    ("Obyekt", 26, "location"),
    ("Tarix", 12, "date"),
    ("Cavabdeh şəxs", 22, "responsible"),
    ("Növ", 16, "linetype"),
]
REQUIRED = {"Malın adı", "Miqdarı", "Ö/v", "Obyekt", "Tarix"}
LINE_TYPES = ["Aylıq sifariş", "Aylıqdan kənar"]

HEAD_FILL = PatternFill("solid", fgColor="1F3864")
REQ_FILL = PatternFill("solid", fgColor="2E5C9A")
AUTO_FILL = PatternFill("solid", fgColor="EFEFEF")
THIN = Side(style="thin", color="BFBFBF")


def read_column(path, index=0):
    with open(path, encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    return [r[index] for r in rows[1:] if r and r[index].strip()]


def read_products(path):
    with open(path, encoding="utf-8-sig") as fh:
        return [(r["product"], r["ana"], r["orta"], r["alt"])
                for r in csv.DictReader(fh) if r["product"].strip()]


def build(reference_dir, out_path):
    ref = Path(reference_dir)
    products = read_products(ref / "ref-prod.csv")
    locations = read_column(ref / "ref-loc.csv")
    suppliers = read_column(ref / "ref-sup.csv")
    responsible = read_column(ref / "ref-resp.csv")
    units = read_column(ref / "ref-unit.csv")

    wb = Workbook()
    ws = wb.active
    ws.title = SHEET
    cat = wb.create_sheet(REFERENCE)
    guide = wb.create_sheet(GUIDE)

    # ---------------------------------------------------------------- the lists the dropdowns read
    cat["A1"], cat["B1"], cat["C1"], cat["D1"] = "Məhsul", "Ana kateqoriya", "Orta kateqoriya", "Alt kateqoriya"
    for i, (name, ana, orta, alt) in enumerate(products, start=2):
        cat.cell(i, 1, name)
        cat.cell(i, 2, ana)
        cat.cell(i, 3, orta)
        cat.cell(i, 4, alt)

    lists = {}
    for column, title, values in (
        (6, "Obyekt", locations), (8, "Şirkət", suppliers), (10, "Cavabdeh şəxs", responsible),
        (12, "Vahid", units), (14, "Növ", LINE_TYPES),
    ):
        cat.cell(1, column, title).font = Font(bold=True)
        for i, value in enumerate(values, start=2):
            cat.cell(i, column, value)
        letter = get_column_letter(column)
        lists[title] = f"={REFERENCE}!${letter}$2:${letter}${len(values) + 1}"
    lists["Məhsul"] = f"={REFERENCE}!$A$2:$A${len(products) + 1}"
    for letter, width in (("A", 44), ("B", 20), ("C", 22), ("D", 22), ("F", 26), ("H", 28), ("J", 22),
                          ("L", 14), ("N", 16)):
        cat.column_dimensions[letter].width = width
    for c in ("A1", "B1", "C1", "D1"):
        cat[c].font = Font(bold=True)
    cat.sheet_state = "visible"      # left visible on purpose: people want to look the catalogue up

    # ---------------------------------------------------------------- the entry sheet
    ws["A1"] = "BAX Orders — aylıq sifariş cədvəli"
    ws["A1"].font = Font(bold=True, size=14, color="1F3864")
    ws["A2"] = ("Rəngli sütunlar MƏCBURİDİR. Boz sütunlar özü hesablanır — onlara yazmayın. "
                "Adları siyahıdan seçin; əldən yazılan ad qəbul edilmir.")
    ws["A2"].font = Font(italic=True, size=9, color="7F7F7F")

    for index, (title, width, kind) in enumerate(COLUMNS, start=1):
        cell = ws.cell(HEADER_ROW, index, title)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = REQ_FILL if title in REQUIRED else HEAD_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)
        ws.column_dimensions[get_column_letter(index)].width = width
    ws.row_dimensions[HEADER_ROW].height = 30
    ws.freeze_panes = f"A{FIRST_ROW}"
    ws.auto_filter.ref = f"A{HEADER_ROW}:{get_column_letter(len(COLUMNS))}{LAST_ROW}"

    # Formulas: a product's category belongs to the catalogue, and «Cəmi» is arithmetic. Neither is typed.
    for row in range(FIRST_ROW, LAST_ROW + 1):
        for column, lookup in ((2, 2), (3, 3), (4, 4)):
            # A product filed less than three levels deep has no «Alt kateqoriya»: the lookup then lands on an
            # empty cell and Excel reads that as 0, so the zero is turned back into a blank. A real category
            # name can never be 0, which makes the test safe.
            found = f'VLOOKUP($E{row},{REFERENCE}!$A:$D,{lookup},FALSE)'
            ws.cell(row, column, f'=IFERROR(IF({found}=0,"",{found}),"")')
        ws.cell(row, 12, f'=IF(AND($I{row}<>"",$K{row}<>""),$I{row}*$K{row},"")')

    validations = {
        "product": DataValidation(type="list", formula1=lists["Məhsul"], allow_blank=True,
                                  errorTitle="Məhsul kataloqda yoxdur",
                                  error="Məhsulu siyahıdan seçin. Yeni məhsul lazımdırsa, əvvəlcə "
                                        "kataloqa əlavə edilməlidir — administratora bildirin."),
        "location": DataValidation(type="list", formula1=lists["Obyekt"], allow_blank=True,
                                   errorTitle="Obyekt tanınmır", error="Obyekti siyahıdan seçin."),
        "supplier": DataValidation(type="list", formula1=lists["Şirkət"], allow_blank=True,
                                   errorTitle="Şirkət tanınmır",
                                   error="Təchizatçını siyahıdan seçin, ya da xananı boş buraxın."),
        "responsible": DataValidation(type="list", formula1=lists["Cavabdeh şəxs"], allow_blank=True,
                                     errorTitle="Cavabdeh şəxs tanınmır",
                                     error="Cavabdeh şəxsi siyahıdan seçin."),
        "unit": DataValidation(type="list", formula1=lists["Vahid"], allow_blank=True,
                               errorTitle="Vahid tanınmır",
                               error="Ölçü vahidini siyahıdan seçin (Ədəd, Kiloqram, Metr, …)."),
        "linetype": DataValidation(type="list", formula1=lists["Növ"], allow_blank=True,
                                   errorTitle="Növ tanınmır",
                                   error="«Aylıq sifariş» ya da «Aylıqdan kənar» seçin."),
        "quantity": DataValidation(type="decimal", operator="greaterThan", formula1=0, allow_blank=True,
                                   errorTitle="Miqdar düzgün deyil",
                                   error="Miqdar sıfırdan böyük rəqəm olmalıdır."),
        "money": DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=True,
                                errorTitle="Qiymət düzgün deyil",
                                error="Qiymət mənfi ola bilməz. Qiymət yoxdursa xananı boş buraxın."),
        "date": DataValidation(type="date", operator="greaterThanOrEqual", formula1="DATE(2020,1,1)",
                               allow_blank=True, errorTitle="Tarix düzgün deyil",
                               error="Tarixi gün/ay/il formatında yazın."),
    }
    for dv in validations.values():
        dv.showErrorMessage = True
        dv.errorStyle = "stop"       # refuse the value, never merely warn: that is the whole point
        ws.add_data_validation(dv)

    for index, (title, _, kind) in enumerate(COLUMNS, start=1):
        letter = get_column_letter(index)
        span = f"{letter}{FIRST_ROW}:{letter}{LAST_ROW}"
        if kind in validations:
            validations[kind].add(span)
        for row in range(FIRST_ROW, LAST_ROW + 1):
            cell = ws.cell(row, index)
            cell.border = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)
            if kind == "formula":
                cell.fill = AUTO_FILL
                cell.protection = Protection(locked=True)
            else:
                cell.protection = Protection(locked=False)
            if kind == "date":
                cell.number_format = "DD.MM.YYYY"
            elif kind in ("money", "formula") and index in (11, 12):
                cell.number_format = "#,##0.00"
            elif kind == "quantity":
                cell.number_format = "#,##0.###"

    # Protection keeps the formulas and the headers safe; everything a person fills stays unlocked. No
    # password, so whoever needs to restructure the sheet can simply turn it off.
    ws.protection.sheet = True
    ws.protection.autoFilter = False
    ws.protection.formatColumns = False
    ws.protection.formatRows = False

    # ---------------------------------------------------------------- the instructions
    guide.column_dimensions["A"].width = 112
    text = [
        ("BAX Orders — sifariş cədvəlinin doldurulması və yüklənməsi", "title"),
        ("", None),
        ("Bu fayl nəyə görə belədir", "head"),
        ("Əvvəl adlar əldən yazılırdı. Nəticədə bir mal bir vərəqdə üç cür yazılırdı — məsələn "
         "«Xlor Toz 90% qranul» 25 sətirdə, «Xlor toz qranul 90% Pooltech» 9 sətirdə, «Xlor toz qranul 90%» "
         "7 sətirdə. Hər yazılışı idxal zamanı əl ilə tanıtmaq lazım gəlir; səhv tanıdılsa bir mal "
         "kataloqda iki dəfə yaranır və hesabatlar onu toplaya bilmir.", None),
        ("Bu şablonda adlar siyahıdan seçilir. Problem düzəldilmir — bir daha yaranmır.", None),
        ("", None),
        ("Qaydalar", "head"),
        ("1. «Malın adı», «Obyekt», «Şirkət», «Cavabdeh şəxs», «Vahid», «Ö/v», «Növ» — yalnız siyahıdan "
         "seçilir. Əldən yazılan dəyər Excel tərəfindən QƏBUL EDİLMİR.", None),
        ("2. Boz sütunlar — «Ana/Orta/Alt kateqoriya» və «Cəmi» — özü hesablanır. Onlara yazmayın; "
         "kateqoriya malın kataloqdaki xüsusiyyətidir.", None),
        ("3. «Miqdarı» sıfırdan böyük rəqəm olmalıdır. «Qiyməti» boş qala bilər — daxili təminatdır.", None),
        ("4. «Tarix» sifarişin aid olduğu AYI göstərir, gün əhəmiyyətsizdir.", None),
        ("5. «№» ardıcıl nömrədir. Nömrə sətri sonradan tanımaq üçündür — təkrarlanmasın.", None),
        ("6. Vərəqin adı «Aylıq» olmalıdır. İdxal yalnız bu adda vərəqi oxuyur, başqa vərəq oxunmur.", None),
        ("7. Sütun adlarını dəyişməyin. İdxal sütunu adına görə tanıyır.", None),
        ("", None),
        ("Lazım olan mal siyahıda yoxdursa", "head"),
        ("Əldən yazmayın. Yeni mal kataloq qərarıdır: administratora bildirin, kataloqa əlavə edilsin, "
         "sonra bu şablon yenidən yaradılsın. Siyahı kataloqun fayl yaradılan günə olan vəziyyətidir.", None),
        ("", None),
        ("Necə yüklənir", "head"),
        ("1. Saytda «İdxal» bölməsini açın.", None),
        ("2. Faylı seçib yükləyin. Sistem sətirləri oxuyur və tanımadığı dəyərləri sizə göstərir.", None),
        ("3. Tanınmayan dəyər varsa, onu nəzərdən keçirmə ekranında həll edin.", None),
        ("4. Təsdiq ekranında hansı sifarişlərin yaranacağını yoxlayın və təsdiqləyin.", None),
        ("5. Sifarişlər «Qaralama» kimi yaranır; təsdiq axını saytda davam edir.", None),
        ("", None),
        ("Qeyd: eyni fayl iki dəfə yüklənə bilməz — sistem təkrarı tanıyır və rədd edir.", None),
    ]
    row = 1
    for line, style in text:
        cell = guide.cell(row, 1, line)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        if style == "title":
            cell.font = Font(bold=True, size=14, color="1F3864")
        elif style == "head":
            cell.font = Font(bold=True, size=11, color="1F3864")
        row += 1

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
    return {"products": len(products), "locations": len(locations), "suppliers": len(suppliers),
            "responsible": len(responsible), "units": len(units)}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    counts = build(sys.argv[1], sys.argv[2])
    print(f"{sys.argv[2]} yazıldı — " + ", ".join(f"{k}: {v}" for k, v in counts.items()))
