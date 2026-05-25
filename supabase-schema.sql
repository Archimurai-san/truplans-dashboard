-- 1. PROJECTS
create table if not exists projects (
  id            text primary key,
  name          text,
  client        text,
  designer      text,
  type          text,
  status        text default 'In Progress',
  phase         text,
  city          text,
  contract      numeric default 0,
  invoiced      numeric default 0,
  pct           integer default 0,
  stamp         text,
  permit        text,
  start_date    text,
  end_date      text,
  notes         text,
  scope_of_work jsonb default '[]'::jsonb,
  workflow      jsonb default '[]'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. PAYMENT_MILESTONES
create table if not exists payment_milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  text references projects(id) on delete cascade,
  code        text,
  label       text,
  description text,
  status      text default 'Pending',
  amount      numeric default 0,
  date        text,
  notes       text,
  created_at  timestamptz default now()
);

-- 3. CITY_DATA
create table if not exists city_data (
  id                uuid primary key default gen_random_uuid(),
  project_id        text references projects(id) on delete cascade,
  plan_checker      text,
  submission_date   text,
  correction_rounds integer default 0,
  permit_date       text,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- 4. HOA_DATA
create table if not exists hoa_data (
  id              uuid primary key default gen_random_uuid(),
  project_id      text references projects(id) on delete cascade,
  contacts        jsonb default '[]'::jsonb,
  fee             numeric default 0,
  submission_date text,
  approval_date   text,
  revision_rounds integer default 0,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- INDEXES
create index if not exists idx_payment_milestones_project_id on payment_milestones(project_id);
create index if not exists idx_city_data_project_id on city_data(project_id);
create index if not exists idx_hoa_data_project_id on hoa_data(project_id);

-- UPDATED_AT TRIGGER FUNCTION
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create or replace trigger trg_city_data_updated_at
  before update on city_data
  for each row execute function set_updated_at();

create or replace trigger trg_hoa_data_updated_at
  before update on hoa_data
  for each row execute function set_updated_at();

-- ROW LEVEL SECURITY
alter table projects           disable row level security;
alter table payment_milestones disable row level security;
alter table city_data          disable row level security;
alter table hoa_data           disable row level security;
