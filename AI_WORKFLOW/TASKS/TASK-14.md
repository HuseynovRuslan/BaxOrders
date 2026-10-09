# TASK 14 — ROLA GÖRƏ MENYU (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-14.md`. This is the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins: the Coder stops and reports.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `e65747b`
(Task 13c accepted).

This task changes application code only. It does **not** change real business data. It has no data migration and
needs no database access. There is no `DATA_MIGRATION` marker in this file, on purpose.

The task is not split. It is one reviewable diff: a menu rule, four route and endpoint locks, one read-only filter,
one link and tests. One Coder session can finish it.

---

## 1. Context

Ənvər müəllim should see only the sections he needs for a decision when he signs in with his own Rəhbər account. The
audit of 23.09.2026 ran under an administrator account ("Administrator" in the header). It found three sections the
Rəhbər does not need (Excel importları, İstifadəçilər, Məhsullar — then an empty "hazırlanır" page), and it left open
whether Qiymət təsnifatı and Təchizatçılar belong in his menu.

The owner decided (brief, "Qəbul edilmiş qərarlar"):

- **14.1**: Təchizatçılar is visible to the Rəhbər, read-only. Qiymət təsnifatı is not in the main menu. It opens from
  the price warning, read-only.
- **14.2**: there is a separate Rəhbər role.
- **4.3**: only the Rəhbər role, or a role holding approval authority, approves. Being an admin grants nothing
  automatically.
- **4.3a**: the Rəhbər role is created in Task 4. This task applies its menu and visibility rules.

---

## 2. Verified current behaviour (repository at `e65747b`)

Everything below was read from the code, not assumed.

### 2.1 Roles and flags (Task 04a, unchanged since)

- Three roles, one per user: `Coordinator` (Koordinator), `Manager` (shown as **Rəhbər**, `auth/labels.ts`), `Admin`
  (Administrator). Task 04a made `Manager` the Rəhbər role and the only holder of approval authority
  (`ApprovalAuthority.IsHeldBy`, `src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs:62`). **The role
  exists. This task must not create, rename or re-seed any role.**
- `/auth/me` (`AuthController.cs:150–173`) carries, per role:

  | Flag | Coordinator | Rəhbər (`Manager`) | Admin |
  |---|---|---|---|
  | `canManageImports` | ✓ | – | ✓ |
  | `canSubmitOrders` | ✓ | – | ✓ |
  | `canDecideOrders` | – | ✓ | – |
  | `canManageUsers` | – | – | ✓ |
  | `canManageCatalog` | ✓ | – | ✓ |
  | `canViewApprovals` | – | ✓ | ✓ |
  | `canDecideProductMatches` | – | – | ✓ |

### 2.2 The menu

`frontend/bax-orders-web/src/layout/navigation.ts` lists nine entries, in this order. `Sidebar.tsx` shows an entry
when it has no `requires` or when `user[requires]` is true:

| # | Entry | Route | `requires` | Rəhbər sees it today |
|---|---|---|---|---|
| 1 | İdarəetmə paneli | `/dashboard` | – | yes |
| 2 | Aylıq hesabat | `/dashboard/monthly` | – | yes |
| 3 | Təsdiq gözləyənlər | `/approvals` | `canViewApprovals` | yes |
| 4 | Excel importları | `/imports` | `canManageImports` | no |
| 5 | Obyektlər | `/locations` | – | yes |
| 6 | Məhsullar | `/products` | – | **yes: must go** |
| 7 | Təchizatçılar | `/suppliers` | – | yes |
| 8 | Qiymət təsnifatı | `/pricing-modes` | – | **yes: must go** |
| 9 | İstifadəçilər | `/admin/users` | `canManageUsers` | no |

So the Rəhbər's menu today has seven entries. The brief asks for five.

### 2.3 Routes (`App.tsx`)

- `/approvals` sits behind `RequirePermission permission="canViewApprovals"`, `/imports` behind `canManageImports`,
  `/admin/users` behind `canManageUsers`. `RequirePermission` (`auth/RequireAuth.tsx:36`) renders "Bu səhifəyə
  icazəniz yoxdur." instead of the page. Its `permission` type accepts only those three flags.
