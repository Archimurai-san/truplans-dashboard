# CLAUDE.md — TruPlans Dashboard

This file is read automatically at the start of every Claude Code session.
It is the project's standing memory. Keep it current.

## How to work with Radovan (read first, every time)
- Go **one small step at a time**, slowly. Explain plainly, no jargon dumps.
- **Do NOT** throw multiple tools, paths, or options at him at once.
- **Confirm before any database change.**
- **Show the diff before saving** any file edit.
- **Test in `npm run dev`** and verify it works before ever building an installer.
- Version every meaningful change for clean rollback points.
- Radovan is the architect, not a deep developer — he runs the commands; you write the code and tell him exactly where it goes.

## The project
TruPlans Dashboard — Windows desktop app for TruPlans Inc (client CEO: Chris Doering).
Stack: Electron + React + Vite + Express (`server.js`) + Supabase + Anthropic API.
- Repo: `Archimurai-san/truplans-dashboard`, branch `modular-restructure`
- Local path: `C:\TruPlans\ARHIVA\truplans-dashboard`
- Supabase project id: `clskmcueoaoslacskjzj`
- Anthropic API key is stored in Supabase `app_config` and loaded into memory at startup (never written to disk).
- Domain truth: drawing is done in **Chief Architect** (not generic "CAD"); **Matterport is for site-visit verification/reference, not import**.

## Current release
**v1.1.1** — shipped, ready for the team. Gmail OAuth works on fresh installs (`credentials.json` bundled via `extraResources` — intentional, do not "fix").

---

## ACTIVE WORK: Task Knowledge Base (v1.2)
A "how to" guide attached to each of the 23 workflow steps (5.1–5.23), shown in two
places, editable by the whole team, versioned on every edit.

### DONE — live in Supabase, do NOT rebuild
Table `public.task_instructions`:
- columns: `id`, `workflow_step_id`, `step_name`, `city`, `body_text`,
  `links` (jsonb: array of `{label,url}`),
  `checklist` (jsonb: **array of plain strings**, NOT `{text,required}` objects),
  `last_updated_by`, `version` (int default 1), `created_at`, `updated_at`.
- Partial unique indexes: one default per step (`city IS NULL`), one override per `step+city`.
- `BEFORE UPDATE` trigger auto-sets `updated_at = now()` and `version = version + 1`.
  **The app must NEVER write `version` or `updated_at` itself.**
- All 23 step defaults seeded (5.1–5.23), each `version 1`, plus one Irvine override for 5.4.

### Locked design decisions (editor)
- **Inline** edit/save (no popup), in both surfaces.
- **Open to the whole team** — anyone signed in can edit.
- Save **auto-stamps the signed-in Google user** into `last_updated_by` (no manual dropdown).
- Every save bumps `version` via the DB trigger. Read mode shows e.g. "v3 · by Molly".
- **Links editor is in the first build** (add/edit/remove label+url rows — where changing city portal URLs live).
- Tasks tab = right-hand **side panel**. Project Detail = **inline expansion**. Same data/components.

### Fallback rule (important)
To show a step's instructions for a project in city X:
1. look for `(step, city = X)`; 2. if none, fall back to `(step, city IS NULL)` default.

### COMPLETED — Task Knowledge Base v1.2 is fully built and tested

### Build order — ALL DONE
1. (done) Supabase table + 23 defaults
2. (done) server endpoint `GET /api/supabase/task-instructions`
3. (done) Tasks tab HOW TO column + floating modal
4. (done) Project Detail inline expansion (`?` button on each step pill)
5. (done) Inline editor — body text, checklist, links; auto-stamp signed-in Google user into `last_updated_by`; server endpoint `PUT /api/supabase/task-instructions/:id`
6. (done) Tested in `npm run dev` — save confirmed working

### Key implementation notes
- `PUT /api/supabase/task-instructions/:id` in server.js — only writes `body_text`, `checklist`, `links`, `last_updated_by`. NEVER `version` or `updated_at` (DB trigger handles those).
- HowToPanel (App.jsx) is a stateful component with full inline editor. `startEdit` prop opens it directly in edit mode.
- Project Detail "Edit" button calls `onEditInstruction(stepId)` → App.jsx opens HowToPanel with `startEdit:true`.
- After save, `taskInstructions` state is updated in App.jsx so both surfaces refresh immediately.
- `last_updated_by` = `session?.user?.email` (Google) falling back to `currentUser` (local name).
- Server restart note: when `server.js` is edited, `npm run dev` must be fully stopped (Ctrl+C) and restarted — the running Node process does NOT hot-reload.
