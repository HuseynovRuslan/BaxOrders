# State

**The MVP is ready — `MVP_READY.md` is the summary, and `IMPORT_RUNBOOK.md` is the import, click by click.**
**The executive redesign is complete** — `UX_BRIEF.md` is the brief, `U-01 … U-14` in `ROADMAP.md` the work.
**The shell and «Sadə baxış» are the approved BaxOrders design** — Figma `BaxOrders-UI-v2`, frame
`baxorders-dashboard` (file `cAUolnwBuZdFUOMW1RpbsW`, node `6:4`), read from Figma directly. `V-01 … V-08` in
`ROADMAP.md`. It replaced the Figma Make simple view (`F-01 … F-10`), which is deleted from the product;
its handoff stays under `design-reference/figma-simple-dashboard/` and git history has the code.
**«Ətraflı baxış» is still the Stitch handoff** (`S-01 … S-11`, `design-reference/stitch-dashboard/`) and was
deliberately not touched: **the owner is designing it separately and the work stops here until that approved
Figma reference arrives** (`V-08`). The toggle swaps the composition; the month, the scope and the comparison
are the page's and are shared.

Written for a session that has no conversation behind it. Read this, then `ROADMAP.md`, `DECISIONS.md`,
`BLOCKERS.md`, then `git log` and `git status`. The roadmap has no `TODO` left: what remains is `V-08` (the
approved Figma design for «Ətraflı baxış», which the work is now waiting on), `B-07` (a layout trade-off only
the owner can choose), `R-12` (an icon), `S-11` (an export nobody has specified), the split-bar half of
`F-10` — its trend half is now built, as `V-03` — and the deferred `SONRAKI_IMKANLAR.md`, which is out of the
queue by standing instruction.

`IMPORT_RUNBOOK.md` beside these is for the person doing the import, not for a session: the click-by-click
sequence with the figures each step produces, all of them measured rather than expected.

## Where things stand — 2026-09-29

| | |
|---|---|
| HEAD | `39e815c` · feat: every month in the chart answers, not just the selected one |
| Branch | `main`, clean apart from the standing exclusions |
| Current task | none in progress. **Waiting on the owner's approved Figma design for «Ətraflı baxış»** (`V-08`) |
| Phase | **one month, two approved languages, three scopes.** «Sadə baxış» is the BaxOrders-UI-v2 composition: four figures, «Xərc dinamikası» over six months, «Kateqoriya üzrə bölgü» as five ranked bars, and «Məbləğ dəyişiklikləri» as five rows. «Ətraflı baxış» is the Stitch composition, unchanged: the ribbon, four KPIs, the month against its basis object by object, the breakdown, and three outlier cards |
| Running | API on `http://localhost:5080` (`ASPNETCORE_ENVIRONMENT=Development`), web on `http://localhost:5174` |

## The development database moved

**PostgreSQL is on port `55438`, not 55434** — Windows refuses to bind 55434 («Permission denied», a reserved
range). `scripts/dev-postgres.ps1` must be run as `./scripts/dev-postgres.ps1 -Port 55438`, and the
user-secret `ConnectionStrings:BaxOrders` already says 55438.

## Building the backend while the API runs

The running API holds its own build output, and `dotnet build` then fails with `MSB3027`. Stop it first:
`Get-Process BaxOrders.Api | Stop-Process -Force`. This costs a few minutes every time it is forgotten.

## Design references — two approved handoffs

Both live under `AI_WORKFLOW/design-reference/`, both were copied byte-for-byte from Downloads and verified,
and **neither may be edited**: a design that has been edited is no longer the design that was approved.

| folder | view | what it is |
|---|---|---|
| `figma-simple-dashboard/` | **superseded** | the Figma Make project that was «Sadə baxış» until 2026-09-29. Kept because it was approved once; nothing in the product reads it any more |
| `stitch-dashboard/` | «Ətraflı baxış» | a Stitch handoff — `DESIGN.md`, `code.html`, `screen.png` |

`recharts` was already a dependency of this app at the same version the Figma project uses, so the charts cost
no new dependency. The BaxOrders-UI-v2 design needs none: its chart is CSS boxes, all thirteen of its icons
are `lucide-react` names the app already has, and its palette is Tailwind's own slate and blue — the only
literal colours in the implementation are `#f5f5f3` (the canvas), `#2a3649` (the active nav fill) and
`#f0f3f6` (a badge ground).

