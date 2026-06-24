# CLAUDE BRIEFING — TruPlans Dashboard
## Paste this at the start of any new Claude session to restore full context.

---

## WHO I AM WORKING WITH
- **Radovan Marusic** — architect of the app, not a deep developer. He runs commands, Claude writes code.
- Go **one step at a time**. Plain language. No jargon dumps.
- **Show the diff before saving** any file edit.
- **Confirm before any database change.**
- **Do NOT touch anything that is working.**
- **ONE job at a time.** Name it before starting.
- When Radovan says "Not on the sheet" — stop and come back to the task.

---

## THE PROJECT
**TruPlans Dashboard** — Windows desktop app for TruPlans Inc (CEO/client: Chris Doering).

**Stack:** Electron + React + Vite + Express (server.js) + Supabase + Anthropic API

**Local path:** `C:\TruPlans\ARHIVA\truplans-dashboard`
**GitHub repo:** `https://github.com/Archimurai-san/truplans-dashboard` (PUBLIC)
**Branch:** `modular-restructure`
**Supabase project ID:** `clskmcueoaoslacskjzj`
**Supabase anon key:** `sb_publishable_PKi4TSl3088C_1zT0boUdg_t2Mf4Jo5`

**Team:** Molly, Shirley, Willis, Cristina, Ayanna (designers) · Chris, Ricardo, Lorena (management) · Radovan (architect)
**Shared inbox:** planning@truplans.com
**Three contract formats:** TruPlans INC, CALOFT CORP, TruAdditions Corp

**Build pipeline:**
- Dev: `npm run dev` → node server.js + vite (ports 3001 + 5173)
- Test at: `http://localhost:3001`
- Build + publish: `npm run electron:build -- --publish always`
- GH_TOKEN saved in Windows environment variables (permanent)

---

## CURRENT VERSION: v1.3.2 (Jun 22, 2026)
Auto-updater is active. GitHub releases are public. Every build auto-delivers to all team machines.

---

## WHAT IS FULLY WORKING (DO NOT TOUCH)

### Core App
- Electron Windows installer + auto-updater (GitHub Releases, public repo)
- Light / Dark theme toggle
- Real-time sync to Supabase
- Google sign-in (Supabase OAuth)
- Version number shown in nav bar (auto from package.json)

### Dashboard Tab
- KPI cards: Active, Progress, Completed, Revenue, Invoiced, Outstanding
- Red Zone / Amber alerts
- Designer Workload bars
- **TruPlans Expansion Map** (Greater LA — Leaflet + Carto tiles)
- **U.S. Marketing Project Map** (SoCal overview)
- Revenue charts, SLA donut, financial summary
- Open Tasks by Priority

### Projects Tab
- Full project table with 14 columns
- SLA countdown timer
- Global search
- Project Detail with full info, notes, contacts, reminders
- Rename project
- Change Job # (safe Supabase migration)
- Assign Team
- Payment tracker (A1–A7 + S1)
- City tracker + HOA tracker
- PDF viewer + attach
- Contract Module (3 formats)
- AI Contract Analyser (API key in Supabase app_config key='anthropicKey')
- Scope of Work panel (green ✓ / red ✗)
- Email templates from Project Detail
- Action buttons: Delete · Workflow · Assign Team · Contracts · Close
- **City resource buttons** (🗺 Zoning Map + 📋 Municipal Code) for 6 cities:
  - San Diego, Irvine, Carlsbad, San Clemente, Mission Viejo, Rancho Santa Margarita
- **Address auto-extracted from notes** shown in Project Detail header (📍)
- **City auto-sets from contract address** when contract is saved

### Gantt Tab
- Year switcher: ← prev · current · next → · TODAY (CSS variables, works in both themes)
- Designer filter dropdown
- Week zone bands (W1–W4)
- TODAY red marker

### Tasks Tab
- 23-step Willis workflow Knowledge Base
- Side panel + inline editor
- City overrides (Irvine 5.4 exists)
- Links editor per step
- San Diego 5.1 override with SD Zoning Map + Municipal Code links

### Team Tab
- Team member management, role assignment

### Inbox Tab
- Gmail per-user connection (token in Supabase gmail_tokens table)
- Read threads, reply
- Project matching tags (green badges)
- **Use Template button** → opens email modal with project data
- Reconnect button on expired token
- /api/gmail/list-planning endpoint for planning@ inbox

### Email
- 5 templates with merge fields, opens Gmail
- Log sent tracking

### AI Assistant Tab *(NEW in v1.3)*
- Chat interface with project context selector
- Quick prompts
- Server endpoint: POST /api/ai/ask
- Loads all zoning_standards from Supabase as context on each request

### Auto-Updater
- electron-updater configured, autoInstallOnAppQuit = true
- GitHub provider, public repo
- Releases auto-published (releaseType: "release" in package.json)

---

## SUPABASE TABLES (DO NOT REBUILD)

### public.projects
Main project data. Syncs from localStorage. Key fields: id, name, client, city, designer, status, phase, notes, contracts (jsonb), workflow (jsonb), start, end, contract, invoiced.

