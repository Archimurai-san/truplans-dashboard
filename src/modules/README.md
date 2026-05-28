# TruPlans Dashboard — Modular Structure (v1.0.4)

## What changed
The single 3,798-line App.jsx was split into modules. Behavior is identical to v1.0.3.

## Layout
- `src/shared/core.jsx`  — all shared constants, helpers, styles (S), and small components (Av, Sb, Pb, ST, SLABadge). Everything imports from here.
- `src/modules/<name>/v1.0/index.jsx` — one frozen module per feature area.
- `src/App.jsx` — the shell + the 5 tabs (Dash, Projs, Gantt, Tasks, Team), imports modules.
- `module-registry.json` — records the active version of each module.

## Modules
| Module | Components |
|---|---|
| projects | ProjectDetail, PaymentPanel, CityPanel, HOAPanel, WorkflowModal, AssignModal, PDFPanel |
| contract-analyser | ContractModule, AnalyseModal |
| email-agent | Inbox, EmailModal |
| team | TeamSettingsModal, UserSelectModal |
| notifications | NotificationPanel |
| auth | LoginScreen |

## THE RULES (do not break these)
1. **v1.0 folders are READ-ONLY.** Never edit a frozen version.
2. To change a module: copy its v1.0 folder to v1.1, edit v1.1, update App.jsx import + registry.
3. To roll back: point the import back to v1.0. Done.
4. The 5 tabs still live in App.jsx — they will be modularized later, one at a time.
