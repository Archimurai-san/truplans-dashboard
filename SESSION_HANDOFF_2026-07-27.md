# Session Handoff — 2026-07-27

Branch: `modular-restructure`

## 1. Subagent built

Added `.claude/agents/supabase-sync-reviewer.md` — reviews TruPlans Dashboard code for
Supabase persistence integrity (toDb()/fromDb() mappers, milestone/payment logic, contract
parsing, localStorage usage). Committed as `865ba53` ("Add supabase-sync-reviewer subagent").

## 2. Audit run — 9 findings

Ran the subagent against `toDb()`/`fromDb()` in `server.js` and the project state shape used
across `App.jsx`, `core.jsx`, and the Contract Module / Project Detail modules. Ranked most
severe first:

1. **Dual money formulas** — `project.invoiced` is computed two incompatible ways
   (`savePaymentData` sums milestones by a `status` string; `handleContractModuleUpdate` sums
   by a `paid` boolean on `contracts[0].paymentMilestones` only, missing any 2nd contract).
   Whichever runs last silently overwrites the other. **Not fixed — needs a canonical-formula
   decision (see Open Items).**
2. **Phases not persisted** — `toDb()`/`fromDb()` had no `phases` key; per-step
   initials/notes/dateCompleted typed into the Contract Module's Phases tab were dropped
   before reaching Supabase. **FIXED this session — see section 3 below.**
3. **Duplicate fromDb() copy in App.jsx** — a hand-written `dbToApp` inside the realtime
   subscription effect has drifted from the real `fromDb()` in server.js; it's missing
   `contracts` entirely, and the realtime merge always keeps the stale local `contracts` copy.
   Teammates don't see contract edits until a full relaunch. **Not fixed.**
4. **Scope of Work unsynced duplicate** — `project.scopeOfWork` and
   `contracts[].designScope`/`constructionScope` come from two separate AI-extraction prompts
   with no sync between them once saved. **Not fixed.**
5. **New/Demo work not persisted** — `project.newWork`/`demoWork` are shown in the "New vs
   Demo" card but never included in `toDb()`/`fromDb()`; they vanish after a full reload.
   **Not fixed.**
6. **Contract PDF path not persisted** — `contractPaths` lives only in
   `localStorage['contract-paths']`; other machines see "No contract PDF attached" even after
   upload. **Not fixed.**
7. **Team member colors not synced** — `teamMembers` (avatar color map) lives only in
   `localStorage['team-members']`. Cosmetic, low impact. **Not fixed.**
8. **0 vs NULL indistinguishable** — numeric fields (`contract`, `invoiced`, `pct`) use
   `Number(x)||0` both ways; not a bug today, just a future limitation. **Not fixed.**

(A 9th, informational-only item confirmed `task_instructions` correctly never writes
`version`/`updated_at` — no defect, included for completeness in the original audit report.)

## 3. Finding #2 fix — phases persistence (DONE, this session)

**Migration** (tracked, not raw SQL): `add_phases_column`
```sql
ALTER TABLE public.projects ADD COLUMN phases jsonb DEFAULT '[]'::jsonb;
```
Applied to Supabase project `clskmcueoaoslacskjzj` and confirmed live via `list_tables`.

**server.js — toDb()** (added one line, same pattern as `workflow`):
```js
workflow:      p.workflow       || [],
phases:        Array.isArray(p.phases) ? p.phases : [],
```

**server.js — fromDb()** (added one line):
```js
workflow:     row.workflow      || [],
phases:       Array.isArray(row.phases) ? row.phases : [],
```

**Round-trip verified**: a 23-entry `phases` array (steps `5.1`–`5.23`, each
`{id, status, dateCompleted, initials, notes}`) was pushed through `toDb()` → `fromDb()` and
came back byte-for-byte identical. No other fields touched.

**Still to confirm manually**: open the app in `npm run dev` (dev server was started and came
up clean — Vite on `:5173`, Express API on `:3001`, Supabase connected, Anthropic key loaded),
go to a project's Contract Module → Phases tab, edit a step's initials/notes/date, and confirm
it saves and survives a refresh.

## 4. Open items

- **Finding #1 (dual money formulas)** — needs a decision on the canonical source before any
  code changes: recommend making `contracts[].paymentMilestones` (`.paid`/`.amount`) the single
  master ledger, summed across **all** contracts (not just the first), and removing the
  separate `status`-based computation path.
- **Findings #3–#8** — untouched, as scoped. Same "local-only state that silently drops on
  reload" pattern as the already-fixed phase/status bugs from earlier commits
  (`e076262`, `58f921c`, `a1ae3ec`, `642ad27`).

## 5. Flagged, not acted on

- **RLS disabled on all 11 public tables** (`projects`, `payment_milestones`, `city_data`,
  `hoa_data`, `app_config`, `user_roles`, `gmail_tokens`, `task_instructions`,
  `zoning_standards`, `project_zoning_data`, `activity_log`). Anyone with the anon key can
  read/write any row. Supabase's advisor flagged this as critical. Remediation SQL is known
  (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) but **not applied** — enabling RLS without
  policies would block all access, so this needs a deliberate policy design decision first.
- **`supabase-schema.sql` is stale** — it doesn't list columns already live and in use by
  `toDb()`/`fromDb()` (`contracts`, `team`, `team_roles`, `assign_note`, `payment_milestones`,
  `client_phone`, `client_email`, `client_address`, `reminders`, `site_measurement_date`, and
  now `phases`). The file should be regenerated from the live schema so it's trustworthy again
  as documentation.