- `/products`, `/products/categories`, `/suppliers` and `/pricing-modes` have no guard.

### 2.4 The server behind the hidden sections

- `AdminUsersController` is `[Authorize(Policy = CanManageUsers)]` at class level, so a Rəhbər gets **403** on every
  users endpoint. That is already true.
- The four import controllers (`ImportsController`, `ImportReviewController`, `ImportRowCorrectionsController`,
  `ImportConfirmationController`, all under `api/v1/imports`) guard only their **writes** with `CanManageImports`.
  Their **reads** (`GET imports/{id}`, `…/rows`, `…/rows/{rowId}`, `…/unresolved*`, `…/corrections/candidates`,
  `…/readiness`, `…/confirmation/preview`) are open to anyone signed in. A Rəhbər who types the API address reads
  import data. `AuthenticationTests.A_manager_may_decide_but_not_submit_or_import` says so on purpose: "A manager
  reads the imports but changes nothing in them."
- No screen a Rəhbər can open calls `api/v1/imports/*`. The frontend calls them only from `api/imports.ts`,
  `api/review.ts` and `api/rows.ts`, which only the import screens use. The order page's "Mənbəyə bax" drawer reads
  `api/v1/orders/items/{id}/source` (`OrdersController`), not the import endpoints.

### 2.5 The read-only sections

- **Təchizatçılar** (`pages/SuppliersPage.tsx:72`): the "Dəyiş" button renders only when `canManageCatalog`. The only
  write, `POST api/v1/suppliers/{id}/price-requirement`, is `[Authorize(Policy = CanManageCatalog)]`. So the Rəhbər
  already cannot change anything. Nothing on the page says that it is read-only.
- **Qiymət təsnifatı** (`pages/PricingModeReviewPage.tsx:90`): checkboxes and decision buttons render only when
  `canManageCatalog`. `POST api/v1/pricing-mode-review` is `CanManageCatalog`. So the Rəhbər already cannot change
  anything. The page description reads as an instruction ("… qeyd edin").
- The pricing page's query (`PricingModeReviewQuery(Mode, Search, Page, PageSize)`,
  `Application/Orders/Pricing/PricingModeReviewDtos.cs:54`) cannot be narrowed to one order. Its totals
  (`Unresolved`, `MissingRequiredPrice`, `InternalFreeSupply`) always count the whole queue
  (`PricingModeReviewService.GetAsync`). The page keeps no state in the URL.

### 2.6 The price warning on the order page

- The warning a Rəhbər reads is in `components/decisions/DecisionHeadline.tsx:76–89`:
  `missingPriceCount(current.missingPriceItemCount)` in amber, e.g. "2 sətirdə qiymət yoxdur". While the decision
  context is missing, the fallback summary in `pages/OrderDetailPage.tsx:225–237` shows the same count. The workflow
  panel repeats it as a note (`WorkflowPanel.tsx:159`).
- **Nothing on the order page links to Qiymət təsnifatı.** No component in `src/` links to `/pricing-modes`.
- An order's missing-price count is its lines with `UnitPrice == null` and `PricingMode != InternalFreeSupply`
  (`ApprovalInboxQueries.cs:65`, Task 2). On the pricing page those lines are exactly the `Unresolved` and
  `PriceRequired` rows.

### 2.7 The header

`layout/CurrentUserMenu.tsx:21–24` shows the display name and `roleLabels[user.role]`. For a `Manager` account that
reads "Rəhbər". The audit saw "Administrator" because it signed in as an administrator. No test pins the Rəhbər's
header.

### 2.8 The empty section

- `components/PlannedFeature.tsx` ("Bu bölmə hələ hazırlanır. …") has been unused since 13b. Nothing imports it.
- `ProductsPage` has content since 13b (three tabs). `ProductsPage.test.tsx:224` already asserts the placeholder text
  is absent.

### 2.9 Carried in from Task 05b

