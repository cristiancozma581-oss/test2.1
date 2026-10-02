-- ============================================================================
-- 0012 — Catalogul: categorii, servicii, documente necesare, pași, FAQ (§7-§10).
--
-- Regula din §8 și §81: NIMIC din catalog nu este scris în frontend. Fiecare
-- serviciu, fiecare document cerut și fiecare pas al procedurii trăiește aici,
-- ca administratorul să le poată schimba fără o nouă versiune de cod.
-- ============================================================================

create table if not exists public.ie_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  color text not null default '#0a6b3a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_categories_ordine on public.ie_categories (is_active, sort_order);

drop trigger if exists trg_ie_categories_updated on public.ie_categories;
create trigger trg_ie_categories_updated before update on public.ie_categories
  for each row execute function public.ie_set_updated_at();

create table if not exists public.ie_services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.ie_categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  -- Cuvintele-cheie pe care le tastează clientul, dar care nu apar în nume:
  -- „730" pentru declarația de venit, „carta verde" pentru soggiorno etc. (§6)
  keywords text[] not null default '{}',
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  -- Prețul în cenți. `null` = „preț la evaluare", ceea ce nu e totuna cu 0.
  price_cents bigint check (price_cents is null or price_cents >= 0),
  status text not null default 'DRAFT'
    check (status in ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED')),
  -- Un serviciu poate exista în catalog fără să fie rezervabil online: unele
  -- pratiche se deschid doar la ghișeu, după o discuție.
  bookable_online boolean not null default true,
  requires_documents boolean not null default false,
  icon text,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Indexul de căutare (§6). Coloană generată, deci nu poate rămâne în urma
  -- textului: se recalculează la fiecare `update`, fără trigger de întreținut.
  search_vector tsvector generated always as (
    setweight(to_tsvector('public.ie_it', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('public.ie_it', array_to_string(keywords, ' ')), 'A') ||
    setweight(to_tsvector('public.ie_it', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('public.ie_it', coalesce(description, '')), 'C')
  ) stored
);
create index if not exists idx_ie_services_cautare on public.ie_services using gin (search_vector);
create index if not exists idx_ie_services_nume_trgm on public.ie_services using gin (name gin_trgm_ops);
create index if not exists idx_ie_services_categorie on public.ie_services (category_id, sort_order);
create index if not exists idx_ie_services_status on public.ie_services (status);

drop trigger if exists trg_ie_services_updated on public.ie_services;
create trigger trg_ie_services_updated before update on public.ie_services
  for each row execute function public.ie_set_updated_at();

-- Ce operator poate presta ce serviciu (§52: N↔N).
create table if not exists public.ie_operator_services (
  operator_id uuid not null references public.ie_operators(id) on delete cascade,
  service_id uuid not null references public.ie_services(id) on delete cascade,
  primary key (operator_id, service_id)
);
create index if not exists idx_ie_operator_services_serviciu on public.ie_operator_services (service_id);

-- Documentele cerute de un serviciu (§10). Clientul le vede ÎNAINTE de a
-- rezerva, ca să nu vină la ghișeu cu mâna goală.
create table if not exists public.ie_service_documents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.ie_services(id) on delete cascade,
  label text not null,
  hint text,
  is_required boolean not null default true,
  sort_order int not null default 0
);
create index if not exists idx_ie_service_documents_serviciu
  on public.ie_service_documents (service_id, sort_order);

-- Pașii procedurii, afișați pe pagina serviciului (§10).
create table if not exists public.ie_service_steps (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.ie_services(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0
);
create index if not exists idx_ie_service_steps_serviciu
  on public.ie_service_steps (service_id, sort_order);

-- --- FAQ (§38) ---------------------------------------------------------------
--
-- `service_id` null = întrebare generală, afișată pe pagina /faq. Legată de un
-- serviciu, apare și pe pagina acelui serviciu.
create table if not exists public.ie_faq (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ie_services(id) on delete cascade,
  category_id uuid references public.ie_categories(id) on delete set null,
  question text not null,
  answer text not null,
  locale text not null default 'it' check (locale in ('it','ro','en')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_faq_ordine on public.ie_faq (is_active, sort_order);
create index if not exists idx_ie_faq_serviciu on public.ie_faq (service_id);

drop trigger if exists trg_ie_faq_updated on public.ie_faq;
create trigger trg_ie_faq_updated before update on public.ie_faq
  for each row execute function public.ie_set_updated_at();
