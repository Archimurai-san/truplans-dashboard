# ROADMAP.md — TruPlans Dashboard

Read alongside `CLAUDE.md`. This is the forward plan. Work it **top to bottom** —
nearest first. **Confirm the open decisions (marked ⚑) with Radovan before building.**
Keep day-to-day work simple; don't over-engineer for far-future phases.

---

## ✅ Shipping now — v1.2.0
Bump `package.json` to `1.2.0`, run `npm run electron:build`, distribute to the team.
Contents: Task Knowledge Base, contact fields, notes formatting, reminders, contract
delete, Gantt improvements.
Also do: upload installer + updated user guide + a short progress note for Chris to Google Drive.

---

## Near-term — v1.3 (Project Detail + Email)

1. **Scope of Work redesign** (Project Detail page)
   - Show Contract Analyser results: **Y items → green ✓, N items → red ✗**.
   - ⚑ Decide first: (a) live pull from the contract vs. a saved snapshot; (b) can a user manually override an item; (c) how the fields map across the **three** contract formats (TruPlans INC, CALOFT CORP, TruAdditions Corp).

2. **Permanent action button row** on every Project Detail page
   - Top-right: **Delete | Workflow | Assign Team | Contracts | Close**.
   - Simplify the "In Progress" status menu — keep the status changer only; remove the duplicated summary content and action buttons.

3. **Rename Project Name button** — let users edit a project's name after creation.

4. **Email Agent tab** — four templates with dynamic merge fields pulled from project records:
   - *Schedule Zoom Design Meeting* (Willis's voice)
   - *Follow-up After Design Meeting* (Molly's voice)
   - *Design Meeting Summary* (scope items, change orders + pricing, electrical allowances, Drive/Matterport/YouTube links, next steps)
   - *Planning Dept Zoning Inquiry* (zoning, APN, tract, lot, setbacks, FAR, height; auto-fills project address + scope)
   - ⚑ Decide first: how the existing v1.0 Gmail subject pre-fill relates to this new tab (which reads, categorizes, and drafts).

---

## Reliability & housekeeping (low-risk, do alongside the above)
- **Auto-updater** — silent updates, data preserved across versions (high value now that the team is on it).
- **Contract PDF "Open" button** — make it reliable on all machines.
- **Gantt year switching** — currently hardcoded to 2026.
- Remove the unused hardcoded API key in `App.jsx`; rotate the `config.json` key if it was ever exposed.
- Verify on team machines: sign-in persistence on fresh installs; cross-computer sync (change on one machine → hard-refresh the other within 30s); Change Job # migration behaves correctly.

---

## v2.0 — Multi-user cloud (bigger phase, ~Q3 2026)
- **Password login** with roles: Designer vs Management.
- Designers see **all their own** projects (active + completed); Chris + Radovan see **all** projects across all designers.
- **Real-time sync** across the team (data is already in Supabase — extend it).
- **Activity log** — who changed what, and when. (Reuse the `task_instructions` pattern: `last_updated_by` + `version` + trigger.)

---

## v2/v3 — Geographic Property Map + KPI (for Chris)
- Connect to management's existing Google Map.
- One **Redfin listing URL per property** — store the URL, do **not** scrape (no public API).
- Roll property pins into **coverage %** by street / city / county, using public GIS for the denominator (total parcels per area).
- Extends Chris's "Home Evaluation App" idea.

---

## v3.0 — Commercial SaaS (North Star, ~2027) — do NOT build for this yet
The destination: turn this internal tool into a product sold to other California
residential design firms.
- **CBC/CRC code check** built in — AI tells the designer which codes apply.
- **Multi-tenant database** — each firm isolated.
- Sell at ~**$49–99/month**.
- **Mobile app** (iOS / Android).
- **AI Project Assistant** — natural-language queries.
- Patent filing for core innovations.
- Vehicle: **Marusic Precision Design LLC**.
- ⚑ Guardrail: this is the long-term direction, not today's work. Keep current builds simple — just avoid hardcoding single-firm assumptions that would block multi-tenancy later.

---

## On hold (Chris's adjacent ideas, not on the build list yet)
- **Home Evaluation App** — feasibility tool for prospective clients.
- **Cost Estimator** — estimate construction cost before a contract is signed.