05b left the controls that only a Coordinator or Administrator is ever shown with their wording. These are the
create-correction button and dialog ("Düzəliş versiyası yarat"), the line edit/add/remove dialogs and the remove-line
explanation (05b spec §3; `REVIEWS/TASK-05b.md`). 05b deferred them "to Task 14". Task 14's brief puts the hiding of
technical words out of scope ("Texniki sözlərin gizlədilməsi — Task 5"). The owner's Task 5 brief keeps technical
detail on admin screens "as needed". See §3.3 for how this task handles them.

---

## 3. How the brief maps onto this repository — differences resolved, no owner decision touched

### 3.1 "Rəhbər rolu üçün menyu" without a new role or a new flag

The menu is driven by the server's permission flags, never by a role name in the browser (`navigation.ts` says so).
The two entries the Rəhbər must lose, Məhsullar and Qiymət təsnifatı, are the catalogue's working screens. The flag
that already separates the people who shape the catalogue from the Rəhbər is `canManageCatalog` (Coordinator and
Admin: true; Rəhbər: false). Tying both entries to it gives exactly the brief's five entries for the Rəhbər. It changes
nothing for the Admin (all nine, 14: "Admin üçün heç bir bölmə itmir") and nothing for the Coordinator (the same seven
as today). No flag is added to `/auth/me`.

### 3.2 "Birbaşa linklə də açılmır" is a lock, not only a hidden link

For the two sections the brief names (Excel importları, İstifadəçilər):

- the screen: the routes are already behind `RequirePermission` (§2.3); this task proves it for the Rəhbər;
- the data: İstifadəçilər is already locked on the server. The import **reads** are not (§2.4). They get
  `CanManageImports` at class level, so the Rəhbər's typed API address answers 403 like the typed page address. The
  Coordinator and the Admin hold `CanManageImports`, so nothing changes for them, and no Rəhbər screen calls these
  endpoints (§2.4).

This reverses the comment of one existing test ("A manager reads the imports…"). That comment was a design decision
of Task 03's era, not an owner decision, and brief 14 now speaks to it.

### 3.3 The 05b carry-in

The texts 05b listed are shown only to a Coordinator or Administrator. Brief 14 does not ask to reword them and puts
technical words out of scope. The owner's Task 5 brief keeps technical detail on admin screens. So this task
**does not reword them**. What it owes 05b's deferral is the part that is about visibility: proof that a Rəhbər never
sees any of them (§5.7). This closes the carry-in without touching an owner decision.

### 3.4 "Qiymət xəbərdarlığından … açılır"

No such link exists today (§2.6), so this task adds it. The warning is about one order, so the link opens the pricing
page narrowed to that order's unpriced lines. For that, the pricing query gains an optional, read-only order filter
(§5.4). Without the filter the page and the endpoint behave byte for byte as today.

---

## 4. Scope

In scope:

- A. the menu per role (§5.1);
- B. routes: `/products` and `/products/categories` behind `canManageCatalog`; the existing guards on `/imports` and
  `/admin/users` proven for the Rəhbər (§5.2);
- C. the import reads locked to `CanManageImports` on the server (§5.3);
- D. the pricing page narrowed to one order: the backend filter and the page's URL state (§5.4);
- E. the link from the order page's price warning (§5.5);
- F. read-only pages say they are read-only (§5.6);
- G. the header, the 05b carry-in, the empty section (§5.7, §5.8);
- H. tests.

Out of scope:

- creating, renaming or re-seeding a role; approval authority itself; the decision panel; the mandatory reason
  (Task 4, brief);
- rewording technical terms anywhere, including the 05b list and the codes on Qiymət təsnifatı (Task 5, brief);
- Task 16's import price states; the import screens' content;
- any change to what the Coordinator or the Admin sees or may do, except the one wording change on read-only pages,
  which they never see (§5.6);
- the product-match and category **endpoints**: their reads stay open to everyone signed in (13a/13b design), and
  their writes are already locked;
- HD-002.

---

## 5. Required behaviour

### 5.1 The menu (A)

In `layout/navigation.ts`:

- `NavItem.requires` accepts `'canManageCatalog'` as well.
- `/products` (Məhsullar) and `/pricing-modes` (Qiymət təsnifatı) get `requires: 'canManageCatalog'`.
- Order and labels stay as they are. Nothing else changes in the list.
- Update the comments to say why: the catalogue's working screens are offered to those who shape the catalogue. The
  Rəhbər reaches Qiymət təsnifatı from the price warning instead (14.1).

