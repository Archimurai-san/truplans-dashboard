# CLAUDE.md — TruPlans Dashboard (complete project memory)

Read automatically at the start of every Claude Code session. This is the project's
full standing memory: how to work, what's done, the decisions, the next step, the
roadmap, and the final goal. Keep it current as work progresses.

---

## 1. How to work with Radovan (read first, every time)
- Go **one small step at a time**, slowly. Plain language, no jargon dumps.
- **Do NOT** throw multiple tools, paths, or options at him at once.
- **Confirm before any database change.**
- **Show the diff before saving** any file edit.
- **Test in `npm run dev`** and verify before ever building an installer.
- **Version every meaningful change** (e.g. 1.2.0 -> 1.2.1) for clean rollback points.
- Radovan is the architect, not a deep developer — he runs the commands; you write the code and tell him exactly where it goes.

### RADOVAN RULE — MANDATORY CHECKLIST (enforced every session, no exceptions)
1. **Show exactly what will change** — paste the old lines and new lines, wait for explicit **YES** before using the Edit tool.
2. **One file at a time** — never edit two files in the same response. Wait for YES after each one.
3. **Test after every single file change** — confirm it works in `npm run dev` before touching the next file.
4. **If anything breaks** — stop immediately, revert to backup, no new changes until Radovan says go.
5. **Never silent-fail** — if an upload, API call, or save fails, show the error. Do not hide it with try/catch and move on.

If Radovan says **"Radovan Rule"** — stop everything, revert all changes from this session, and do not proceed until he gives a specific YES on a new plan.

## 2. The project
TruPlans Dashboard — Windows desktop app for TruPlans Inc (client CEO: Chris Doering).
Stack: Electron + React + Vite + Express (`server.js`) + Supabase + Anthropic API.
- Repo: `Archimurai-san/truplans-dashboard`, branch `modular-restructure`
- Local path: `C:\TruPlans\ARHIVA\truplans-dashboard`
- Supabase project id: `clskmcueoaoslacskjzj`
- Anthropic API key lives in Supabase `app_config`, loaded into memory at startup (never on disk).
- `credentials.json` bundled into the installer via `extraResources` is **intentional** (Gmail OAuth on fresh installs) — do not "fix".
- Team: designers Molly, Shirley, Willis, Cristina, Ayanna; management Chris (CEO/client), Ricardo, Lorena. Shared inbox `planning@truplans.com`.
- Domain truth: drawing is done in **Chief Architect** (not generic "CAD"); **Matterport is for site-visit verification/reference, not import**.
- Three contract formats: TruPlans INC, CALOFT CORP, TruAdditions Corp.
- Build pipeline: `npm run electron:build` -> Vite (React) -> esbuild (server bundle) -> electron-builder NSIS installer.

## 3. Current release
**v1.5.7 shipped** (Jul 8 2026): new Contract Analyser with tool-use
extraction (3 formats), Supabase PDF storage, Open button handles
https:// URLs. Branch: `modular-restructure`.

Earlier: v1.2.0 (Jun 2026) Task KB, Gantt, maps CSP fix, API key
moved to Supabase.

## 3a. Build Status (per Build Status Map — Jul 8 2026)
| Section | Status |
|---|---|
| A-01 Core App & Infrastructure | 6/7 — Auto-updater pending |
| A-02 Contract Analyser | 5/5 — DONE in v1.5.7 |
| A-03 Project Management | 4/7 — Action button row, Rename, Status menu pending |
| A-04 Tasks & Workflow KB | 4/4 — DONE in v1.2.0 |
| A-05 Email | 2/3 — Email Agent tab pending |
| A-06 Zoning Knowledge Base | 4/9 — Foundation built (see below) |
| A-07 Data Layer / v2 Cloud | 1/4 — Cloud sync, password login, realtime pending |
| A-08 Distribution & Rollout | 1/4 — User guide + Google Drive upload pending |
| A-09 v3 Commercial SaaS | 0/6 — Future |

---

## 4. Task Knowledge Base (the feature just built)

### DONE — live in Supabase, do NOT rebuild
Table `public.task_instructions`:
- columns: `id`, `workflow_step_id`, `step_name`, `city`, `body_text`,
  `links` (jsonb: array of `{label,url}`),
  `checklist` (jsonb: **array of plain strings**, NOT `{text,required}` objects),
  `last_updated_by`, `version` (int default 1), `created_at`, `updated_at`.
- Partial unique indexes: one default per step (`city IS NULL`), one override per `step+city`.
- `BEFORE UPDATE` trigger auto-sets `updated_at = now()` and `version = version + 1`.
  **The app must NEVER write `version` or `updated_at` itself.**
- All 23 step defaults seeded (5.1-5.23), each `version 1`, plus one Irvine override for 5.4.

