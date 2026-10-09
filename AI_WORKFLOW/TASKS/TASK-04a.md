# TASK 04a — TƏSDİQ AXINI: REHBƏR ROLU, TƏSDİQ SƏLAHİYYƏTİ VƏ QƏRAR PANELİ (P0)

Priority: P0
Brief: `AI_WORKFLOW/BRIEFS/TASK-04.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **a of 2.** Task 04 is split into 04a (this file) and 04b (`TASKS/TASK-04b.md`, the separate test
environment). 04b runs after 04a is accepted and before Task 05. Every acceptance criterion of the brief is assigned
to exactly one part — see §12.
Specification status: READY — written by the Planner on 2026-09-24 from the brief and the repository at `4827cb4`.

This task changes application code only. It does **not** change real business data, has no data migration and
needs no database access. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

Ənvər müəllim must be able to decide an order — "Təsdiqlə" or "Düzəliş tələb et" — without searching for the
buttons, and must see before deciding who sent the order, when, and for which time. The audit of 23.09.2026 could not
test the decision flow at all (the inbox was empty), found the side panel repeating the status, and found the rest of
the panel of no help to the decision.

The owner decided (brief, "Qəbul edilmiş qərarlar"):

- **4.1** — historical orders imported from Excel read exactly
  `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.` No submitter, date or approver is invented.
- **4.2** — a reason is mandatory when asking for a correction.
- **4.3** — only the Rəhbər role, or a role that holds approval authority, may approve. Being an admin does not
  grant approval authority automatically.
- **4.3a** — the Rəhbər role is created in Task 04; Task 14 later applies menu and visibility rules to it.

---

## 2. Verified current behaviour (repository at `4827cb4`)

Everything below was read from the code, not assumed.

### 2.1 Roles and approval rights

- `src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs` defines three roles: `Coordinator`, `Manager`,
  `Admin`. One role per user (`IdentityUserDirectory` enforces it).
- The frontend shows `Manager` as **"Rəhbər"** (`frontend/bax-orders-web/src/auth/labels.ts`), described as
  "Sifarişləri təsdiqləyir və ya düzəlişə qaytarır." `Admin` is described as
  "Hər ikisini edir, həmçinin istifadəçiləri idarə edir." — i.e. it currently approves as well.
- `IdentityInitializer` creates every role in `BaxOrdersRoles.All` at startup, idempotently, and creates the first
  administrator (role `Admin`) only when no user exists.
- The approval right is granted to **both** `Manager` and `Admin` in four independent places:
  1. `src/BaxOrders.Api/Security/SecuritySetup.cs:93` — policy `CanDecideOrders` = `RequireRole(Manager, Admin)`;
     used by `OrdersController` `workflow/approve` (line 100) and `workflow/return` (line 114), and by the whole
     `ApprovalsController` (the inbox, line 16);
  2. `src/BaxOrders.Application/Orders/Workflow/OrderWorkflowDtos.cs:67` —
     `mayDecide = role is Manager or Admin` in `AllowedWorkflowActionsDto.For`, which drives both the order page and
     every inbox row (`ApprovalInboxQueries` reuses it);
  3. `src/BaxOrders.Api/Controllers/AuthController.cs:169` — `CanDecideOrders: role is Manager or Admin` in
     `/auth/me`;
  4. the frontend reads `canDecideOrders` for the "Təsdiq gözləyənlər" menu entry
     (`src/layout/navigation.ts:29`) and its route guard (`src/App.tsx:36`, `RequirePermission`).
- `OrderWorkflowService.ApproveAsync` / `ReturnAsync` do **not** check the role themselves; they rely on the endpoint
  policy. Integration tests call the service directly as an administrator and approve successfully.
- Users are managed on `/admin/users` (`AdminUsersController`, `IdentityUserDirectory`): create with a role, change
  role, disable. There is no guard about who may still approve afterwards.

### 2.2 The workflow

- `OrderRequest.ReturnForCorrection` already refuses an empty reason (`Guard.RequiredText`), and
  `WorkflowDialog.tsx` already disables the confirm button while the reason is empty. **4.2 is already enforced;
  this task must keep it and prove it, not rebuild it.**
- Self-approval (`EnsureNotOwnSubmission`) and own-contribution (`EnsureNotOwnContribution`, OC-16) are enforced in
  the domain for every role and must stay.
- A returned request is corrected by a **new version** linked through `OrderRequestRevisions`
  (`SourceOrderRequestId` → `RevisionOrderRequestId`); it may also be resubmitted unchanged before it is corrected
  (OC-11). Every transition writes an append-only `OrderRequestWorkflowEvent` carrying the actor's id and the
  **snapshot** of their display name, the comment (the return reason) and the UTC moment.
- All 167 real orders came from Excel. Migration `20260923122642_AddLinePricingModeAndHistoricalApproval` set them to
  `Approved` and wrote one `ImportedAsApproved` event each, with actor "Sistem", no actor id, and
  `SubmittedAtUtc` / `ApprovedAtUtc` deliberately left null. Orders imported **later** start as `Draft` and go
  through the normal workflow; they carry `SourceImportBatchId` but no `ImportedAsApproved` event.

### 2.3 The order page and its side panel

- `src/pages/OrderDetailPage.tsx`: the header (`PageHeader.actions`) shows the status badge
  (`StatusBadge`, e.g. "✓ Təsdiqlənib"). The right-hand column (`lg:sticky lg:top-4`, lines 246–264) holds
  `WorkflowPanel` (with `showHistory={false}`), then `RevisionPanel`, then the "not the latest version" note.
- `src/components/workflow/WorkflowPanel.tsx` shows, top to bottom: **the status badge again** (the duplication the
  audit reported), the missing-price note, the action buttons (right-aligned in the same row), the blocking notes,
  the "Düzəliş tələb olunur…" note, and a footer line
  "Məlum qiymətlər üzrə məbləğ: … · N sətir · Təqdim: … · Təsdiq: …", or for historical orders
  "… · Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb".
- The return button, the dialog title and the inbox button all read `returnLabel = 'Düzəlişə qaytar'`
  (`components/workflow/labels.ts:51`). The brief names the action **"Düzəliş tələb et"**.
- `WorkflowDialog.tsx` shows "Versiya N" in its subtitle and a "Versiya" fact.
- `OrderWorkflowDto` carries `SubmittedByUserId` (an id, not a name), `SubmittedAtUtc`, `ApprovedAtUtc`,
  `ReturnedAtUtc` and the full `History`. It does not say who approved or returned, how many times the order was
  sent, or what the previous correction reason was.

### 2.4 The inbox

- `ApprovalInboxQueries` default sort is `SubmittedAtUtc` ascending (oldest submission first), then location by
  the Azerbaijani collation (Task 3). This must not change.

---

## 3. How the brief maps onto this repository — difference resolved, no owner decision touched

The brief says the Rəhbər role "is created in this task". The repository already has a role record whose on-screen
name is "Rəhbər" and whose stated purpose is approving orders — but it is **not yet a separate role in the sense of
4.3**, because `Admin` shares every approval right with it.

Creating a second role also called "Rəhbər" would leave two roles with one name, which is the opposite of "ayrıca
Rəhbər rolu". So Task 04a establishes the Rəhbər role by making the existing `Manager` role — shown as "Rəhbər" —
the one role that holds approval authority, removing that authority from `Admin`, and guaranteeing that the role is
created in every environment (it already is, by `IdentityInitializer`). The stored identifier stays `Manager`:
renaming it would rewrite rows in `AspNetRoles` on the real database for no visible gain. This is a technical
resolution, not a change to 4.3 or 4.3a, and it leaves Task 14 exactly what 4.3a promises it: an existing Rəhbər role
to configure.

If the Reviewer or the owner reads 4.3a as requiring a *new* stored role, that is a one-line change of this
section and of §5.1 — it does not affect the rest of the specification.

---

## 4. Scope

In scope:

- A. approval authority: one definition, held by the Rəhbər role only, enforced at the endpoint, in the service and
  in what the screens are offered;
- B. the admin keeps seeing "Təsdiq gözləyənlər" read-only, and is told why the buttons are absent;
- C. no interim period without an approver: a guard and a visible warning;
- D. the decision facts, computed on the server;
- E. the decision panel rebuilt around those facts, without repeating the status, with the buttons first and
  visible while the analysis is read;
- F. "Düzəliş tələb et" as the action's name wherever the action is offered;
- G. tests.

Out of scope (brief, and the Planner's split):

- the separate test environment, its test order and the end-to-end run in it — **Task 04b**;
- where the panel sits on a phone and buttons fixed to the bottom of the screen — Task 12;
- wording of the rest of the panel ("Məlum qiymətlər üzrə məbləğ", "sətir", the "Düzəliş tələb olunur. … yeni
  versiya yaradılır." note, history labels such as "Düzəlişə qaytarıldı") — Task 5;
- the "Versiya N" text in the page header and the "Versiya N-ə bax" link — Task 5;
- which menu entries the Rəhbər sees, read-only Təchizatçılar, hiding sections by direct link — Task 14;
- any change to the analysis part of the order page (see §9).

---

## 5. Required behaviour

### 5.1 One definition of approval authority (A)

Add a single definition in the application layer, next to `BaxOrdersRoles` (for example
`ApprovalAuthority.IsHeldBy(string? role)`), returning **true for `BaxOrdersRoles.Manager` and false for every
other role, including `Admin`**. Every place that today answers "may this person decide" must ask it and nothing
else:

1. policy `CanDecideOrders` (`SecuritySetup.cs`) — built from that definition (e.g. `RequireAssertion`), so the
   endpoint `workflow/approve` and `workflow/return` refuse an admin with **403**;
2. `AllowedWorkflowActionsDto.For` — `mayDecide` comes from the definition;
3. `/auth/me` — `CanDecideOrders` comes from the definition;
4. `OrderWorkflowService.ApproveAsync` and `ReturnAsync` — check it themselves before loading anything and throw
   the existing `ForbiddenException` when the current user does not hold it. The endpoint policy is not the only
   guard: a service called from anywhere else must refuse too.

Update the role descriptions shown where an admin picks a role (`auth/labels.ts`) so that they are true:

- Rəhbər: `Sifarişləri təsdiqləyir və ya düzəliş tələb edir. Təsdiq səlahiyyəti bu roldadır.`
- Administrator: `Excel idxalını aparır, sifarişləri təsdiqə göndərir və istifadəçiləri idarə edir. Təsdiq səlahiyyəti yoxdur.`
- Koordinator: unchanged.

`IdentityInitializer` keeps creating every role at startup and keeps giving the first administrator the `Admin`
role only — never approval authority.

### 5.2 The admin still sees the queue, read-only (B)

Today the inbox, its menu entry and its route are gated by "may decide". After 5.1 that would silently remove a
section from the admin, which Task 14 forbids ("Admin üçün heç bir bölmə itmir") and which this task has no mandate
to do. So:

- add policy `CanViewApprovals` = `Manager` or `Admin`, and use it on `ApprovalsController` instead of
  `CanDecideOrders`;
- add `CanViewApprovals` to `CurrentUserDto` / `/auth/me` and to the frontend `CurrentUser`;
- the "Təsdiq gözləyənlər" menu entry and the `/approvals` route require `canViewApprovals`;
- `AllowedWorkflowActionsDto` gains `BlockedByMissingAuthority`: true when the workflow state would allow a decision
  and the only reason there is none is that this person does not hold approval authority. It is reported **before**
  the self-approval and own-contribution reasons (a person without authority is told that, not the other two), and
  it is carried to the inbox rows the same way `BlockedBySelfApproval` is;
- where `BlockedByMissingAuthority` is true, the order page panel and the inbox row show, in the same style as the
  existing blocking notes: `Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.`
  No decision button is rendered.

The Coordinator's access is unchanged: no inbox, and `canSubmit` as before.

### 5.3 No interim period without an approver (C)

The brief's acceptance: "after this task goes live, real orders can be approved with the Rəhbər role; there is no
interim period in which nobody can approve."

1. `IUserDirectory` gains a count of **active** users who hold approval authority.
2. `IdentityUserDirectory.UpdateAsync` refuses — returning an `IdentityFailure` with a message, changing nothing —
   to disable, or to move out of the Rəhbər role, the **last** active user who holds approval authority. Message:
   `Bu, təsdiq səlahiyyəti olan yeganə aktiv istifadəçidir. Əvvəlcə başqa bir Rəhbər təyin edin.`
3. The `/admin/users` page shows, whenever that count is zero, a warning at the top:
   `Təsdiq səlahiyyəti olan aktiv istifadəçi yoxdur. Sifarişləri heç kim təsdiqləyə bilmir. Rəhbər rolu ilə istifadəçi yaradın.`
   The count reaches the page through the existing users API (add it to the list response or expose a small
   read-only endpoint under `/admin/users` — the Coder's choice; admin-only either way).
4. `IdentityInitializer` logs a **warning** at startup when no active user holds approval authority. It never
   creates a user, never assigns a role, never grants anything.
5. The final report carries the go-live precondition of §11.6. The Coder cannot and must not check or change the
   real users — this task has no database access.

### 5.4 The decision facts, computed on the server (D)

Extend `OrderWorkflowDto` with one new object (name it e.g. `DecisionFacts`) computed in
`OrderWorkflowService` from `OrderRequestWorkflowEvents` and `OrderRequestRevisions`. Names always come from the
event's `ActorDisplayName` snapshot — never a live user lookup, the same rule the history already follows.

"The chain" of a request is the request itself plus every request it corrects, followed back through
`OrderRequestRevisions` (`RevisionOrderRequestId` → `SourceOrderRequestId`) to the first. A new version made by a
second import is **not** a correction and starts its own chain.

| Field | Meaning |
|---|---|
| `IsHistoricalImport` | The request has an `ImportedAsApproved` event and no `SubmittedForApproval` event anywhere in its chain. When true, every other field below is null / zero. |
| `SubmissionNumber` | How many `SubmittedForApproval` events exist in the chain, counting only those up to and including the current cycle. 0 when it has never been sent. A resubmission without correction (OC-11) counts. |
| `SubmittedByDisplayName`, `SubmittedAtUtc` | The actor snapshot and moment of the latest `SubmittedForApproval` event **of this request**. Null when this request has not been sent. |
| `PreviousReturn` | The latest `ReturnedForCorrection` event in the chain that happened **before** the current cycle's submission (or, for a request not yet sent, the latest one at all): its reason (`Comment`), actor snapshot and moment. Null when there is none. For a request whose own current state is `ReturnedForCorrection`, that return is the decision (next row), not the previous return. |
| `Decision` | For status `Approved` (through this application) or `ReturnedForCorrection`: the latest `Approved` / `ReturnedForCorrection` event of this request — which one, actor snapshot, moment, and the reason for a return. Null otherwise, and null for a historical import. |

Rules that must hold:

- no field is ever filled from anything but a recorded event; a missing event means a null field, never a
  placeholder date or name;
- `SubmittedAtUtc`, `ApprovedAtUtc`, `ReturnedAtUtc` and `History` on the DTO stay as they are, so no existing
  consumer breaks;
- the computation costs a bounded number of queries per request (the chain is at most a handful of versions), not
  one query per event.

### 5.5 The decision panel (E)

Rebuild `WorkflowPanel.tsx` around the facts. On the order page it must read, top to bottom:

1. **The action row, first.** For a person who may decide: `Təsdiqlə` (primary) and `Düzəliş tələb et`
   (secondary). For a person who may submit: `Təsdiqə göndər` / `Yenidən təsdiqə göndər` as today. Nothing above
   the buttons.
2. The blocking note, if any: missing authority (5.2), self-approval, own contribution — one, in that priority.
3. **The facts**, as a short definition list. No status badge and no status word: the status is shown once, in the
   page header, and nowhere in the panel.

   | Situation | The panel shows |
   |---|---|
   | Historical import (`IsHistoricalImport`) | Exactly `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.` and nothing else about submission or approval — no name, no date, no "Sistem". |
   | Never sent (`Draft`, `SubmissionNumber = 0`) | `Hələ təqdim olunmayıb` (the existing `notSubmittedYetNote`), plus the previous correction reason if this draft is a correction. |
   | Waiting (`PendingApproval`) | Göndərən — name · Göndərilib — date and time · the submission count in words (5.6) · the previous correction reason with who asked for it and when, when there is one. |
   | Returned (`ReturnedForCorrection`) | Düzəliş tələb edən — name · Tarix — date and time · Səbəb — the reason; then the submission facts of the cycle that was returned. |
   | Approved in this application | Təsdiqləyən — name · Təsdiq tarixi — date and time; then the submission facts (who sent it, when, which time, the previous reason if any). |

   Dates use the existing `formatWorkflowMoment`. The labels (`Göndərən`, `Göndərilib`, `Əvvəlki düzəliş
   səbəbi`, `Düzəliş tələb edən`, `Təsdiqləyən`, `Təsdiq tarixi`, `Səbəb`, `Tarix`) live in
   `components/workflow/labels.ts`.
4. The existing missing-price note and the existing amount line (`Məlum qiymətlər üzrə məbləğ: … · N sətir`),
   **with their wording unchanged** — that wording is Task 5's. What is removed from that line is only the moment
   fragments (`· Təqdim: …`, `· Təsdiq: …`, `· Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb`,
   `· Hələ təqdim olunmayıb —`), because the facts above now carry them.
5. The existing "Düzəliş tələb olunur. …" note for a returned request stays as it is (Task 5 owns its words).

New text introduced by this task must not contain the word "Versiya" (brief: version information is given in
business language).

### 5.6 The submission count in business language

One function, unit-tested, turns `SubmissionNumber` into words:

- 1 → `İlk göndəriş`
- 2 → `İkinci göndəriş`, 3 → `Üçüncü göndəriş`, 4 → `Dördüncü göndəriş`, 5 → `Beşinci göndəriş`
- 6 and above → the number with the correct Azerbaijani ordinal suffix and `göndəriş`: `6-cı`, `7-ci`, `8-ci`,
  `9-cu`, `10-cu`, `11-ci`, `12-ci`, `20-ci`, `30-cu`, `40-cı`, `60-cı`, `90-cı`, `100-cü` (suffix follows the last
  pronounced number word).
- When the number is 2 or more and a `PreviousReturn` exists, append ` · düzəliş tələbindən sonra`.

### 5.7 The buttons are found without searching and stay visible (E)

- `WorkflowPanel` stays the first element of the right-hand column, above `RevisionPanel` and the latest-version
  note.
- On wide screens the column stays sticky (`lg:sticky lg:top-4` — accepted behaviour, the audit liked it), and it
  must never be taller than the viewport: cap it (e.g. `lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`) so a tall
  correction panel cannot push the action row off the screen. The action row is the first thing in the column, so
  it is visible whenever the column is.
- Narrow screens keep today's order (the panel follows the headline). Anything more is Task 12.

### 5.8 "Düzəliş tələb et" (F)

- `returnLabel` becomes `Düzəliş tələb et`. It is the panel button, the dialog title, the dialog's confirm button
  and the inbox row button.
- `workflowErrors.reasonRequired` becomes `Düzəliş tələb etmək üçün səbəb yazılmalıdır.`
- The dialog keeps refusing to confirm while the reason is empty (4.2). The server keeps refusing an empty reason.
- In the dialog, replace the subtitle's `· Versiya N` and the `Versiya` fact with the submission count in words
  (5.6). The other facts in the dialog are unchanged.
- History labels (`Düzəlişə qaytarıldı` etc.) are **not** changed here — Task 5.

---

## 6. Backend requirements — summary for the Coder

- `ICurrentUserContext.cs`: the approval-authority definition; `BaxOrdersPolicies.CanViewApprovals`.
- `SecuritySetup.cs`: `CanDecideOrders` from the definition; new `CanViewApprovals` (Manager, Admin).
- `ApprovalsController`: `[Authorize(Policy = CanViewApprovals)]`.
- `OrdersController`: approve/return stay on `CanDecideOrders` (which now excludes Admin).
- `AuthController.MeAsync` and `CurrentUserDto`: `CanDecideOrders` from the definition, new `CanViewApprovals`.
- `OrderWorkflowDtos.cs`: `mayDecide` from the definition; `BlockedByMissingAuthority`; `DecisionFacts`.
- `OrderWorkflowService`: authority check in approve/return; compute `DecisionFacts` in `GetAsync` and after a
  transition.
- `ApprovalInboxDtos` / `ApprovalInboxQueries`: carry `BlockedByMissingAuthority`; the summary's
  "blocked for me" count and the `BlockedForMe` filter include it. Default sort unchanged.
- `IUserDirectory` / `IdentityUserDirectory`: active-approver count; last-approver guard.
- `IdentityInitializer`: startup warning when there is no active approver.
- No new EF migration and no schema change. If one seems necessary, **STOP** and report why.

## 7. Frontend requirements — summary for the Coder

- `api/auth.ts`: `canViewApprovals`; `anonymousUser` updated.
- `api/workflow.ts`: `blockedByMissingAuthority`, the decision-facts type.
- `layout/navigation.ts`, `App.tsx`, `auth/RequireAuth.tsx`: the inbox requires `canViewApprovals`.
- `auth/labels.ts`: role descriptions (5.1).
- `components/workflow/labels.ts`: `returnLabel`, `reasonRequired`, the fact labels, the missing-authority note,
  the historical-import sentence (4.1, exact), the submission-count function (5.6).
- `components/workflow/WorkflowPanel.tsx`: rebuilt per 5.5.
- `components/workflow/WorkflowDialog.tsx`: 5.8.
- `components/approvals/ApprovalRows.tsx`: missing-authority note; button label via `returnLabel`.
- `pages/OrderDetailPage.tsx`: the right-hand column per 5.7 only. Nothing else on the page changes.
- `pages/AdminUsersPage.tsx`: the no-approver warning (5.3).

---

## 8. Safety and STOP conditions

- **No database access.** Do not connect to `baxorders_dev` or any real database, do not run `psql`, `pg_dump`,
  `dotnet ef`, or any tool under `tools/`. Tests use the throw-away test databases the fixtures create.
- Do not create, change, disable or delete any real user or role. Do not grant approval authority to anybody.
- No EF migration, no schema change. STOP if one appears necessary.
- Do not touch HD-002's 94 rows or any pricing classification (you have no access anyway; do not add code that
  would change them).
- Do not weaken self-approval or own-contribution (OC-16). They stay in the domain for every role.
- Do not commit, push or merge. Do not edit anything under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement here cannot be met without changing an owner decision,
  STOP with `BLOCKED_HUMAN` and say which line.

## 9. Invariants — MUST NOT CHANGE

- The analysis part of the order page: the selected comparison basis in the URL (Task 1), the reconciling totals
  (Task 1b/1c), "Qiymət yoxdur" / "Daxili təminat" and the pricing classifications (Task 2), the 27-object catalogue
  and its counts (Task 3). `DecisionHeadline`, `CauseSummary`, `DriverList`, the lines table and its cells are not
  edited.
- The right-hand column stays sticky on wide screens.
- "Təsdiq gözləyənlər" lists requests oldest submission first by default.
- 4.2: an empty reason is refused by the domain and by the dialog.
- Self-approval and own-contribution rules, for every role.
- The workflow history is append-only and shows the name as recorded at the time.
- The Coordinator's rights: import, submit, revise — unchanged.
- The admin keeps every section and page they have today (inbox included, read-only for decisions).
- No real data, users or roles change. No schema change.

## 10. Acceptance criteria (this part)

1. Opening an order waiting for approval as a Rəhbər, the first thing in the right-hand column is the action row with
   `Təsdiqlə` and `Düzəliş tələb et`; the column is sticky and capped to the viewport on wide screens.
2. `Düzəliş tələb et` cannot be sent without a reason — the dialog does not allow it and the endpoint answers
   4xx without changing anything. With a reason it succeeds.
3. After the coordinator corrects and resends, the panel says `İkinci göndəriş · düzəliş tələbindən sonra` and shows
   the Rəhbər's reason with their name and the moment.
4. After approval the panel shows who approved and when. The status appears once on the page — in the header —
   and not in the panel.
5. An admin — without approval authority — cannot approve or return: the endpoints answer 403, the service
   refuses, no button is offered, and the panel and inbox say `Təsdiq səlahiyyətiniz yoxdur. …`. The admin still
   opens "Təsdiq gözləyənlər" and sees every waiting order.
6. A Rəhbər can approve and return. `/auth/me` reports `canDecideOrders: true` for Rəhbər and false for Admin and
   Koordinator; `canViewApprovals` true for Rəhbər and Admin.
7. The last active user with approval authority cannot be disabled or moved to another role; the users page warns
   when there is no active approver; the API logs a warning at startup in that case.
8. A historical Excel order's panel reads exactly `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.`
   and shows no name and no date for submission or approval.
9. No new text in the panel or dialog contains "Versiya".
10. Everything in §9 still holds; all suites and both builds are green.

## 11. Required tests

Backend unit tests:

- the approval-authority definition: true for `Manager` only; false for `Admin`, `Coordinator`, null, unknown;
- `AllowedWorkflowActionsDto.For` — update the existing theory in `UnitTests/Orders/OrderWorkflowTests.cs`: Admin on
  `PendingApproval` becomes (canSubmit false, canApprove false, canReturn false) with
  `BlockedByMissingAuthority` true; Manager unchanged; `BlockedByMissingAuthority` takes precedence over the other two
  reasons;
- the decision-facts computation over hand-built event lists: first submission; returned then resubmitted unchanged
  (2, previous reason); returned, corrected as V2, V2 submitted (2, previous reason from V1); a third round (3,
  latest reason); approved (decision = approver); returned (decision = returner and reason, previous return = the
  one before); historical import (flag, every other field null); a second-import version not linked by a revision
  starts at 1;
- the submission-count wording function for 1–12, 20, 30, 40, 60, 90, 100, and the `· düzəliş tələbindən sonra`
  suffix.

Backend integration tests (real PostgreSQL, the existing fixtures):

- over HTTP with real cookies and antiforgery, as in `RoleWorkflowEndToEndTests`: a Rəhbər approves; an Admin gets
  403 on approve and on return; an Admin gets 200 on the inbox and every row has `canApprove: false`,
  `blockedByMissingAuthority: true`; a Coordinator gets 403 on the inbox;
- the service refuses approve/return for an Admin with `ForbiddenException`, independently of the endpoint;
- empty reason → refused, nothing written (no event, status unchanged); reason given → returned, event carries it;
- the full cycle submit → return with reason → correct (V2) → resubmit → approve, asserting `DecisionFacts` at
  every step (number, submitter, previous reason, decision);
- a request carried in with `ImportedAsApproved` (build it the way `HistoricalApprovalTests` does) has
  `IsHistoricalImport` true and no names or dates in the facts;
- `/auth/me` flags for all three roles;
- the last-approver guard: disabling or re-roling the only active Rəhbər fails and changes nothing; with a second
  active Rəhbər it succeeds; the active-approver count is right;
- the inbox default order is still oldest submission first.

Existing tests whose expectation changes **because 4.3 changes the rule** — update them, and list each one in the
report with the reason. Do not delete coverage: where an Admin was used only as "a second person who may decide",
switch that account to a Rəhbər; where a test proves that an admin is refused for self-approval or own
contribution, keep the domain-level proof (unit tests on `OrderRequest`, which has no roles) and change the
endpoint-level expectation to the new refusal (403, missing authority). Known places:
`UnitTests/Orders/OrderWorkflowTests.cs` (theory rows for Admin), `IntegrationTests/OrderWorkflowTests.cs`
(~165–251), `RoleWorkflowEndToEndTests.cs` (~104), `ApprovalInboxTests.cs`, `ApprovalInboxEndToEndTests.cs`,
`RevisionEndToEndTests.cs` (~203–278), `AuthenticationTests.cs`. The Coder must search for others.

Frontend tests (vitest):

- `WorkflowPanel`: no status badge or status word in the panel for any status; the action row renders before the
  facts; `Düzəliş tələb et` label; facts for pending / returned / approved / never sent; the exact 4.1 sentence and
  the absence of any date or "Sistem" for a historical import; the missing-authority note; no "Versiya" in the
  panel;
- `WorkflowDialog`: confirm disabled while the reason is empty for `Düzəliş tələb et`; no "Versiya";
- `OrderDetailPage`: the status is rendered once; `WorkflowPanel` is the first child of the sticky column; the
  column carries the sticky and max-height classes;
- navigation/route: an Admin with `canViewApprovals` sees and opens "Təsdiq gözləyənlər"; a Coordinator does not;
- `AdminUsersPage`: the no-approver warning appears when the count is 0 and not otherwise; role descriptions.

Existing frontend tests that assert `Düzəlişə qaytar`, the panel's status badge, the old moment fragments, or
`canDecideOrders` for Admin change with this task; update them and list them in the report.

## 11.5 Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`TreatWarningsAsErrors`). If the running API locks
  `src/BaxOrders.Api/bin`, build with `--artifacts-path` as Task 3 did and say so.
- `dotnet test` — unit and integration, all green; state the counts (baseline at `4827cb4`: 702 unit, 581
  integration).
- `npx tsc -b --noEmit`, `npx vitest run` (baseline 387), `npm run build` — all green.
- `git diff --stat` and `git status` in the report; the diff touches only `src/`, `frontend/`, `tests/`.

## 11.6 Go-live precondition (must appear in the report, verbatim in substance)

From the moment this code runs against the real database, an administrator can no longer approve. Before the API is
restarted on this code, whoever restarts it must make sure an **active user with the Rəhbər role** exists — it can
be created today on "İstifadəçilər" with role "Rəhbər", because that role already exists. After the restart, the
users page shows the warning of 5.3 if there is none. The Coder has not checked the real users and has changed none.

---

## 12. Where each brief acceptance criterion lands

| Brief acceptance (business language) | Part |
|---|---|
| Test mühitində "Təsdiq gözləyənlər"də bir test sifarişi görürəm. Real 27 obyektin heç birində heç nə dəyişməyib. | 04b |
| Sifarişi açanda qərar düymələrini axtarmıram; təhlilə baxarkən onlar görünən qalır. | 04a (§5.5, §5.7) |
| Səbəb yazmadan "Düzəliş tələb et" göndərə bilmirəm. Səbəblə qaytarıram; … panel ikinci göndərmə olduğunu və mənim səbəbimi göstərir. | 04a (§5.4–5.6, §5.8); proven again in the test environment in 04b |
| Təsdiqləyəndən sonra panel kimin və nə vaxt təsdiqlədiyini göstərir; status bir dəfə görünür. | 04a (§5.5) |
| Təsdiq səlahiyyəti olmayan admin hesabı sifarişi təsdiqləyə bilmir. | 04a (§5.1, §5.2); proven again in 04b |
| Bu task canlıya çıxandan sonra … təsdiq edə bilən kimsənin olmadığı ara dövr yaranmır. | 04a (§5.3, §11.6) |
| Köhnə, Excel-dən gəlmiş sifarişdə panel "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." yazır; uydurma ad və tarix yoxdur. | 04a (§5.4, §5.5) |

The brief's "İstədiyim nəticə" first bullet (the flow tested end to end in a test environment, with the Rəhbər role)
is 04b.

---

## Assumptions the Planner made

Each is a design decision the brief did not state. None is a business rule. Any of them can be overturned at review.

1. The brief's "Rəhbər rolu" is the existing role stored as `Manager` and shown as "Rəhbər"; Task 04 makes it the
   separate approval role rather than adding a second role with the same name, and its stored identifier is not
   renamed (§3).
2. Approval authority is attached to the role, not granted per user: Rəhbər holds it, Administrator and Koordinator
   do not. Giving it to another role later is one line in one definition.
3. The admin keeps opening "Təsdiq gözləyənlər" read-only, so no section disappears before Task 14 decides the menus.
4. The "no interim period" criterion is met by a last-approver guard, a warning on the users page and in the startup
   log, and a stated go-live precondition — not by giving anybody authority automatically.
5. "How many times it was sent" counts `SubmittedForApproval` events along the correction chain; a new version made
   by a second import starts again at one.
6. "The previous correction reason" is the most recent request for correction before the current submission.
7. The submission count is worded `İlk / İkinci / Üçüncü / Dördüncü / Beşinci göndəriş`, then the number with its
   ordinal suffix, plus `· düzəliş tələbindən sonra` when it follows a correction request.
8. The panel keeps its amount line with today's wording, because that wording is Task 5's; only the moment fragments
   leave it.
9. The history tab's existing "Təsdiqlənmiş kimi köçürülüb — Sistem — <carry-in moment>" entry is left as it is: it
   records when the order was carried in, not an approval, and the panel — which is what 4.1 governs — shows no name
   or date.
10. The dialog's "Versiya" is replaced by the submission count in words, because the dialog is the decision's own
    confirmation; the page header's "Versiya" is left to Task 5.
11. History labels such as "Düzəlişə qaytarıldı" keep their wording until Task 5; only the action's name becomes
    "Düzəliş tələb et".
12. The wording of the missing-authority note, the last-approver refusal and the no-approver warning is the
    Planner's.
13. Task 04 is split into 04a and 04b so each is one reviewable diff that one Coder session can finish.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Rəhbər rolu və təsdiq səlahiyyəti — the definition, every place that now uses it (file:line), what Admin can and
   cannot do now, how `CanViewApprovals` keeps the inbox open for Admin.
2. Ara dövr olmaması — the guard, the warning, the startup log; and §11.6 in full.
3. Qərar faktları — the DTO, the chain rule, one worked example (submit → return → correct → resubmit → approve)
   with the facts at every step.
4. Qərar paneli — what the panel shows in each state (the table of §5.5 filled from the real rendering), the exact
   4.1 sentence, where the buttons are, the sticky/max-height change.
5. "Düzəliş tələb et" — every place the label changed.
6. Testlər — new tests; changed tests, each with the reason (4.3 or the brief); counts; builds.
7. Toxunulmayanlar — confirmation that no database was reached, no user or role changed, no migration added, and
   that §9 holds.
8. Sonrakı tapşırıqlar üçün qeydlər — anything found and left for Task 04b, 05, 12 or 14.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