The result, which the tests pin **exactly, in this order**:

| Role | Menu |
|---|---|
| Rəhbər | İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər, Obyektlər, Təchizatçılar |
| Admin | İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər, Excel importları, Obyektlər, Məhsullar, Təchizatçılar, Qiymət təsnifatı, İstifadəçilər (unchanged) |
| Koordinator | İdarəetmə paneli, Aylıq hesabat, Excel importları, Obyektlər, Məhsullar, Təchizatçılar, Qiymət təsnifatı (unchanged) |

The phone menu is the same `Sidebar`, so it follows automatically.

### 5.2 Routes (B)

In `App.tsx`:

- `RequirePermission`'s `permission` type accepts `'canManageCatalog'` (`auth/RequireAuth.tsx`).
- Wrap `products` and `products/categories` in `<RequirePermission permission="canManageCatalog" />`. Correct the
  "Everybody signed in may look" comment.
- `/pricing-modes` and `/suppliers` stay **unguarded**. The Rəhbər opens both, read-only (14.1).
- `/imports` and `/admin/users` keep their guards unchanged.

A Rəhbər who types `/imports`, `/admin/users`, `/products` or `/products/categories` gets the existing "Bu səhifəyə
icazəniz yoxdur." and never the page. No request of that page is made.

### 5.3 Import reads locked on the server (C)

- Add `[Authorize(Policy = BaxOrdersPolicies.CanManageImports)]` at **class level** to `ImportsController`,
  `ImportReviewController`, `ImportRowCorrectionsController` and `ImportConfirmationController`. The per-action
  attributes on the writes may stay (redundant but harmless) or go. The Coder chooses and says which.
- Update the class remarks and the comment in `AuthenticationTests.A_manager_may_decide_but_not_submit_or_import`
  (§9).
- Nothing else under `api/v1` changes its policy. In particular `OrdersController`'s `items/{id}/source` stays open,
  because the order page's "Mənbəyə bax" uses it for every role.

If a test or a screen turns out to need an import read as a Rəhbər, **STOP** and report it. Do not widen the policy.

### 5.4 The pricing page narrowed to one order (D)

Backend (read-only):

- `PricingModeReviewQuery` gains `long? OrderRequestId = null` as its **last** parameter, so existing positional
  callers still compile. It is bound from the query string (`?orderRequestId=`).
- In `PricingModeReviewService.GetAsync`, when `OrderRequestId` is set, narrow `unpriced` to that order's lines
  **before** the totals. That way the three totals, `totalCount` and the rows all describe that order. When it is
  null, the SQL and the response are exactly as today.
- An unknown or empty order returns zero rows and zero totals, not 404.
- `SetAsync` is not touched.

Frontend:

- `api/pricing.ts`: `PricingModeReviewQuery.orderRequestId?: number`, sent as `orderRequestId`.
- `pages/PricingModeReviewPage.tsx` reads `order` from the URL (`useSearchParams`). When it is a positive integer:
  - the request carries `orderRequestId`;
  - the mode filter starts at **"Hamısı"**, not "Təsnif edilməyib", so every unpriced line of the order is listed
    whatever its state;
  - above the filters, a scope line: `<Obyekt> · <Ay> sifarişinin qiyməti olmayan sətirləri`, taken from the first
    row. With no rows it reads `Bu sifarişdə qiyməti olmayan sətir yoxdur.` and the empty state is not shown twice;
  - two links on that line: `Sifarişə qayıt`, which opens `orderLink(order, parseBasis(params))`, so the reader
    returns with the basis they left (Task 1), and `Bütün sətirlər`, which opens `/pricing-modes` unscoped;
  - the three totals are the order's, and `Təsnif edilməyib` + `Alış qiyməti tələb olunur` equals the order page's
    warning count (§2.6).
- Without `order` in the URL, the page is exactly as today.

### 5.5 The link from the price warning (E)

- Add `pricingReviewLink(orderRequestId, selection)` beside `orderLink` in `analytics/basisParams.ts`. It returns
  `/pricing-modes?order=<id>` plus the basis parameters `orderLink` would carry.