**The third reference is not a folder.** «Sadə baxış» and the shell come from Figma itself, read with the
Figma MCP server: file `cAUolnwBuZdFUOMW1RpbsW` («BaxOrders-UI-v2»), frame `baxorders-dashboard`, node
**`6:4`**, 1440 × 1140. The link the owner sent points at node `4:22`, which is a canvas and returns "You
currently have nothing selected" — `get_metadata` on the file is what finds `6:4`.

## Design reference — the approved Stitch handoff

The owner's approved dashboard design is stored at **`AI_WORKFLOW/design-reference/stitch-dashboard/`**:

| file | what it is | sha256 (first 16) |
|---|---|---|
| `DESIGN.md` | the design system — «Executive Operational Governance System»: colour roles, type scale, spacing and radius tokens, as YAML frontmatter | `5e9845a6d28ab750` |
| `code.html` | the rendered handoff, Tailwind config inline; `lang="az"`, BaxOrders' own navigation | `e759a3cb67c1497d` |
| `screen.png` | the exported preview, 1121 × 1600 | `897e0ca75f56437f` |

Copied byte-for-byte from `C:\Users\HP\Downloads\stich_design` on 2026-09-29 and verified with `cmp`; the
Downloads folder is untouched and remains the original. **Reference only** — these files are not application
source, are not imported by anything, and must not be edited in place: a design that has been edited is no
longer the design that was approved. They live under `AI_WORKFLOW/`, which is untracked, so they stay out of
product commits.

Nothing of this design has been implemented yet.

## The build gate — read this before trusting a green typecheck

`npx tsc --noEmit` in `frontend/bax-orders-web` **checks nothing**: the root `tsconfig.json` is
`{"files": [], "references": [...]}`, so it type-checks zero files and always exits 0. The real gate is
**`npx tsc -b`**, which `npm run build` runs, and it covers `src` including every test file. It had been red
for some time — 21 errors, two of them in shipping code — and was fixed in `8859d5c` (`U-14`).

## Commits this run

| | |
|---|---|
| `0de9646` | feat: the approved design's tokens, and the shell that wears them |
| `fd3c2a8` | feat: what the month was spent on, by the catalogue's own top categories |
| `7baefbc` | feat: the dashboard says who each month's order is answerable to |
| `1706bb3` | feat: «Ətraflı baxış» is the approved Stitch dashboard, on real data |
| `9b80223` | feat: «Sadə baxış» is the approved Figma Make dashboard, on real data |
| `dbf7020` | fix: four figures do not fit across a phone |
| `19efaa1` | feat: the app shell is the approved BaxOrders design |
| `942a11c` | feat: «Sadə baxış» is the approved BaxOrders dashboard, on real data |
| `39e815c` | feat: every month in the chart answers, not just the selected one |

Before it, the executive redesign: `984e9c7`, `1369d67`, `a83acac`, `4f1d5c8`, `a5bbafc`, `8859d5c`,
`f876ec2`, `8f6acbb`, `b3ee373`, `a56f7a4`.

Before it, the MVP run: `0f7fbff`, `2013307`, `0ce681e`, `ef27f3c`, `037cf11`, `3b44f17`, `8a294e7`,
`e9c1ad0`, `cf2d662`, `b95b9a6`, `4eac232`, `2ba9728`, `4b5386b`, `a7e0a66`, `cdd00a1`, `4942295`, `b9cb4a1`,
`f907ac8`, `e8e5d5c`.

Earlier, still the baseline: `70b74a6`, `b5cbe78`, `0865442`, `fac0b4e`.

## Tests, last run — 2026-09-29

| suite | result |
|---|---|
| backend unit | **1204 green** |
| integration | **932 green** (needs `BAXORDERS_TEST_POSTGRES`) |
| frontend | **1472 green** across 77 files; **`tsc -b` clean and `npm run build` green** |

The dashboard costs **thirteen** queries: seven as before, the trend's two, the category breakdown's two, and
the two that name who each order is answerable to. All six additions are constant — none is per object, which
is what the four query-count tests exist to guard.

Integration tests are opt-in:
`BAXORDERS_TEST_POSTGRES="Host=localhost;Port=55434;Database=postgres;Username=baxorders;Password=…"`
(the password is in `dotnet user-secrets list --project src/BaxOrders.Api`). They build their own throwaway
database per run and never touch `baxorders_dev`.

## Database

