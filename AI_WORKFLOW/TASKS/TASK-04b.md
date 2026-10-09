# TASK 04b — TƏSDİQ AXINI: REAL DATADAN AYRI SINAQ MÜHİTİ VƏ AXININ BAŞDAN SONA SINAĞI (P0)

Priority: P0
Brief: `AI_WORKFLOW/BRIEFS/TASK-04.md` — the owner's settled requirement.
Part: **b of 2.** Runs only after Task 04a (`TASKS/TASK-04a.md`) is accepted and committed, and before Task 05. It
builds on 04a's approval authority, decision facts and decision panel and must not rework them; a defect found in
04a is reported, not fixed here.
Specification status: READY (queued behind 04a) — written by the Planner on 2026-09-24 from the brief and the
repository at `4827cb4`. Before starting, the Coder re-reads 04a's accepted code: where 04a named something
differently from what this file assumes, follow 04a's code and say so in the report.

This task builds a **separate** database with **synthetic** data. It never reads or writes the real database and
changes no real business data. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief requires that the approval flow be tested from start to finish **in a test environment separate from the
real data**, with the Rəhbər role:

> sifariş göndərilir → "Təsdiq gözləyənlər"də görünür → rəhbər təhlilə baxır → səbəb yazaraq "Düzəliş tələb et" →
> göndərən düzəldib yenidən göndərir → rəhbər təsdiqləyir. Sınaq Rəhbər rolu ilə aparılır.

And the owner decided:

- real orders are not approved, returned or changed; testing happens only in the test environment;
- no test object is added to the real 27-object catalogue (from Task 3).

The same environment is used later: Task 12 opens "Task 4-ün test sifarişi" on a phone, and Task 15 (decision 15.1)
checks the approval flow "ayrıca test sifarişi ilə, Task 4-ün test mühitində". So it must be something a person can
start, use in the browser, and reset — not only an automated test.

## 2. Verified current situation