- Add `pricingReviewLinkLabel = 'Qiymət təsnifatına bax'` to `pricing/labels.ts`.
- In `DecisionHeadline.tsx`, right after the amber `missingPriceCount(…)` span, and only when
  `current.missingPriceItemCount > 0`: ` · ` then a `Link` with that label to
  `pricingReviewLink(context.orderRequestId, selection)`. Style it as the headline's other small links (underline,
  slate). The existing text, its colour and the internal-supply part stay exactly as they are.
- In the fallback summary of `OrderDetailPage.tsx` (§2.6), the same link after `missingPriceCount(…)`, with the page's
  `selection`.
- The workflow panel's note is not changed.
- The link is shown to every role that sees the warning. Everyone who can open the order can open the pricing page.

### 5.6 Read-only pages say so (F)

- Add `readOnlyNote = 'Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz yoxdur.'` to `auth/labels.ts`.
- `SuppliersPage`: when `canManageCatalog` is false, show that note under the header, in the page's calm sky or
  slate style, with `role="note"`. Nothing else changes.
- `PricingModeReviewPage`: when `canManageCatalog` is false, show the same note. The header description becomes
  `Qiyməti olmayan sətirlər və onların təsnifatı` instead of the instruction "… qeyd edin". No checkbox, no decision
  button and no dialog appear. They are already gated; the tests pin it.
- The Coordinator and the Admin see both pages exactly as today.

### 5.7 The header and the 05b carry-in (G)

- The header needs no code change: for a Rəhbər account it shows the person's name and "Rəhbər". Pin it with a test
  (§9). If the Coder finds "Administrator" rendered anywhere in the layout for a Rəhbər, **STOP** and report it. That
  is not expected.
