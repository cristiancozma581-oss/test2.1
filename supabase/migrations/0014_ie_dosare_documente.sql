-- ============================================================================
-- 0014 — Dosare și documente (§20-§25).
--
-- Dosarul este firul care leagă totul: clientul, serviciul, operatorul,
-- programările, documentele și mesajele (§79). O programare fără dosar este
-- doar o oră în calendar; dosarul este pratica însăși.
-- ============================================================================

create table if not exists public.ie_cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_id uuid not null references public.ie_profiles(id) on delete restrict,
  service_id uuid not null references public.ie_services(id) on delete restrict,
  operator_id uuid references public.ie_operators(id) on delete set null,
  title text not null,
  status text not null default 'NEW' check (status in (
    'NEW', 'IN_PROGRESS', 'WAITING_DOCUMENTS', 'DOCUMENTS_RECEIVED',
    'UNDER_REVIEW', 'READY', 'COMPLETED', 'CLOSED', 'CANCELLED'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  deadline date,
  notes text,
  closed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_cases_client on public.ie_cases (client_id, created_at desc);
create index if not exists idx_ie_cases_operator on public.ie_cases (operator_id, status);
create index if not exists idx_ie_cases_status on public.ie_cases (status, deadline);

drop trigger if exists trg_ie_cases_updated on public.ie_cases;
create trigger trg_ie_cases_updated before update on public.ie_cases
  for each row execute function public.ie_set_updated_at();

/* Referința dosarului: PRAT-2026-000042. Aceeași secvență anuală ca la
 * programări, deci aceeași garanție de unicitate sub concurență. */
create or replace function public.ie_atribuie_referinta()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := replace(public.ie_genereaza_cod(now()), 'IMMY-', 'PRAT-');
  end if;
  return new;
end $$;

drop trigger if exists trg_ie_cases_referinta on public.ie_cases;
create trigger trg_ie_cases_referinta before insert on public.ie_cases
  for each row execute function public.ie_atribuie_referinta();

create table if not exists public.ie_case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.ie_cases(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.ie_profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_case_history on public.ie_case_status_history (case_id, created_at desc);

create or replace function public.ie_scrie_istoric_dosar()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ie_case_status_history (case_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.ie_case_status_history (case_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_ie_cases_istoric on public.ie_cases;
create trigger trg_ie_cases_istoric after insert or update on public.ie_cases
  for each row execute function public.ie_scrie_istoric_dosar();

-- Legătura programare ↔ dosar (§52: un dosar are 1→N programări).
alter table public.ie_appointments
  add column if not exists case_id uuid references public.ie_cases(id) on delete set null;
create index if not exists idx_ie_appointments_dosar on public.ie_appointments (case_id);

-- --- Documente (§22-§25) -----------------------------------------------------
--
-- Documentul este entitatea logică („Passaporto"), versiunea este fișierul.
-- Reîncărcarea nu suprascrie: creează v2 și păstrează v1 (§25). De aceea calea
-- din storage stă pe versiune, nu pe document.
create table if not exists public.ie_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.ie_cases(id) on delete cascade,
  client_id uuid not null references public.ie_profiles(id) on delete cascade,
  service_document_id uuid references public.ie_service_documents(id) on delete set null,
  label text not null,
  status text not null default 'REQUESTED' check (status in (
    'REQUESTED', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_CORRECTION'
  )),
  review_note text,
  reviewed_by uuid references public.ie_profiles(id) on delete set null,
  reviewed_at timestamptz,
  current_version int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_documents_dosar on public.ie_documents (case_id, created_at);
create index if not exists idx_ie_documents_client on public.ie_documents (client_id, created_at desc);
create index if not exists idx_ie_documents_status on public.ie_documents (status);

drop trigger if exists trg_ie_documents_updated on public.ie_documents;
create trigger trg_ie_documents_updated before update on public.ie_documents
  for each row execute function public.ie_set_updated_at();

create table if not exists public.ie_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ie_documents(id) on delete cascade,
  version int not null check (version >= 1),
  -- Calea în bucket-ul PRIVAT `ie-documenti`. Nu este niciodată o adresă
  -- publică: se servește doar prin link semnat, emis după verificarea accesului.
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum text,
  uploaded_by uuid references public.ie_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);
create index if not exists idx_ie_doc_versions on public.ie_document_versions (document_id, version desc);

/* Numărul versiunii se calculează în bază. Dacă l-ar trimite clientul, două
 * încărcări simultane ar cere amândouă „v2" și una ar pierde. */
create or replace function public.ie_urmatoarea_versiune()
returns trigger language plpgsql as $$
begin
  if new.version is null or new.version = 0 then
    select coalesce(max(version), 0) + 1 into new.version
    from public.ie_document_versions where document_id = new.document_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_ie_doc_versiune on public.ie_document_versions;
create trigger trg_ie_doc_versiune before insert on public.ie_document_versions
  for each row execute function public.ie_urmatoarea_versiune();

/* O versiune nouă readuce documentul în „încărcat": o corectură cerută și
 * trimisă nu are voie să rămână marcată „verificat" din runda anterioară. */
create or replace function public.ie_sincronizeaza_document()
returns trigger language plpgsql as $$
begin
  update public.ie_documents
     set current_version = greatest(current_version, new.version),
         status = case when status in ('REQUESTED', 'REJECTED', 'NEEDS_CORRECTION')
                       then 'UPLOADED' else status end,
         updated_at = now()
   where id = new.document_id;
  return new;
end $$;

drop trigger if exists trg_ie_doc_sincronizare on public.ie_document_versions;
create trigger trg_ie_doc_sincronizare after insert on public.ie_document_versions
  for each row execute function public.ie_sincronizeaza_document();
