# Review — Task 17: Ortaq dialoq müqaviləsi (Qərar zənciri, 1 of 8)

Reviewer, 2026-09-25. Specification `TASKS/TASK-17.md` (READY, Planner, verified at `f011924`); brief
`BRIEFS/TASK-17.md` (decisions 17.1, 17.2, 17.3); Coder report `LAST_REPORT.md`; the Coder log
`LOGS/20260925-230038-cycle02-coder.jsonl`.

**Verdict: PASS.** Task 17 is accepted. The next task is 18, which is still `DRAFT — §2 UNVERIFIED`, so the state
goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `f0119249534c…` (`f011924`, 15b's accepted commit). `git diff --stat` shows 10 tracked
  files, all under `frontend/bax-orders-web/src/`. The untracked files are the 4 new frontend files named in the
  report, `docs/audits/2026-qerar-zenciri/17-dialoq-yoxlamasi.md` (the only file in that folder), and the workflow
  infrastructure. `resume-agent.ps1` is excluded from the runner's commit (`run-agent.ps1`:378), together with
  `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`. No backend, tool, schema or data file changed.
- **The diff, read in full**, for `Modal.tsx`, `dialogStack.ts`, `InfoHint.tsx`, `TrendModal.tsx`,
  `ItemSourceDrawer.tsx`, `RowDetailDialog.tsx` and `oldTerms.test.tsx`. I also read all the new and extended tests.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`. The call was refused, as in earlier
  reviews, because `run-agent.ps1`:1115 grants the Reviewer no build or test command. So I read the raw tool
  results in the Coder log:
  - line 662: full frontend suite, `Test Files 54 passed (54)`, `Tests 990 passed (990)`;
  - line 670: `npm run build`, meaning `tsc -b` then `vite build`, `built in 1.20s`;
  - line 679: `dotnet build` into `bin`, 6 errors. These are file-lock errors caused by the running API;
  - line 687: `dotnet build --artifacts-path <scratchpad>`, `Build succeeded`, `0 Error(s)`;
  - line 698: `Passed! … 1046` for unit tests and `Passed! … 785` for integration tests.

  The Coder's last edit to application or test code is at log line 640. Every run above comes after it. The files'
  modification times (latest 23:20:32) agree.
- **No database or tool command.** I listed every Bash command in the Coder log. They are reads, greps, the
  suites, the builds, `git diff/status/ls-files` and one `cat >>` into `Modal.test.tsx`. There is no `psql`,
  `pg_dump`, `dotnet ef`, `dotnet run` or `tools/` command.

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Product history: `Escape` closes it, the page stays where it was, and focus returns to the product's row button | PASS. `OrderDecisionPage.test.tsx`:1591–1605 opens the dialog through `DriverList`'s real button and presses `Escape`. The dialog is gone, the product has focus, and `focus` was called with `{ preventScroll: true }`. The code is `Modal.tsx`, cleanup of the focus effect. |
| 2 | «Sətri sil»: a backdrop click leaves it open and removes nothing; the same holds for every form and confirmation | PASS. `RemoveLineDialog.test.tsx`:54–63 asserts no `onClose`, no `removeOrderItem` and no `onSaved`. The default is `dismissOnBackdrop = false` (`Modal.tsx`:44). A grep shows the prop at exactly three call sites: `TrendModal.tsx`:121, `ItemSourceDrawer.tsx`:46 and `RowDetailDialog.tsx`:88. The other twenty dialogs were not touched. |
| 3 | «Mənbə», the product history and the row detail in its reading state close on a backdrop click; the row detail does not close while a form is open or a request is in flight | PASS. `OrderDecisionPage.test.tsx`:1607–1625 covers «Mənbə», and `TrendModal.test.tsx` covers the product history. `RowDetailDialog.test.tsx` has four tests: the reading state closes; an open correction keeps the typed text; an exclusion reason is kept; and a pending `includeRow` keeps the dialog open. The condition is the spec's, verbatim. |
| 4 | Tab lands inside the dialog and cycles; the page behind is never reached | PASS. `Modal.test.tsx`:227–265 has buttons before and after the dialog, and neither is reached. After a backdrop click, `Tab` comes back in. `:267–284` covers `disabled` and closed `<details>`. |
| 5 | Nested dialogs: `Escape` closes only the upper one, and the page stays locked; an open `InfoHint` note takes the first `Escape` | PASS. `Modal.test.tsx` «Escape» covers this, including the two-in-one-parent case, where overflow stays `hidden` and then returns to `auto`, and the out-of-order unmount. `dialogStack.test.ts` has 5 tests, including one under StrictMode. `InfoHint.test.tsx` «inside a dialog» covers the note. `preventDefault()` comes before `onClose()`, as §4.2 step 4 requires. |
| 6 | Named by `aria-labelledby` and described by `aria-describedby` | PASS. `useId` ids are on the `<h2>` and `<p>`. There is no `aria-describedby` without a subtitle, and the composed `aria-label` is gone. `Modal.test.tsx`:322–338 covers this. |
| 7 | Every dialog opens and closes as before, with no visual difference; `autoFocus` fields keep focus | PASS, within what can be shown without a browser. No class changed. The only markup changes are the attributes §4.7 lists, and the backdrop is still the dialog's direct parent. The five scroll-lock tests (`Modal.test.tsx`:19–68) are byte-for-byte unchanged, because the diff only adds lines after them and widens the imports. The opener is read in `useState` at first render, and a field that is already focused keeps its focus (`Modal.test.tsx`:221). `tabIndex={-1}` sits on the container. The app has no global `:focus` style, so a mouse press does not draw a ring there. |
| 8 | No figure changed, other screens unchanged, all suites and builds green, the old-terms sweep passes | PASS. Frontend 54 / 990 (from 51 / 957, +3 files, +33 tests). Backend 1046 / 785, unchanged. `oldTerms.test.tsx` is in the green run. |

## The one changed existing test

`terminology/oldTerms.test.tsx`:1076 used to assert the composed name `Məhsul tarixçəsi — Zibil paketi · 120 litr ·
ədəd`. It now asserts `toHaveAccessibleName('Məhsul tarixçəsi')` and `toHaveAccessibleDescription('Zibil paketi ·
120 litr · ədəd')`. The same two texts are still checked word for word, so this is not a weaker test. It is the
consequence §4.5 prescribes, and §10 permits it provided it is reported. It was reported. §2.3's search had missed this
test because it looked only for `getByRole('dialog', { name })`.

## Things beyond the letter of the spec, judged acceptable

- `tabStops` goes further than §4.4 in three ways. It skips the inside of a closed `<details>`, treats a radio group as
  a single stop, and uses `checkVisibility()` where the browser has it. Each stops focus from leaking onto an
  unreachable element, and none changes what the spec requires.
- Focus is returned only when it was lost with the dialog, and never during StrictMode's rehearsal unmount. §4.4 says
  to return focus "if [the opener] is still in the document", and this is stricter than that. It avoids taking focus
  away from an element the page focused on purpose. The page-level test proves the main path.
- `Escape` is ungated by `busy` (Assumption 8), matching the × button.

## Not proven here, left to the operator

The browser-only behaviour is prepared, not run: the real focus ring, the scrollbar press, the drag, touch, and
Safari. The pack `docs/audits/2026-qerar-zenciri/17-dialoq-yoxlamasi.md` has A-01 … A-12 in the final audit's
twelve-line form. Every result is left as `---- operator doldurur ----`, and A-03 is recorded as unreachable today.
The pack also says that no primary button is pressed and that writes happen only in the sandbox. The report states
that the Coder did no browser check. None of this gates acceptance: the spec makes the pack an operator stage.

## Notes carried forward (not defects)

- Known limit, unreachable today: a `Modal` rendered inside another and mounted in the same commit would register
  first. Task 19 should open any inner dialog on a later render (`LAST_REPORT.md` §2, §9).
- Task 10's scroll lock restores "what it found". If the lower of two dialogs closes first, the page unlocks while
  the upper one is still open. This is pre-existing, unreachable today, and was not changed.
- On Safari/macOS a mouse press does not focus a button, so the opener becomes `<body>` and focus is not returned.
  This is browser behaviour, and it is noted for the operator.

## Human gates

None crossed. No database, no data, no backend. Nothing was committed or pushed by a role. HD-009 stays open as the
owner's decision and does not block. N-01 is still the owner's own action.