- 05b's Coordinator/Admin-only controls keep their wording (§3.3). Prove that none of them renders for a Rəhbər: on
  the order page, with a Rəhbər user and a revision payload whose `canEditRevision` is false, there is no
  create-correction button, no line edit/add/remove control and no text matching `/versiya/i`. If an existing test
  already proves this (05b's `OrderDecisionPage.test.tsx` / `OrderRevisionPage.test.tsx`), name it in the report
  instead of adding a new one.

### 5.8 The empty section (G)

- Delete `frontend/bax-orders-web/src/components/PlannedFeature.tsx` with `git rm` (the Coder's permission). Deleting
  it means deleting it; a comment-only placeholder is not acceptable (HD-005).
- After the change, `grep -r "hazırlanır" frontend/bax-orders-web/src` finds only "Plan hazırlanır…" (the bulk-action
  dialog's loading text) and test assertions. Put the grep output in the report.

---

## 6. Backend requirements — summary

- `ImportsController`, `ImportReviewController`, `ImportRowCorrectionsController`, `ImportConfirmationController`:
  class-level `CanManageImports`.
- `PricingModeReviewDtos.cs`: `OrderRequestId` on the query. `PricingModeReviewService.GetAsync`: the order filter
  before the totals. `PricingModeReviewController`: remarks mention the filter.
- No new policy, no new flag on `/auth/me`, no change to `SecuritySetup.cs` except comments if needed.
- No EF migration, no schema change. If one seems necessary, **STOP**.

## 7. Frontend requirements — summary

- `layout/navigation.ts` (§5.1); `auth/RequireAuth.tsx` and `App.tsx` (§5.2).
- `api/pricing.ts`, `pages/PricingModeReviewPage.tsx` (§5.4, §5.6); `pages/SuppliersPage.tsx` (§5.6).
- `analytics/basisParams.ts`, `pricing/labels.ts`, `components/decisions/DecisionHeadline.tsx`,
  `pages/OrderDetailPage.tsx` (the fallback summary only) (§5.5).
- `auth/labels.ts` (`readOnlyNote`).
- `components/PlannedFeature.tsx`: deleted.
- Any new visible text must pass the old-terms sweep (`findOldTerms` → `[]`).

---

## 8. Safety and STOP conditions

- **No database access.** Do not connect to `baxorders_dev` or any real database. Do not run `psql`, `pg_dump`,
  `dotnet ef` or any tool under `tools/`. Tests use the throw-away databases their fixtures create.
- Do not create, change, disable or delete any user or role, real or seeded. Do not touch `IdentityInitializer`'s
  role list. Do not grant approval authority to anybody.
- Do not change `ApprovalAuthority`, `ProductMatchAuthority`, `CanDecideOrders`, `CanViewApprovals`,
  `CanManageCatalog`, `CanManageUsers` or `CanDecideProductMatches`.
- No EF migration, no schema change.
- HD-002's 94 rows and every pricing classification: untouched. The pricing change is a read filter only.
- Do not commit, push or merge. Do not edit anything under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement here cannot be met without changing an owner decision, STOP
  with `BLOCKED_HUMAN` and name the line.
- If a Rəhbər screen turns out to call an import endpoint (§5.3), or an existing test other than those §9 names fails,
  STOP and report it. Do not change that test's expectation.

## 9. Invariants — MUST NOT CHANGE

- **Admin:** every one of the nine sections, every page, every action as today. `canDecideOrders` stays false, and
  approve/return still answer 403 (4.3).
- **Koordinator:** the same seven menu entries, the same pages, the same actions.
- **Rəhbər:** approval and correction requests work as in Task 4. The inbox, dashboard, monthly report, objects, order
  page and product history show the same figures, words and layout as at `e65747b` (Tasks 1–13), apart from the one
  added link (§5.5).
- `/auth/me`: the same fields and the same values for every role.
- The pricing endpoint without `orderRequestId`: the same SQL result and response for every existing query. Its
  writes: unchanged.
- The order page's basis travels in the URL, and "Geri" / "Sifarişə qayıt" returns it (Task 1).
- Task 2's price states and counts. Task 3's 27 objects. Task 9's colours. Task 12's phone layout. Task 13's product
  pages for the Admin.

---

## 10. Acceptance criteria

Each maps to the brief's acceptance (§12).

1. With a Rəhbər account the menu lists exactly, in order: İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər,
   Obyektlər, Təchizatçılar. The header shows the person's name and "Rəhbər", and not "Administrator".
2. On Təchizatçılar the Rəhbər sees the list and the "yalnız baxış" note, and no "Dəyiş" button.
   `POST api/v1/suppliers/{id}/price-requirement` answers 403 to a Rəhbər and changes nothing.
3. On an order with missing prices, the warning carries "Qiymət təsnifatına bax". It opens Qiymət təsnifatı narrowed to
   that order, under "Hamısı", with the "yalnız baxış" note, no checkbox and no decision button. Its "Təsnif edilməyib"
   + "Alış qiyməti tələb olunur" equal the warning's count. "Sifarişə qayıt" returns to the order with the same basis.
   `POST api/v1/pricing-mode-review` answers 403 to a Rəhbər and changes nothing.
4. A Rəhbər who types `/imports` or `/admin/users` gets "Bu səhifəyə icazəniz yoxdur." and not the page. The same holds
   for `/products` and `/products/categories`. Every `GET` under `api/v1/imports/…` and `api/v1/admin/users…` answers
   403 to a Rəhbər.
5. With an Admin account the menu is the nine entries of today, every page opens as before, and approve/return answer
   403. With a Koordinator account the menu is the seven entries of today, and import reads and writes still work.
6. `PlannedFeature.tsx` is gone. No page anyone can reach renders "Bu bölmə hələ hazırlanır".
7. None of 05b's Coordinator/Admin-only controls, and no "versiya" text, renders for a Rəhbər on the order page.
8. The pricing endpoint without `orderRequestId` returns the same response as before. With it, only that order's
   unpriced lines and totals.
9. §9 holds. All suites and both builds are green.

---

## 11. Required tests

Backend integration (`tests/BaxOrders.IntegrationTests`, real PostgreSQL, over HTTP with real cookies and antiforgery
as `AuthenticationTests` does):

- **Rəhbər**, on a fixture with one real import (or with ids that exist in the fixture, so a 403 cannot be a 404 in
  disguise): 403 on `GET imports/{id}`, `imports/{id}/rows`, `imports/{id}/rows/{rowId}`,
  `imports/{id}/unresolved/summary`, `imports/{id}/unresolved`, `imports/{id}/corrections/candidates`,
  `imports/{id}/readiness`, `imports/{id}/confirmation/preview`; 403 on `GET admin/users`. 200 on `GET suppliers` and
  `GET pricing-mode-review`. 403 on `POST suppliers/{id}/price-requirement` and on `POST pricing-mode-review`, with
  the supplier's requirement and the line's `PricingMode` unchanged afterwards.
- **Koordinator** and **Admin**: the same import reads answer 200 on the same fixture.
- **Pricing filter**: a fixture with two orders that both have unpriced lines in different states. With
  `orderRequestId` only that order's rows come back, and the totals and `totalCount` are that order's. `Unresolved +
  MissingRequiredPrice` equals the order's missing-price count as the order read model reports it. Without the
  parameter, the serialised response equals a response built with the query exactly as before (same totals, same
  rows). An unknown id gives zero rows and zero totals.
- Deliberately changed: `AuthenticationTests.A_manager_may_decide_but_not_submit_or_import`. Its comment "A manager
  reads the imports but changes nothing in them" becomes the brief's rule, and it gains a `GET` 403 assertion. Brief
  line: "Excel importlarının … linkini əllə yazsam da açılmır." Every existing assertion in it stays.

Backend unit: none required. Add one if the filter is factored into a pure function.

Frontend (vitest):

- `auth/auth.test.tsx`, "the navigation": the exact list and order for each of the three roles (§5.1), using the
  existing `person()` helper. The existing tests stay. Any whose name says "every role" but now asserts a removed
  entry is corrected and listed.
- Routes: with a Rəhbər, `/imports`, `/admin/users`, `/products` and `/products/categories` render "Bu səhifəyə
  icazəniz yoxdur." and not the page. With a Koordinator and an Admin, `/products` renders. With a Rəhbər,
  `/suppliers` and `/pricing-modes` render.
- Header (`layout/Header.test.tsx` or a `CurrentUserMenu` test): a `Manager` user shows their name and "Rəhbər", and
  no "Administrator".
- `SuppliersPage.test.tsx`: without `canManageCatalog`, the note is shown and there is no "Dəyiş". With it, no note.
- `PricingModeReviewPage.test.tsx`: without `canManageCatalog`, the note and the read-only description are shown, with
  no checkbox and no decision button. With `?order=42`, the request carries `orderRequestId: 42`, "Hamısı" is pressed,
  the scope line names the object and month, "Sifarişə qayıt" keeps the basis from the URL, and "Bütün sətirlər" drops
  the scope. With no `order`, the request and the default filter are as today.
- `DecisionHeadline` (its test file, or `OrderDecisionPage.test.tsx`): with `missingPriceItemCount > 0` the link reads
  "Qiymət təsnifatına bax" and points at `/pricing-modes?order=<id>&<basis>`. With 0 there is no link. With only
  internal supply there is no link. The warning text is unchanged.
- `basisParams` test: `pricingReviewLink` carries the same basis parameters as `orderLink`.
- §5.7: the Rəhbər-without-revision-rights case on the order page (or the named existing test).
- `findOldTerms` over the new texts returns `[]`.

No existing expectation may be weakened. Every changed existing test is listed in the report with the brief line
behind it.

## 11.5 Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `src/BaxOrders.Api/bin`, build and
  test with `--artifacts-path` into the scratchpad, say so, and do not stop the API.
- `dotnet test BaxOrders.slnx`: baseline 991 unit / 751 integration. Give the new counts.
- `npm run --prefix frontend/bax-orders-web test` (baseline 44 files / 849 tests) and `… build`: green, with counts.
  `npx tsc -b --noEmit` clean.
- `git diff --stat` and `git status`. The diff touches only `src/`, `frontend/`, `tests/`. `PlannedFeature.tsx` shows
  as deleted.

## 11.6 Operator notes (after review)

- No migration, no tool, no data change.
- Restart the API on the new commit **before** serving the new frontend. The old API ignores `orderRequestId` and would
  show the whole queue under an order's scope line.
- After the restart, a Rəhbər's typed `api/v1/imports/…` answers 403. Nothing the Rəhbər uses calls it.
- Live check (the operator's, with a real Rəhbər account): the five-entry menu; "Rəhbər" in the header; Təchizatçılar
  and Qiymət təsnifatı read-only; the warning link on an order with missing prices; `/imports` and `/admin/users`
  refused. With the Admin account: nine entries, as before.
- Rollback: `git reset` the commit. No data to restore.

---

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Rəhbər menu: İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər, Obyektlər, Təchizatçılar | §5.1; criterion 1 |
| Başlıqda "Administrator" yazılmır | §5.7; criterion 1 |
| 14.1: Təchizatçılar read-only; "Təchizatçılarda heç nəyi dəyişə bilmirəm" | §2.5, §5.6; criterion 2 |
| 14.1: Qiymət təsnifatı not in the menu, opened from the price warning read-only | §5.1, §5.4–5.6; criterion 3 |
| Excel importları, İstifadəçilər do not open by direct link | §5.2, §5.3; criterion 4 |
| Admin sees every section; no automatic approval authority (4.3) | §5.1, §9; criterion 5 |
| No empty ("hazırlanır") section for anyone; Məhsullar for the admin once filled | §5.1, §5.8; criteria 5, 6 |
| 14.2 / 4.3a: the Rəhbər role exists (Task 4); this task only configures it | §2.1, §8 |
| Rəhbər's screens keep Tasks 1–13's results | §9; criteria 8, 9 |
| Out of scope: role creation, the approval flow (Task 4); technical words (Task 5) | §4; §3.3 |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. The menu keeps being driven by the server's flags. Məhsullar and Qiymət təsnifatı are tied to the existing
   `canManageCatalog`, which already separates the Rəhbər from the Coordinator and the Admin. No new flag is added.
2. The Koordinator's menu and rights stay exactly as today. The brief speaks only of the Rəhbər and the Admin.
3. Məhsullar (and its Kateqoriyalar page) is also closed to the Rəhbər by direct link, like the two sections the brief
   names. It is not in his menu and nothing he uses links to it. Its server reads stay open, as 13a/13b designed.
4. "Does not open by direct link" is enforced on the server too for the import reads, not only on the screen.
   İstifadəçilər was already locked there.
5. The price-warning link sits on the order page's headline warning (and its fallback summary), not on the workflow
   panel's repeated note. It is shown to every role that sees the warning.
6. Opened from an order, Qiymət təsnifatı is narrowed to that order, starts on "Hamısı", counts that order's lines, and
   offers "Sifarişə qayıt" with the reader's basis and "Bütün sətirlər".
7. Read-only pages say so in one sentence (`Yalnız baxış: …`), and the pricing page's instruction-like description is
   replaced for a read-only reader. The wording is the Planner's.
8. The link label is "Qiymət təsnifatına bax". The URL parameter is `order` on the page and `orderRequestId` on the
   API.
9. 05b's Coordinator/Admin-only texts keep their wording (§3.3). Task 14 proves that the Rəhbər never sees them.
10. The header needs no change. The audit's "Administrator" was the account, not the code.
11. `PlannedFeature.tsx` is deleted rather than kept unused, so no "hazırlanır" page can come back through it.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git: branch, HEAD (`e65747b`), `git status --short`, `git diff --stat`.
1. Menyu: the rule (file:line), the three role menus as rendered by the tests.
2. Birbaşa link: the route guards, the four controllers' class-level policy, the 403 matrix from the integration
   test; the confirmation that no Rəhbər screen calls an import endpoint (the grep).
3. Yalnız baxış: Təchizatçılar and Qiymət təsnifatı for a Rəhbər. The pricing filter: DTO, service (file:line), and
   one worked example with the order's warning count and the page's totals.
4. Qiymət xəbərdarlığından keçid: where the link is, its URL with a basis, and the way back.
5. Başlıq, 05b siyahısı, boş bölmə: the header test, the 05b proof (new or named test), the deletion and the grep.
6. Testlər: new tests, changed tests each with its brief line, counts, builds.
7. Toxunulmayanlar: no database reached, no user or role changed, no migration; §9 holds.
8. Qeydlər: anything found and left for Task 16 or Task 15.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