### Locked design decisions
- **Inline** edit/save (no popup), in both surfaces.
- **Open to the whole team** — anyone signed in can edit.
- Save **auto-stamps the signed-in Google user** into `last_updated_by` (no manual dropdown).
- Every save bumps `version` via the DB trigger. Read mode shows e.g. "v3 - by Molly".
- **Links editor is included** (add/edit/remove label+url rows — where changing city portal URLs live).
- Tasks tab = right-hand **side panel**. Project Detail = **inline expansion**. Same data/components.

### Fallback rule
To show a step's instructions for a project in city X:
1) look for `(step, city = X)`; 2) if none, fall back to `(step, city IS NULL)` default.

---

## 5. ROADMAP — work top to bottom, nearest first
Confirm the (!) decisions with Radovan before building each one.

### v1.3 — Project Detail + Email
1. **Permanent action button row** on every Project Detail page (top-right): **Delete | Workflow | Assign Team | Contracts | Close**. Simplify the "In Progress" status menu — keep the status changer only, drop duplicated summary/buttons.
2. **Rename Project Name button** — edit a project name after creation.
3. **Email Agent tab** — two-level menu. Six hardcoded groups (design-meeting,
   city-submittal, engineering, hoa-submittal, payment-reminder, permit-approved),
   unlimited templates per group stored in Supabase table `email_templates`.
   Add / edit / soft-delete from the UI, same pattern as `task_instructions`.
   See `EMAIL_TEMPLATES_HANDOFF.md`.
   DECIDED (Jul 8 2026): the v1.0 subject pre-fill is replaced by the `subject`
   column on `email_templates`. Both subject and body run through the same
   merge-field substitution at render time. One source of truth.

### Reliability & housekeeping (low-risk, alongside the above)
- **Auto-updater** — silent updates, data preserved across versions.
- **Gantt year switching** (currently hardcoded to 2026).
- Remove unused hardcoded API key in `App.jsx`; rotate `config.json` key if ever exposed.
- Verify on team machines: sign-in persistence on fresh installs; cross-computer sync (change on one -> hard-refresh other within 30s); Change Job # migration behaves correctly.

### v2.0 — Multi-user cloud (~Q3 2026)
- **Password login**, roles: Designer vs Management.
- Designers see all their own projects (active + completed); Chris + Radovan see all projects across all designers.
- **Real-time sync** across the team (data already in Supabase — extend it).
- **Activity log** — who changed what, when (reuse the `last_updated_by` + `version` + trigger pattern).

### v2/v3 — Geographic Property Map + KPI (for Chris)
- Connect to management's existing Google Map.
- One **Redfin listing URL per property** — store the URL, do NOT scrape (no public API).
- Roll pins into **coverage %** by street/city/county using public GIS for the denominator.
- Extends Chris's "Home Evaluation App" idea.

---

## 6. FINAL GOAL (North Star, ~2027) — do NOT build for this yet
Turn TruPlans Dashboard from an internal tool into a **commercial SaaS product sold to
other California residential design firms**:
- **CBC/CRC building-code check** built in — AI tells the designer which codes apply.
- **Multi-tenant database** — each firm isolated.
- Sell at ~**$49-99/month**.
- **Mobile app** (iOS / Android).
- **AI Project Assistant** — natural-language queries.
- Patent filing for core innovations.
- Vehicle: **Marusic Precision Design LLC**.
- (!) Guardrail: this is the destination, not today's work. Build current features simply;
  just avoid hardcoding single-firm assumptions that would block multi-tenancy later.

## 7. A-06 Zoning Knowledge Base (foundation already built — do NOT rebuild)

### DONE in Supabase
- Table `public.zoning_standards` (jsonb + version trigger) — live
- RM-1-1 proof row stored and queried back — confirmed working

### DONE as local scripts (not yet wired into the app)
- `structureZoningSection.js` — Stage 2 structurer: takes raw text of one code section,
  calls Claude API, returns normalized zoning JSON ready for Supabase.
  Platform-agnostic — works with eCode360, Municode, American Legal, San Diego PDF.
  Pipeline: fetch adapter → structureZoningSection.js → Supabase store.
- `fetchSanDiego.js` — PDF adapter for San Diego municipal code

### Active task (A-06)
- Run `fetchSanDiego.js` locally → reconcile RM-1-1 against real Table 131-04G → fix effective date

### Pending (do not build yet)
- eCode360 + Municode adapters (28 OC cities)
- Expand: Irvine · Carlsbad · Mission Viejo
- pgvector prose chunks (RAG)
- Surface in TPD — Zoning tab vs Analyser vs Detail

---

## 8. On hold (Chris's adjacent ideas, not on the build list yet)
- **Home Evaluation App** — feasibility tool for prospective clients.
- **Cost Estimator** — construction cost estimate before a contract is signed.
