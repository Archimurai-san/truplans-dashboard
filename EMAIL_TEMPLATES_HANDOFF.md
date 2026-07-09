# EMAIL_TEMPLATES_HANDOFF.md

Handoff for Claude Code. Supersedes any earlier version of this file.

**Read `CLAUDE.md` first. Radovan Rule applies: one file at a time, show the diff,
wait for YES, test in `npm run dev` before touching the next file.**

---

## What changed from the original plan

Templates were going to live in the `EMAIL_TEMPLATES` array in
`src/modules/email-agent/v1.0/index.jsx`. They are not.

Radovan needs to **add and delete templates from the UI**, without a rebuild.
That makes them data, not code. They move to Supabase.

- **Groups** stay hardcoded. Six of them. They are structure.
- **Templates** become rows. Unlimited per group.

This is the same pattern as `task_instructions`, which is already live and
working. Copy that pattern. Do not invent a new one.

---

## Blocking decision — resolve with Radovan before writing code

`CLAUDE.md` v1.3 item 3: *"(!) Decide first: how the existing v1.0 Gmail subject
pre-fill relates to this new read/categorize/draft tab."*

Still undecided. If the old pre-fill and the new template `subject` column both
write the subject line, there are two sources of truth. Ask first.

---

## Step 1 — Migration (do this alone, show it, wait for YES)

New file in `supabase/migrations/`. Forward-only. Never edit once applied.

```sql
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  sort_order int not null default 0,
  label text not null,
  audience text not null,
  subject text not null default '',
  body text not null default '',
  is_active boolean not null default true,
  last_updated_by text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_group_key_check check (group_key in (
    'design-meeting','city-submittal','engineering',
    'hoa-submittal','payment-reminder','permit-approved'
  )),
  constraint email_templates_audience_check check (audience in (
    'client','city','hoa','engineer'
  ))
);

create index email_templates_group_idx
  on public.email_templates (group_key, sort_order);

alter table public.email_templates enable row level security;
```

Add the RLS policy in the same migration. Match whatever `task_instructions`
uses — open to any signed-in team member.

Add the `before update` trigger that sets `updated_at = now()` and
`version = version + 1`. Reuse the existing trigger function if there is one.

**The app must never write `version` or `updated_at` itself.** Same rule as
`task_instructions`.

---

## Step 2 — Seed migration (separate file, separate YES)

| group_key | sort_order | label | audience |
|---|---|---|---|
| design-meeting | 1 | Schedule Zoom design meeting | client |
| design-meeting | 2 | Follow-up after design meeting | client |
| design-meeting | 3 | Design meeting summary | client |
| design-meeting | 4 | Next step after DocuSign | client |
| city-submittal | 1 | Planning dept — zoning inquiry | city |
| city-submittal | 2 | Request existing structural plan records | city |
| city-submittal | 3 | City record request after measurements | city |
| city-submittal | 4 | Plans submitted to city | **client** |
| engineering | 1 | Engineering scope handoff | engineer |
| hoa-submittal | 1 | HOA application inquiry | hoa |
| hoa-submittal | 2 | Preparing submission package | hoa |

Body text for each is in Radovan's source document. Ask him for it before
writing the seed — do not reconstruct from memory.

Migrate the existing `payment-reminder` and `permit-approved` templates into the
table too, so every template lives in one place.

**Count discrepancy to resolve:** the source doc heads the city-submittal
section "5 templates" and then lists 4. Ask Radovan which is right before
seeding.

---

## Step 3 — UI (separate YES, after the table is confirmed working)

Groups are hardcoded, in this order. Workflow sequence, not alphabetical.

```js
const EMAIL_GROUPS = [
  { key: 'design-meeting',   label: 'Design meeting',   icon: '📐' },
  { key: 'city-submittal',   label: 'City submittal',   icon: '🏛' },
  { key: 'engineering',      label: 'Engineering',      icon: '⚙️' },
  { key: 'hoa-submittal',    label: 'HOA submittal',    icon: '🏠' },
  { key: 'payment-reminder', label: 'Payment reminder', icon: '💰' },
  { key: 'permit-approved',  label: 'Permit approved',  icon: '✅' },
];
```

Two-level menu:
- Level 1: the six groups, with a count of active templates.
- Level 2: templates in the selected group, ordered by `sort_order`.
- A group with exactly one active template opens it directly. No second click.
- A template whose `audience` differs from the rest of its group gets a visual
  tint. "Plans submitted to city" is the case that matters — it sits in
  city-submittal but goes to the homeowner.

Add / edit / delete:
- Inline edit, no popup. Same as Task KB.
- Save stamps the signed-in Google user into `last_updated_by`.
- Read mode shows `v3 — by Molly`, same as Task KB.
- **Delete is soft.** Set `is_active = false`. Never issue a `delete from`.
  Someone will remove a template they need next month.
- Inactive templates hidden by default, with a "show inactive" toggle.

---

## Merge fields

Bodies use `[Bracketed Field]` placeholders. Fill the ones that map to a project
record. Leave the rest as brackets for manual entry. Do not invent data sources.

Mappable: `[Full Address]` `[Client Names]` `[Client First Name]`
`[Designer Name]` `[Zone]` `[APN]` `[Tract]` `[Lot]` `[City]` `[Company]`

Manual: `[Zoom Link]` `[Passcode]` `[Contractor Name]` `[Engineer Name]`,
all `[... Link]` fields, all electrical counts, all scope bullets.

---

## Explicitly excluded

- `Site_Visit_Checklist` — internal form. Belongs in `task_instructions`,
  not here.
- `DocuSign.docx`, `Zoom_Videos_download_after_meeting.docx` — these contain
  **plaintext login credentials**. Do not import. Do not store in Supabase.
  Do not commit. Those credentials need rotating, and the files need to leave
  the repo folder.

---

## Verification

Test in `npm run dev`. Do not build an installer until Radovan confirms.

- Migration applies against a dev project, never prod
- All six groups render, correct order, correct counts
- Single-template groups skip level two
- "Plans submitted to city" renders with the client-facing tint
- Add a template → appears immediately
- Delete a template → disappears, row still exists with `is_active = false`
- Edit a template → `version` increments, `last_updated_by` shows the right name
- The app never writes `version` or `updated_at` directly
- No template body contains a credential