**9 projects have city = null** (still to be fixed by uploading their contracts):
528 Monterrey, 621 Iyer, 626 Shah, 629 Chappalli, 634 Doyle, 637-S Samia, 642 Brown, 645 Thompson
(610 Larson → fixed to Irvine, 651 Grey → fixed to San Diego)

### public.task_instructions
23 workflow steps. Columns: id, workflow_step_id, step_name, city, body_text, links (jsonb), checklist (jsonb), last_updated_by, version, created_at, updated_at.
- BEFORE UPDATE trigger auto-bumps version + updated_at
- Partial unique index: one default per step (city IS NULL), one override per step+city
- All 23 defaults seeded. Irvine 5.4 override exists. San Diego 5.1 override with links exists.

### public.zoning_standards
Zoning knowledge base. Columns: id, jurisdiction, zone, standards (jsonb), citation, confidence, missing, source_url, source_effective_date, retrieved_at, version, created_at, updated_at.
- Unique index on (jurisdiction, zone)
- **ISSUED data:**
  - San Diego, CA: 33 zones (RS-1-1 through RM-5-12) — seeded from official PDF
  - Irvine, CA: 2.2 Low Density Residential — seeded from Municode
- **Standards JSON shape:** { min_lot_area, density, front_setback, side_setback, street_side_setback, rear_setback, max_height, max_far } — each: { value, unit, notes }

### public.gmail_tokens
Per-user Gmail tokens. Columns: user_email, refresh_token, gmail_email, updated_at.

### public.app_config
key='anthropicKey' → Anthropic API key (loaded at server startup)

### public.user_roles
email, role ('designer'|'management'), designer_name

---

## ZONING KB SCRIPTS (in scripts/ folder)
- `fetchMunicode.js` — fetches HTML from Municode city codes
- `structureZoningSection.js` — sends text to Claude Haiku, returns structured JSON
- `runZoningExtract.js` — orchestrator (reads file → AI → Supabase)
- `fetchSanDiegoPDF.js` — downloads SD PDF via https (SSL bypass for SD gov cert)
- `runSanDiegoExtract.js` — runner for SD PDF extraction
- `seedSanDiegoZones.js` — direct Supabase upsert of all 33 SD zones (no API needed)

**To add a new city:**
1. Find the Municode section URL or paste text to scripts/raw/cityname-zone.txt
2. Add entry to TARGETS in runZoningExtract.js
3. Run: `node scripts/runZoningExtract.js`

---

## WHAT STILL NEEDS TO BE BUILT (PRIORITY ORDER)

### Immediate
1. Test auto-updater on work station (should auto-update from old version to v1.3.2)
2. Upload contracts for 8 projects with null city → map will show all 19 pins
3. Build installer for Google Drive + send to team (A-08)

### Zoning KB expansion (A-06)
4. Add Carlsbad zones (Municode: library.municode.com/ca/carlsbad/codes/code_of_ordinances)
5. Add Mission Viejo, San Clemente, Rancho Santa Margarita zones
6. More Irvine zones (2.3, 2.4, 2.5 Medium/High Density)
7. pgvector RAG for semantic search (future)
8. Surface zoning in Project Detail inline (show zone standards when city is known)

### Bugs / Polish
9. Contract Module: remaining #555/#444 hardcoded text colors in light mode
10. Planning@ shared inbox — needs Gmail auth at localhost:3001/api/gmail/auth (no userEmail param)

### A-03 Project Management
11. Simplify In-Progress status menu (remove duplicate buttons)
12. Contract PDF "Open" button reliability on all machines

### v2.0 Cloud (do not start yet)
13. Password login — Designer vs Management roles
14. Designers see only their own projects
15. Activity log — who changed what, when
16. Real-time sync across machines

### v3.0 SaaS (future, do not start)
17. Multi-tenant, mobile, AI project assistant, GIS coverage map, CBC/CRC code check

---

## KEY DECISIONS (LOCKED)
- Anthropic API key: NEVER in source code. Always in Supabase app_config.
- credentials.json bundled in installer via extraResources — INTENTIONAL for Gmail OAuth.
- Task KB inline edit (no popup). Open to whole team. Auto-stamps signed-in user.
- Contract save: if address in contract → city auto-extracts and saves to project.
- Maps use Carto dark tiles (CSP updated in electron.cjs for packaged app).
- New popups must have visible border + NO black background (use var(--bg-card)).
- Zoning standards JSON shape is fixed — do not change field names.

---

## GITHUB TOKEN
Token name: "TruPlans Releases 2"
Expires: **2026-07-21** — must renew before then.
Google Calendar reminder set for 2026-07-14.
Token is saved in Windows environment variables (GH_TOKEN) — permanent, no need to re-enter.

---

## HOW TO START A SESSION
1. Open PowerShell in `C:\TruPlans\ARHIVA\truplans-dashboard`
2. Run: `npm run dev`
3. Open browser at: `http://localhost:3001`
4. Build when ready: `npm run electron:build -- --publish always`

---

*Generated Jun 22, 2026 — TruPlans Dashboard v1.3.2*