| | |
|---|---|
| Development | `baxorders_dev` on localhost:55434 — **unchanged all run** |
| Verified | 167 requests · 3618 items · 3 batches · **429 633,01404 ₼** (2026-10-09 uzlaşdırması) · heç bir sətir təsnifatsız deyil |
| Latest backup | `C:\Users\HP\BaxOrders-backups\baxorders_dev-pre-line-person-20260927-084046.dump` |
| Workbook backup | `C:\Users\HP\BaxOrders-backups\workbook\…-20260927-143616-pre-september-nov.xlsx` |
| Rehearsal databases | all dropped. Create with `CREATE DATABASE <name> TEMPLATE baxorders_dev;` and drop afterwards. Note PostgreSQL folds unquoted names to lower case. |

## Invariants, verified this run

```
OrderRequests            167
OrderRequestItems       3618
known amount     431682.91404 AZN   (was 431670.91404 before D-17 gave item 500 its price)
Monthly 3280 · OutsideMonthly 338 · Unclassified 0   (2026-10-09 uzlaşdırması + D-24)
all 3618 items carry a line-level ResponsiblePersonId
```

## The authoritative workbook, as the pipeline now reads it

The workbook now lives in the project, in three directories with one rule each — see
`workbooks/README.md`. **Rehearse the working copy, not the download.**

