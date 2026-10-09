# Review — Task 22a: Tarixi təsdiq ifadəsi — sifariş səhifəsi (Qərar zənciri, 6 of 8; Task 22, part 1 of 2)

Reviewer, 2026-09-26. Specification `TASKS/TASK-22a.md` (READY, Planner, verified at `b6b987c`); brief
`BRIEFS/TASK-22.md` (decisions 22.1 … 22.3); Coder report `LAST_REPORT.md`; the Coder logs
`LOGS/20260926-085525-cycle01-coder.jsonl` (this run) and `LOGS/20260925-230038-cycle17-coder.jsonl` (the run cut off
by ECONNRESET, which wrote the production files).

**Verdict: PASS.** Task 22a is accepted. The next task is 22b. It has no specification and HD-010 is still open, so
the state goes to `PLANNING`. `PLAN.md` already tells the 22b Planner to stop with `TASK_22B_HD010_OPEN` if HD-010 is
unanswered. That decision is the Planner's, not this review's.

## What I checked independently

- **Git.** Branch `main`, HEAD `b6b987c` (Task 21's accepted commit). `git diff --stat` shows six tracked files,
  +222 / −24, all under `frontend/bax-orders-web/src/`: `workflow/labels.ts`, `labels.test.ts`, `WorkflowPanel.tsx`,
  `WorkflowPanel.test.tsx`, `pages/OrderDetailPage.tsx` and `pages/OrderDecisionPage.test.tsx`. The untracked files
  are `workflow/OrderStatusBadge.tsx`, `workflow/OrderStatusBadge.test.tsx`,
  `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md`, and the workflow infrastructure (`AI_WORKFLOW/`,
  `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner leaves out of the commit. That is §5's
  list plus the manual pack, and nothing else. `StatusBadge.tsx`, `api/*`, `HistoryTabs.tsx`, `oldTerms.test.tsx`,
  every backend file and every 22b surface are unchanged.
- **I read the whole production diff.**
  - **`labels.ts`.** `historicalImportLabel` is the 22.2 phrase verbatim, with no full stop.
    `historicalApprovalReason` is §4.1's sentence verbatim. `historicalImportNote` keeps its name and is the two
    joined by `. `. `historicalImportChipClass` is `workflowActionClass.ImportedAsApproved` (`bg-slate-100
    text-slate-700`), declared after that record, so there is no initialisation-order problem. The doc comments cite
    22.2, 22.3 and 4.1's surviving half. No status word, sign or class changed.
  - **`OrderStatusBadge.tsx`.** It composes `StatusBadge` with the same word, sign, tone and size the page used
    before. It returns that badge alone unless `status === 'Approved' && isHistoricalImport`. Only then does it wrap
    the badge and a plain `span` in `inline-flex flex-wrap items-center gap-1.5`. The span has the slate class, a pill
    shape and size-matched padding. It has no ring, no sign, no handler and no role. The default `size` `md` equals
    `StatusBadge`'s own default, so the header's output for a non-historical order is byte-identical to before.
  - **`WorkflowPanel.tsx`.** `onLoaded` is optional. The initial load calls it through a ref, only when the signal is
    not aborted, and the effect still depends on `orderRequestId` alone, so a new callback per render cannot re-fetch.
    `run` calls it before `onStatusChanged`. The historical branch is still one `<p>` with no facts list, and only its
    comment changed.
  - **`OrderDetailPage.tsx`.** The page stores `{ orderRequestId, isHistoricalImport }` from `onLoaded` in a stable
    `useCallback`. The header passes the flag only when that id equals `data.orderRequestId`, and otherwise it passes
    `false`, which means the plain badge. The flag is read from `decisionFacts.isHistoricalImport` and never inferred.
    `WorkflowPanel` is mounted whenever `data` exists (`:366-374`), so the flag is always available once the panel has
    loaded. No new request was added.
- **The one deviation from §10** is the page test for `fetchWorkflow`. §10 asked for "called exactly once" on the
  page. At HEAD the page already makes two calls: the panel (`WorkflowPanel.tsx`:76) and `HistoryTabs.tsx`:31, which
  this diff does not touch. §2 missed the second call. §4.3 ("the page still makes exactly the requests it makes
  today") and criterion 5 ("once per panel load, as before") are the actual requirements. The Coder pins both:
  - the page makes two calls, both for order 105;
  - `WorkflowPanel.test.tsx` checks that the panel itself makes exactly one call.

  This is a correction of a factual slip in the specification, not a weakened expectation. It is accepted.
- **The tests.**
  - `OrderStatusBadge.test.tsx` (14 tests):
    - the badge's class, sign and word stay as they were;
    - the phrase is beside the badge, not inside it, with a wrapping parent;
    - the phrase is neutral: no `amber`, `red`, `emerald` or `sky`, not `warningChipClass` or `warningToneClass`, no
      ring and no child element;
    - `sm` sizing;
    - byte-identical output for Approved with `false` or with the prop omitted;
    - the full 4 × 2 status guard. It pins the owner's words and signs in a fixed table and compares
      `innerHTML` with a plain `StatusBadge` in every non-historical case.
  - **Changed existing tests** are only the three 4.1 sentence tests §10 names. Each now asserts the 22.3 note, and
    each keeps its "names nobody" assertions unchanged:
    - `labels.test.ts`;
    - `WorkflowPanel.test.tsx`, which also asserts the full literal sentence;
    - `OrderDecisionPage.test.tsx`:1726.
  - The in-system approved test (`:846`) is only extended: it adds `Təsdiq tarixi`, the header badge's Approved
    class, and the absence of both `Tarixi sifariş` and `Təsdiq məlumatı mövcud deyil`. Nothing was weakened.
  - New page tests cover the header phrase beside the emerald `✓` badge, with the slate class. They also check that
    the old sentence and `Excel importu ilə daxil edilib` are gone from the whole body, the call count above, and
    `findOldTerms(document.body)`.
  - New panel tests cover `onLoaded` once with the loaded workflow, no call after an unmount/abort, a call with an
    action's answer, and the old sentence's absence.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet` (both calls were refused). As for Tasks
  20 and 21, I read the raw tool results in the Coder log and checked them against the files' modification times.
  - The production and test files were written by the interrupted run between 02:15:44 and 02:17:33 (+04:00).
  - This run's only application edits are four to `OrderDecisionPage.test.tsx`, at log lines 129–138. The last is at
    04:57:46Z, and the file's mtime is 08:57:46 +04:00, which is the same moment.
  - After that the only writes are to the manual pack (lines 216, 230) and to `AI_WORKFLOW/`.
  - Every run below comes after the last edit:
    - line 237 (05:02:17Z): full frontend suite, `Test Files 60 passed (60)`, `Tests 1219 passed (1219)`;
    - line 246: `npm run build` (`tsc -b && vite build`), `built in 3.91s`;
    - line 267, and lines 323–324 again: `dotnet build --artifacts-path <scratchpad>`, `0 Warning(s)`, `0 Error(s)`;
    - line 303: `Passed! - Failed: 0, Passed: 1046` unit and `Passed! - Failed: 0, Passed: 791` integration.
  - The two `Failed!` strings at lines 268 and 302 are grep patterns in the Coder's own commands, not results.
  - The plain `dotnet build` failed with MSB3026/MSB3027 because the running API (PID 9932) locks `bin`. This is not
    a compile error, and the `--artifacts-path` build is clean. It is the same situation as Task 07.
- **No database or destructive command.** Neither Coder log contains `psql`, `pg_dump`, `dotnet ef`, `dotnet run`,
  `git commit`, `git push`, `git reset` or `git clean`. The only `tools/` reference is a read-only `sed` of
  `SandboxSeed.cs` at line 224, used to write the pack's sandbox orders.
- **The manual pack** has F-01 … F-08, each with an empty `---- operator doldurur ----` result, in the twelve-line
  format. It covers the header, the panel sentence, the absence of the old words, the in-system approved order, the
  pending and draft orders, the colour and 390 × 844 wrapping, the unchanged history, and a read-only check on the
  real system. It ends with the `22b — siyahılar və aylıq hesabat` heading and "22b tərəfindən doldurulacaq; F-09-dan
  davam edir.", as §11 asks. It says plainly that the Coder did no browser check and that no API restart is needed.

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Historical order: emerald `✓ Təsdiqlənib` and beside it exactly `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb` | PASS. `OrderDecisionPage.test.tsx` «says in the header that it is approved…»: `workflowStatusClass.Approved`, `✓`, same parent as the phrase. `OrderStatusBadge.test.tsx` pins it too. |
| 2 | Panel shows exactly `historicalImportNote`; `Təsdiq məlumatı mövcud deyil` nowhere; no sender, approver, date or `Sistem` | PASS. Panel and page tests; the whole-body absence test; the `Göndərən` / `Təsdiqləyən` / `Sistem` assertions are kept. |
| 3 | In-system approved: no historical text, approver and date as before; Draft / Pending / Returned badges as before | PASS. The extended `:846` test, plus the 4 × 2 guard with byte-identical `innerHTML`. |
| 4 | `historicalImportChipClass` has no `amber` / `red` / `emerald` / `sky`, and is not a warning class | PASS. Asserted on both the constant and the rendered element. |
| 5 | No additional request; `fetchWorkflow` once per panel load | PASS. Panel: exactly 1 call. Page: 2 calls, the same as at HEAD (panel + `HistoryTabs`). No new call site exists (grep). |
| 6 | No backend, API type, status, version, amount, queue or permission change; diff only §5's files | PASS. `git diff --stat` and `git status` as above. |
| 7 | Old-terms sweep passes on the order page with a historical order | PASS. `findOldTerms(document.body)` is empty; `oldTerms.test.tsx` is unchanged and green. |
| 8 | All suites and both builds green | PASS. Frontend 60 / 1219 (from 59 / 1195: +1 file, +24 tests), backend 1046 / 791 unchanged, both builds clean. |

Brief acceptance 4 (the objects list and the monthly report) is 22b's by the planned split (`TASK-22a.md` §3.3). It
is not part of this review.

## Regression risks considered

- **A flash on load.** The header shows the plain badge until the panel's workflow arrives, then gains the phrase.
  This is by design (§4.3), and pack line 83 tells the operator to judge after the panel loads.
- **A stale flag across orders** is prevented by the id comparison. Navigating between orders remounts the panel for
  the new id, and the old answer is ignored.
- **Other screens** keep `StatusBadge` directly, and it is unchanged. `OrderStatusBadge` is used only in the order
  page's header.

## Notes (not blocking)

- `docs/audits/2026-final-enver-muellim-audit/04-sandbox.md`, Sınaq 1 step 8, still expects 4.1's sentence. It is
  Task 15's record and out of scope. The 22a pack warns the operator.
- `tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`:67–68 quotes the old sentence in a comment only. It is outside
  22a's scope.
- The browser checks F-01 … F-08 are prepared for the operator and have not been run.
- Between 22a and 22b the lists and the monthly report still show the plain `✓ Təsdiqlənib`. That is incomplete, not
  contradictory, and it waits on HD-010.