- There is no test environment. The only databases are the real development database (`baxorders_dev`, reached
  through the API's user-secret `ConnectionStrings:BaxOrders`) and the throw-away databases the integration tests
  create and drop (`PostgresDatabaseFixture`, `IsolatedDatabase`, server from `TestDatabase:AdminConnectionString`
  or `BAXORDERS_TEST_POSTGRES`).
- `scripts/dev-postgres.ps1` runs a private local PostgreSQL cluster on port 55434 and keeps its password in
  `%LOCALAPPDATA%\BaxOrders\pg-dev.password`.
- The API listens on `http://localhost:5080` (`Properties/launchSettings.json`, profile `http`, environment
  `Development`). Migrations are applied at startup only in `Development` with `Database:ApplyMigrationsOnStartup`.
  User-secrets are loaded only in `Development`.
- The Vite dev server (`frontend/bax-orders-web/vite.config.ts`) serves on 5173 and proxies `/api` and `/health` to
  a hard-coded `http://localhost:5080`.
- Migrations seed reference data (`Persistence/Seed/ReferenceData.cs`) into every fresh database, including three
  locations the real catalogue no longer has. In a fresh sandbox database that is harmless: it is not the real
  catalogue.
- Historical orders are marked by `ImportedAsApproved` events written by migration
  `20260923122642_AddLinePricingModeAndHistoricalApproval`; `HistoricalApprovalTests` shows how to reproduce that on
  a test database by re-running that migration's SQL.
- Existing end-to-end tests (`RoleWorkflowEndToEndTests`, `ApprovalInboxEndToEndTests`, `RevisionEndToEndTests`)
  host the real API through `WebApplicationFactory<Program>` and drive it over HTTP with cookies and antiforgery
  tokens (`AuthenticatedApi`).
- `tools/BaxOrders.CatalogueMigration` is referenced by the integration tests, which is how a tool's logic is tested
  without running it.
- **The Coder profile cannot run `dotnet run` or any tool** (non-data task). It can run `dotnet build`,
  `dotnet test`, `npm run`, `npx vitest`, `npx tsc`. So everything this task delivers must be proved through tests;
  the first real creation of the sandbox database is a one-command step for whoever operates the machine (§5.6).

## 3. Scope

In scope:

- A. a sandbox database and the tool that creates, resets and drops it — synthetic data only, never the real
  database;
- B. the API and the UI able to run against it, and unmistakably marked as the test environment;
- C. the seeded test scenario: a waiting test order in "Təsdiq gözləyənlər", a draft to send, a historical order,
  and the three test accounts;
- D. the whole flow, with the Rəhbər role, proven end to end over HTTP against a sandbox database;
- E. tests of the guards that keep the sandbox and the real database apart.

Out of scope: everything 04a delivers (authority, facts, panel, button names); mobile (Task 12); menus (Task 14);
wording (Task 5); running the final audit (Task 15).

## 4. Required behaviour

### 4.1 The sandbox database (A)

- One dedicated PostgreSQL database named exactly **`baxorders_sandbox`**, on the same local server as the
  development database.
- Built from the application's own EF migrations — never a hand-written schema.
- Filled only with synthetic data (4.3). No real order, line, price, location, product, supplier or user is copied
  into it.

### 4.2 The sandbox tool (A)

A new console project `tools/BaxOrders.ApprovalSandbox`, registered in `BaxOrders.slnx` under `/tools/`, with three
fixed commands and no others (it accepts no SQL and no free-form database name):

| Command | Does |
|---|---|
| `--create` | Creates `baxorders_sandbox`, applies the migrations, seeds 4.3. Refuses if the database already exists. |
| `--reset` | Drops `baxorders_sandbox` and does `--create`. This is how the test order is made fresh again for Task 12/15. |
| `--drop` | Drops `baxorders_sandbox`. |

Guards — each one a small class with unit tests, and each one refuses **before** any connection is opened:

1. The database it creates, seeds, resets or drops is the sandbox database and nothing else. The command-line tool
   always uses exactly `baxorders_sandbox`. The logic accepts a name only if it starts with `baxorders_sandbox`
   (tests use `baxorders_sandbox_t_<random>`), and refuses any other name.
2. It refuses if that name equals the database named in the API's own development connection string
   (`ConnectionStrings:BaxOrders`) — the sandbox can never be the real database, even by misconfiguration.
3. The only other database it may connect to is the server's maintenance database (`postgres`), and only to issue
   `CREATE DATABASE` / `DROP DATABASE … WITH (FORCE)` for the sandbox name.
4. Seeding refuses to run on a database that already contains any order request, i.e. it seeds only a database it
   has just created.

Where the server connection comes from: the environment variable `BAXORDERS_SANDBOX_SERVER` (a connection string to
the server, any database), falling back to the API's development connection string with the database replaced. The
password is never printed or logged.

The three test accounts' password comes from the environment variable `BAXORDERS_SANDBOX_PASSWORD`. It is not in
any committed file, never printed, never logged; `--create` / `--reset` refuse to run without it and say which
variable to set. Tests pass a synthetic password directly, as `AuthenticatedApi` does.

### 4.3 What the sandbox contains (C)

Synthetic, and named so nobody can mistake it for the company's data:

- two locations, `Sınaq obyekti 1` and `Sınaq obyekti 2`, with codes that cannot collide with the real `LOC-…`
  sequence (e.g. `SINAQ-01`, `SINAQ-02`);
- one responsible person, one supplier, and a handful of products/variants named `Sınaq məhsulu …`;
- three test accounts, created through the application's own `IUserDirectory` (so Identity hashes the password and
  the role is assigned the same way the users page does it):
  - `sinaq.rehber` — role Rəhbər (`Manager`), display name `Sınaq Rəhbəri`;
  - `sinaq.koordinator` — role Koordinator, display name `Sınaq Koordinatoru`;
  - `sinaq.admin` — role Administrator, display name `Sınaq Administratoru` — to show that an admin cannot approve;
- **the test order**: `Sınaq obyekti 1`, one month, four to six lines, one of them without a price (so the approval
  acknowledgement is exercised), **submitted by `sinaq.koordinator`** through the application's own workflow
  service — so it is `PendingApproval` and appears in "Təsdiq gözləyənlər" as soon as the sandbox is created;
- a **draft** for `Sınaq obyekti 2`, not yet sent, so the "sifariş göndərilir" step can be done by hand;
- a **historical order** for `Sınaq obyekti 1`, an earlier month, carried in the same way the real ones were
  (an import batch source and the `ImportedAsApproved` event, reproduced as `HistoricalApprovalTests` does) — so the
  4.1 sentence can be seen in the sandbox; and, if the Coder chooses, one or two further earlier months for
  `Sınaq obyekti 1` so the order page's comparison has a basis.

Every workflow step in the seed goes through the application's services, never through direct inserts, except the
historical carry-in, which must be written exactly as the real migration wrote it.

### 4.4 Running the API and the UI against the sandbox (B)

- A new ASP.NET Core environment name **`Sandbox`**, with `appsettings.Sandbox.json` (no connection string in it,
  no secrets) and a launch profile `sandbox` on `http://localhost:5081`.
- The connection string reaches the API through the environment (`ConnectionStrings__BaxOrders`), set by the
  helper script of 5.6 — user-secrets are not loaded outside `Development`, and nothing secret is committed.