| | |
|---|---|
| **Authoritative** | `AI_WORKFLOW\workbooks\working\Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` · sha256 `47bf24fe…` · B-01, B-02, B-04 and D-24 applied · **3618 rows** |
| Immutable reference | `AI_WORKFLOW\workbooks\original\…` · sha256 `02f2177a…` · exactly as the owner supplied it, and so also the pre-B-01 state |
| Backups | `AI_WORKFLOW\workbooks\backups\` · one timestamped copy before each modification |
| The owner's own copy | `C:\Users\HP\Downloads\…` · left alone, still `02f2177a…` |

None of them is committed; the directory is untracked.

| | |
|---|---|
| staged rows | **3617**, all from `Aylıq`; `Əsas` 0; the summary row 0 |
| valid / review / invalid, as staged | 3255 / 359 / 3 |
| duplicates | 48 rows in 22 groups, all inside `Aylıq` |
| classification | **Monthly 3293 · OutsideMonthly 325 · Unclassified 0** |
| responsible person | 3617 of 3617 resolve; nobody created |
| blockers, as staged | UnknownProductVariant 222, UnknownProduct 17, MissingRequiredValue 2, UnknownUnit 1 |
| **after the accepted decisions** | **0 invalid · 0 blockers** |
| **rows ready** | **3618 of 3618** |
| **confirmed** | 166 requests · **3618 lines · 431 051,16404 ₼** · Monthly 3293 · OutsideMonthly 325 · Unclassified 0 · a named person on every line |

The decisions, in the order they have to be taken (**AD-06**):

| | action | rows |
|---|---|---|
| AD-04 | eight «Vahid» values marked "not a unit" | 198 |
| AD-03 · AD-05 | four cells corrected from the company's own catalog: rows 501 and 609 model → `11 11 21`, row 227 Ölçü/Vahid → `125 mm`, row 597 Ö/v → `ədəd` | 4 |
| AD-02 | two `Təmir işləri` lines confirmed to have no order unit | 2 |
| AD-01 | twelve variants created, each a make of a product the catalog already holds | 21 |
| D-19 | one canonical «Laqonda daşı metal üçün» product and its six variants | 17 |

Nothing was invented: units stayed 17, products 1112, and the six repaired rows all matched variants that
**already existed** (20121, 20415, 20861, 21700). Taking AD-01 before the repairs instead creates fifteen
variants, three of which record a corrupted cell as catalog truth — measured, and the reason AD-06 exists.

## The import, carried all the way — 2026-09-27

All 167 historical requests are **Approved**, so every one of the 166 groups is `ExistingRequest` and takes
`CreateNewVersion`. The 18 rows nobody can decide were excluded, each naming the blocker it waits on, which is
what makes the batch importable at all.

| | version 1, the history | version 2, this import |
|---|---|---|
| requests | 167 · Approved | 166 · Draft |
| lines | 3618 | **3618** |
| known amount | 431 682,91404 ₼ | **431 051,16404 ₼** |
| classification | Monthly 3293 · OutsideMonthly 324 · Unclassified 1 | **Monthly 3293 · OutsideMonthly 325 · Unclassified 0** |
| responsible person | on all 3618 | **on all 3618** |

The history was not touched: still 167 requests, 3618 lines, 431 670,91404 ₼, all Approved.

**Every line and every manat is accounted for.** Nothing is excluded any more: the workbook's own total over
its 3618 rows is **431 051,16404 ₼** and that is exactly what the import writes. Against the approved history
(431 682,91404 ₼ over the same 3618 lines) the difference is **631,75 ₼ of figures the new workbook simply
states differently** — concentrated in June (−422,60) and September (−175,00). That is the workbook speaking,
not a defect; the owner should know the new version supersedes the approved one by that much.

The 120 unpriced lines arrive «Təsnif edilməyib», which is the price-classification workflow, not a problem
here: those same lines carry no price in the history either.

### And through the screens, not only the endpoints

Driven in a browser against a disposable copy, the same 166 groups: «Hamısına yeni versiya (166)» beside the
warning, one click, the warning gone and «166 sifariş və 3,599 sətir yarat» enabled, then 166 requests and 3599
lines written. No console error, no horizontal scroll at 1440 / 1366 / 1200 / 390.

Two things the screen showed that no test would have: the operator was being asked for the same answer 166
times (`4eac232`), and the table was at the form width with ten columns, so every group took four lines to read
and the headers touched (`b95b9a6`).

The batch is reopened with `/imports?id=<batchId>` — the imports page keeps the id in the URL, and there is no
other way back to a batch once the page is left.

### What the manager sees the morning after

The dashboard reads the latest version of each location and period **whatever its status** — an accepted policy
a test protects, and it is honest about it: every object carries «Təsdiqlənməyib» beside its figure. So the
moment the import is confirmed, every number on the panel becomes the new draft one. September reads
**71 035,29 ₼** where the approved version says 71 210,29, and the whole panel falls by the 729,51 ₼ the
workbook states differently. Nothing to fix; something the owner should expect before pressing the button.

Checked in the browser after a real confirmation: the panel, its comparisons, its 27-object table and the
orders list all render with no console error.

**`Aylıq hesabat` adds up.** Its year total reads **431 311,40 ₼**, which is the import's 430 941,40404 plus the
one group the workbook does not restate — **Parlament parkı, January 2026, 370,00 ₼**, still on version 1. The
report shows the latest version of each of the 167 location-and-month groups, and 166 of them are now version 2.
Checked against the database rather than eyeballed. Its only fault is B-07, a layout one.

**Two environments, measured separately** (§11): with the historical orders present, 166 groups collide and each
needs an operator decision; with the catalogs kept and the orders removed, the collisions are **0** and every
other figure is identical. The workbook's own readiness does not depend on the historical orders.

## Open blockers

`B-06` the 332 single actions an import leaves behind · `B-07` the monthly report scrolls sideways under a
1290-pixel window. **Every workbook blocker — `B-01` … `B-05` — is answered and applied**, so neither of the two
left touches the import. See `BLOCKERS.md`.

Nothing in the workbook waits on either of them.

## How to rehearse the real workbook

Rehearse **`AI_WORKFLOW\workbooks\working\…`**, never the download and never `original/`.

1. `CREATE DATABASE baxorders_x TEMPLATE baxorders_dev;` (no connections to dev)
2. run the API against it: `ConnectionStrings__BaxOrders=…Database=baxorders_x…` on a free port
3. `GET /api/v1/auth/csrf` → `POST /api/v1/auth/login` (admin) → `POST /api/v1/imports/excel` with the file
4. `GET /imports/{id}/readiness` and `/imports/{id}/confirmation/preview`
5. drop the database

## Responsive, measured 2026-09-28 on the real imported data

Ten routes at 1440, 1366, 1200 and 390. Every one is **0** except `Aylıq hesabat` at 1200, which is **B-07** and
the owner's own choice between a sticky header and a page that does not scroll sideways.

Three pages were scrolling the whole page sideways on a phone — Obyektlər 227px, İstifadəçilər 104px,
Təchizatçılar 22px — while their tables sat correctly inside their own scroll boxes. The cause was the same and
invisible: screen-reader-only text is absolutely positioned, and with no positioned ancestor it lays itself out
against the page and widens it. One class on each box (`2013307`).

## The coordinator's whole run, driven in a browser

Upload → the eight descriptor decisions → the four cell repairs → the two service lines → one canonical product
and its six variants → twelve more variants → «Hamısına yeni versiya (166)» → **«166 sifariş və 3 618 sətir
yarat»** → **«Hamısını təsdiqə göndər (166)»** → «166 sifariş təsdiqə göndərildi.» → Təsdiq gözləyənlər is no
longer empty. No console error anywhere.

`Aylıq hesabat` then reads **Aylıq 316 866,41 ₼ · Aylıqdan kənar 114 554,75 ₼ (325 sətir) · Ümumi 431 421,16 ₼**
— a quarter of the year's spend was outside the monthly plan and had been folded into the trend until `037cf11`.
