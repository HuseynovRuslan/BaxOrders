# Review — Task 23: Mənbənin mərhələli açılışı (Qərar zənciri, 7 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-23.md` (READY, Planner, verified at `112c2d7`); brief
`BRIEFS/TASK-23.md` (decisions 23.1, 23.2, 23.3); Coder report `LAST_REPORT.md`; Coder log
`LOGS/20260926-093543-cycle05-coder.jsonl`.

**Verdict: PASS.** Task 23 is accepted. The next task is 24. Its specification is still `DRAFT — §2 UNVERIFIED`, so
the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `112c2d7` (22b's accepted commit). `git diff --stat`: 7 tracked files, +658 / −195, all
  under `frontend/bax-orders-web/src/`. Two new untracked files: `components/orders/ItemSourceDrawer.test.tsx` and
  `docs/audits/2026-qerar-zenciri/23-menbe-aciilisi.md`. The other untracked entries are the workflow infrastructure
  (`AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner leaves out.
  - Not in the diff: `ItemSourceDrawer.tsx`, `components/imports/labels.ts`, `InfoHint.tsx`, `SectionHeader.tsx`,
    `CauseSummary.tsx`, `Modal.tsx`, `api/*`, any C#, `Migrations/` and `tools/`. This matches §5's "not changed" list.
- **I read the whole production diff, with and without whitespace.**
  - **`OrderDetailPage.tsx`.** `git diff -w` shows only these changes:
    - the imports: `ChevronDown` / `ChevronRight`, `useId` and `formatCount` in, `SectionHeader` out;
    - the three state lines: `linesOpenFor`, `linesOpen = linesOpenFor === id`, `linesRegionId = useId()`;
    - the `mb-2` wrapper with the `h2` (`text-sm font-semibold text-slate-900`, the classes `SectionHeader` gave it),
      holding one `<button type="button">` with `aria-expanded` / `aria-controls`, the chevron `aria-hidden`,
      `Sətirlər`, and `formatCount(data.itemCount)` in `ml-1 font-normal text-slate-400` only once `data` is there;
    - the always-rendered `<div id={linesRegionId}>` with `{linesOpen && (<>…</>)}` around the old section.

    The toolbar, table, card list and pagination inside are unchanged apart from indentation. The `fetchOrder` effect
    and its dependencies `[id, search, hasPrice, page, reloadToken]` are untouched, so there is no lazy fetch.
    `reload()` does not change `id`, so the section stays open after an edit, and another `id` opens it folded, with
    no effect needed.
  - **`DriverList.tsx`.** The `<p>{driverScopeLine(products)}</p>` is gone from the body. The same call is now the
    child of `<InfoHint label={driverScopeHintLabel}>`, placed beside the `h2` in a `flex items-center gap-1` row and
    not inside it. `ref={headingRef}` and `scroll-mt-20` stay on the `h2`. `productStateLine` stays as the visible
    `<p>` under it.
  - **`labels.ts`.** `driverScopeHintLabel = '«Hamısı» nəyi sayır?'` is added. `driverScopeLine`'s body is not in the
    diff; only the first line of its doc comment changed ("under the heading" → "beside the heading behind its ⓘ").
- **The tests read right, and none is weakened.** I read every removed line in the four changed test files. There are
  four:
  - two `userEvent` imports that gained `type UserEvent`;
  - one comment, which was extended;
  - `columnheader 'Vahid'` in `oldTerms.test.tsx`, which moved below the new open step, unchanged.

  Every other change adds a line. No test was deleted.
  - Added in `OrderDecisionPage.test.tsx` (9 tests):
    - the folded default: no table, card list, `Mənbəyə bax`, search or filter; the control inside the `h2`, named
      `Sətirlər 78` for a 3-line page of a 78-line order; `aria-expanded="false"`; `aria-controls` naming an existing,
      empty element;
    - the control offered while the order is still loading;
    - opened: the search, exactly three options, the ten column headers in order, and 3 + 3 `Mənbəyə bax`; closing
      again empties the region;
    - 50 + 50 `Mənbəyə bax`, `Səhifə 1 / 2 · 78 sətir` and `Növbəti` → `page: 2`;
    - `location.key` and `location.search` are unchanged through open, close and reopen;
    - the `fetchOrder` / `fetchDecisionContext` / `fetchRevision` counts are equal before and after open, close and
      reopen, and `fetchOrder` was called once while folded;
    - the three filters' `hasPrice` values; the filter and the search kept across close and reopen with no new
      request; the heading still counting `itemCount`;
    - another order opens folded;
    - the counting sentence is the `role="note"` of the ⓘ, word for word and hidden, while the state line is visible.
  - Added in `OrderRevisionPage.test.tsx` (1 test): the section stays `aria-expanded="true"` through
    `EditLineDialog`'s save and `afterChange`'s reload.
  - Added in `DriverList.test.tsx` (3 tests): the sentence is in no `<p>`; the note is hidden until the ⓘ is clicked;
    the `h2`'s name is exactly `Əsas dəyişikliklər`, it is `headingRef.current`, and the ⓘ is its sibling and not its
    child; `productStateLine` is a visible `<p>` outside the note. The tests at `:400-416`, `:614` and `:620` are
    unchanged.
  - **`ItemSourceDrawer.test.tsx` (new, 7 tests)** pins every part of the dialog:
    - the fact pairs, in order, by `toEqual`: Fayl, İdxal `#50010 · Imported`, Vərəq, Excel sətri `3142`, Excel cəmi,
      Hesablanmış cəm and Sifarişə yazılıb;
    - the four column headers;
    - each field row's three readings, with `düzəliş` and `qəsdən boş`;
    - the two-step lineage with its status words and `· Excel sətri`, and the chain note;
    - the closing note, word for word;
    - the `Modal` name, description, `max-w-3xl` and backdrop close;
    - a manual line, which shows the note and no `dl`, table or chain.

    A later change that drops a field fails here, as §10 asks.
  - The changed existing tests each gained only an open step (`openLines`), as §10 requires. The negative checks
    (`queryByRole(…)).toBeNull()`) now run on the opened section, which makes them stricter rather than weaker.
  - The old-terms sweep runs on the folded page, then again on the opened page, and then on the card list.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`; both were refused again. As for 20 … 22b,
  I read the raw tool results in the Coder log and checked them against the files' modification times.
  - The last application or test write is log line 547 (`ItemSourceDrawer.test.tsx`, 06:38:44.700Z). The file's mtime
    is 10:38:44.746 +04:00, the same moment, and it is the newest mtime of any code file in the diff. After it, the
    only writes are to the Markdown pack (lines 719 … 778) and to `AI_WORKFLOW/` (828, 830). No Bash command after
    line 547 writes to a code file.
  - Every run below comes after the last edit:
    - line 562 (06:40:20Z), full frontend suite: `Test Files 61 passed (61) · Tests 1286 passed (1286)`;
    - line 572 (06:40:34Z), `npm run build` (`tsc -b && vite build`): `built in 3.80s`;
    - line 593 (06:42:19Z), `dotnet build BaxOrders.slnx --artifacts-path <scratchpad>`, because the running API holds
      `bin`: `Build succeeded`, 0 warnings, 0 errors;
    - line 610 (06:47:21Z), `dotnet test` on that build: unit `Passed: 1055, Failed: 0, Skipped: 0`; integration
      `Passed: 800, Failed: 0, Skipped: 0`;
    - line 797, a second run of the five touched frontend files: `5 passed · 233 passed`.
  - The counts rise only by the new tests: 1266 → 1286 (+20 = 9 + 1 + 3 + 7), and 60 → 61 files. The backend is
    unchanged at 1055 / 800.
- **Data.** Frontend only. The Coder ran no database command, and nothing under `tools/` or `Migrations/` changed.
  HD-002's 94 rows are untouched.
- **Manual pack.** `23-menbe-aciilisi.md` holds G-01 … G-11 in 22's row format, 13 `---- operator doldurur ----`
  markers (the eleven rows plus the format's template and its description). G-03 measures `scrollHeight` at
  `1440×900` before (`112c2d7`) and after, and adds the first change row's position. The pack is prepared and not run,
  and the Coder did no browser check.

## Acceptance criteria (§9)

| # | Criterion | Result |
|---|---|---|
| 1 | Opens with no table, card list or `Mənbəyə bax`; one control `Sətirlər` + `itemCount` | **Pass**: test, with 78 ≠ 3 |
| 2 | Opened: search, filter, every column, pagination over 50, `Mənbəyə bax` on every row and card | **Pass** |
| 3 | «Mənbə» shows every field it showed | **Pass**: `ItemSourceDrawer.tsx` untouched; new field-list test |
| 4 | The counting paragraph is not body text; its exact text is the hidden `InfoHint` content | **Pass**: page and component tests |
| 5 | Materially less scrolling; default height lower (operator, G-03) | **Pass on structure**: see the note below; pixels are G-03's |
| 6 | Three filters as before; no row or figure missing | **Pass** |
| 7 | `button` inside `h2`; `aria-expanded` flips; `aria-controls` names the holder | **Pass** |
| 8 | No request and no address change on open, close or reopen; closes for another order; survives reload | **Pass** |
| 9 | No figure changed, no field removed; suites and builds green; sweep covers the opened lines | **Pass**: log evidence above |

All six brief acceptance bullets are carried. Bullet 5 is met in full for the page's height. Its second half is only
partly met, as the next section explains.

## Notes, not blocking

- **Criterion 5, second half.** The Coder reported this plainly, and I confirm it from `OrderDetailPage.tsx`:329–419.
  At every width, the line section comes **after** «Niyə dəyişib?» and «Əsas dəyişikliklər». On a phone the grid's
  `order-*` still keeps it after them. So folding the lines cuts the page's total height a great deal, but it does not
  bring those two sections up. The first change row rises only by the moved counting sentence: one line on a wide
  screen, a few on a phone.
  - The brief's "birlikdə daha tez görünür" is therefore met modestly, not dramatically.
  - Nothing inside this task's scope could do more without moving other tasks' sections, which §3 forbids.
  - G-03 records the first row's position before and after. If the owner reads that number as too small, it is a new
    layout decision for a later task, not a defect here.
- **Go-live.** Frontend only. No API restart and no migration.
- **`components/SectionHeader.tsx` is now unused.** This page was its only user. The spec keeps the file unchanged, so
  it stays; it is a later clean-up.
- **`orderStatusLabels`** (`components/imports/labels.ts`:176–181) is still a second copy of `workflowStatusLabels`.
  It is used only by the frozen `ItemSourceDrawer`, so it is a later clean-up too.
- **Task 15's records.** `04-sandbox.md` Sınaq 1 step 6 clicks «Redaktə et» directly on a line, which now needs
  `Sətirlər` opened first. Rows in `02-yoxlama-siyahisi.md` may also assume an open line table. Both are Task 15's
  record and were rightly left alone. G-10 and the pack's «Harada aparılır» tell the operator.
- **Small behaviours the spec chose, as reported.**
  - While a filter or page change re-reads the lines, `data` is `null`, so the heading's count disappears for a moment
    (§4.1). The section stays open.
  - Within one mounted page, A → B → Back → A shows A open again if it was open before. A reload, or leaving the order
    page, folds it.
  - jsdom computes the button's name as `Sətirlər78`, with no text space, the same as the chips' existing
    `Yeni məhsullar2`. G-04 step 6 checks it with a screen reader.
- **Environment, unchanged from 22a/22b.** The running API locks `src/BaxOrders.Api/bin`, so a plain
  `dotnet build BaxOrders.slnx` fails with MSB3026. The build into the scratchpad is clean.