- The API does **not** migrate or seed at startup in `Sandbox`; the tool does that.
- Startup guard, both ways, unit-tested:
  - environment `Sandbox` → the API refuses to start unless its connection string names a database starting with
    `baxorders_sandbox`;
  - any other environment → the API refuses to start if its connection string names a database starting with
    `baxorders_sandbox` (so sandbox data can never appear in the normal UI without the banner).
- A small anonymous endpoint (e.g. `GET /api/v1/environment` → `{ "isSandbox": true|false }`) tells the UI which
  environment it is talking to. It exposes nothing else.
- The UI shows, on **every** page including the sign-in page, whenever `isSandbox` is true, a persistent amber
  banner at the top:
  `Sınaq mühiti — burada real sifariş yoxdur. Burada edilən təsdiq və düzəlişlər real dataya təsir etmir.`
  Nothing is shown when it is false; the normal UI is unchanged.
- The Vite dev server reads its API target from configuration (default stays `http://localhost:5080`), and a new
  script `npm run dev:sandbox` serves the UI on port 5174 against `http://localhost:5081`. `npm run dev` is
  unchanged.

### 4.5 The flow, end to end, with the Rəhbər role (D)

An integration test, `ApprovalSandboxEndToEndTests`, that:

1. creates a sandbox database through the tool's own create logic (test name `baxorders_sandbox_t_<random>`,
   synthetic password), and hosts the real API against it in environment `Sandbox` via `WebApplicationFactory`;
2. signs in three separate sessions — `sinaq.rehber`, `sinaq.koordinator`, `sinaq.admin` — with real cookies and
   antiforgery tokens;
3. the Rəhbər opens the inbox: the seeded test order is there, oldest submission first; `GET /api/v1/environment`
   says `isSandbox: true`;
4. the Rəhbər reads the order: decision facts say first submission, sent by `Sınaq Koordinatoru`, with a moment;
5. the Admin tries to approve and to return: both refused (403), nothing changes;
6. the Rəhbər asks for a correction **without a reason**: refused, status still `PendingApproval`, no event
   written;
7. the Rəhbər asks for a correction **with a reason**: `ReturnedForCorrection`; the facts show the Rəhbər's name,
   the moment and the reason;
8. the Coordinator creates the correction, changes one line, and sends it again;
9. the Rəhbər opens the inbox again: the correction is there; its facts say second submission, after a correction
   request, and carry the Rəhbər's reason;
10. the Rəhbər approves (acknowledging the unpriced line): `Approved`; the facts say who approved and when;
11. the Coordinator sends the seeded draft for `Sınaq obyekti 2`, and it appears in the Rəhbər's inbox — the
    "sifariş göndərilir" step;
12. the historical order's facts say it is a historical import and carry no names or dates;
13. finally, the database is dropped through the tool's own drop logic.

Separately, a test proves the separation: after a full seed and flow on a sandbox database, the shared test
database used by the rest of the suite has exactly the locations, order requests and users it had before (count and
ids) — the sandbox wrote nothing outside its own database.

### 4.6 Frontend (B)

- The banner component and its placement in the application shell and on the sign-in page.
- vitest: the banner is shown when `isSandbox` is true, including on the sign-in page, and absent when it is false.
- If the environment endpoint cannot be reached, the UI shows no banner and otherwise behaves as today. That is
  safe because the UI is not what keeps sandbox data out of the normal screens: the API's startup guard (4.4)
  refuses to serve a sandbox database outside the `Sandbox` environment.

## 5. Safety and STOP conditions

- **Never connect to the real database.** No test, tool code path or script may open a connection to
  `baxorders_dev` or to any database whose name does not start with `baxorders_sandbox` / the test fixtures' own
  prefixes, except the server maintenance database for `CREATE`/`DROP` of a sandbox name.
- Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or the new tool — the Coder profile cannot, and the tool's
  logic is proven by tests.
- Nothing from the real database is copied into the sandbox. Synthetic data only.
- No test object, alias or user is added to the real catalogue or the real users.
- No committed secret: no password, no connection string with a password, in any file.
- No new EF migration and no schema change. STOP if one seems necessary.
- Do not rework 04a. A defect in 04a is recorded in the report for the Reviewer.
- Do not commit, push or merge. Do not edit `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If a requirement here cannot be met without changing an owner decision, STOP with `BLOCKED_HUMAN`.

### 5.6 The operator's one-command start (documented, not run by the Coder)

A helper script `tools/BaxOrders.ApprovalSandbox/sandbox.ps1` (PowerShell, like `scripts/dev-postgres.ps1`) that,
given `BAXORDERS_SANDBOX_PASSWORD` in the environment:

- `-Create` / `-Reset` / `-Drop` — runs the tool's matching command;
- `-Run` — starts the API with environment `Sandbox` on 5081 and `ConnectionStrings__BaxOrders` pointing at
  `baxorders_sandbox` (built from the local cluster's password file, never echoed), and tells the operator to run
  `npm run dev:sandbox` for the UI on 5174.

The report states these commands exactly, for Task 12 and Task 15.

## 6. Invariants — MUST NOT CHANGE

- The real database: not reached at all.
- The real 27-object catalogue, orders, lines, prices, classifications (HD-002's 94 rows included), users and roles.
- Everything 04a delivered and every accepted behaviour of Tasks 1–3.
- `npm run dev` and the `http` launch profile behave exactly as before; the normal UI shows no banner.
- The API in `Development` still migrates on startup as it does today.

## 7. Acceptance criteria (this part)

1. The sandbox tool creates, resets and drops a separate database built from the migrations, filled with synthetic
   data only; its guards refuse every other database name, including the real one, before connecting (unit tests).
2. After `--create`, "Təsdiq gözləyənlər" in the sandbox holds the test order, seen by the Rəhbər account
   (integration test; brief: "Test mühitində 'Təsdiq gözləyənlər'də bir test sifarişi görürəm").
3. The whole brief flow runs over HTTP in the sandbox with the Rəhbər role, as §4.5, including: no correction
   request without a reason; after resending, "second submission" with the Rəhbər's reason; after approval, who and
   when; an admin refused.
4. Nothing outside the sandbox database changes (the separation test); the Coder reached no real database (brief:
   "Real 27 obyektin heç birində heç nə dəyişməyib").
5. The API refuses to start in `Sandbox` against a non-sandbox database and outside `Sandbox` against a sandbox
   database.
6. In the sandbox every page shows the banner; the normal UI shows none.
7. `npm run dev:sandbox` and the sandbox launch profile exist; the operator commands are in the report.
8. All suites and both builds are green.

## 8. Required tests

- Unit: the database-name guard (accepts `baxorders_sandbox`, `baxorders_sandbox_t_x`; refuses `baxorders_dev`,
  `postgres`, `baxorders_test_…`, empty, and a name equal to the configured real database); the API startup guard in
  both directions; the password requirement.
- Integration: `ApprovalSandboxEndToEndTests` (§4.5); the separation test; `--create` refusing an existing
  database; seeding refusing a database that already has orders; `--reset` producing the same seeded state twice
  (same accounts, same test order in the inbox, same draft, same historical order).
- Frontend (vitest): the banner (4.6); the environment API client.
- Existing suites unchanged and green (state counts against 04a's accepted numbers).

## 9. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (use `--artifacts-path` if the running API locks `bin`, and
  say so).
- `dotnet test` — unit and integration, all green, with counts.
- `npx tsc -b --noEmit`, `npx vitest run`, `npm run build` — all green.
- `git diff --stat`, `git status`: changes only under `src/`, `frontend/`, `tests/`, `tools/BaxOrders.ApprovalSandbox/`
  and `BaxOrders.slnx`.

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. The "test environment separate from the real data" is a separate PostgreSQL database, `baxorders_sandbox`, on the
   same local server, created from the migrations and filled with synthetic data — not a copy of real data.
2. It is created, reset and dropped by a repository tool with three fixed commands, following the `tools/` pattern
   of Task 3.
3. The sandbox starts with the test order already sent and waiting, so the inbox is not empty on first look; a
   separate draft covers the "sifariş göndərilir" step, and a historical order shows the 4.1 sentence.
4. The test accounts are `sinaq.rehber`, `sinaq.koordinator` and `sinaq.admin`, and their password comes from an
   environment variable that is never committed.
5. The sandbox API runs on port 5081 and its UI on 5174, beside the normal ones, and every sandbox page carries an
   amber banner in the words of §4.4.
6. The API refuses to run with the wrong database for its environment, in both directions.
7. Because the Coder cannot run programs, the environment is proven through integration tests that use the tool's
   own logic, and the first real creation is one documented command for the operator.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (04a's commit), `git status --short`, `git diff --stat`.
1. Sınaq mühiti — the database, the tool and its three commands, every guard with its test.
2. Sınaq datası — exactly what `--create` puts in (locations, products, accounts, the test order and its lines,
   the draft, the historical order), and how each workflow step was produced.
3. API və UI — the `Sandbox` environment, the startup guard, the environment endpoint, the banner (exact text),
   `npm run dev:sandbox`.
4. Axın başdan sona — the §4.5 test step by step, with the facts the API returned at steps 4, 7, 9, 10 and 12.
5. Ayrılıq sübutu — the separation test and its numbers; confirmation that no real database was reached.
6. Operatorun əmrləri — the exact commands to create, run, reset and drop the sandbox, for Task 12 and Task 15.
7. Testlər — new and changed tests; counts; builds.
8. Sonrakı tapşırıqlar üçün qeydlər — anything for 05, 12, 14 or 15, and any 04a defect found.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
