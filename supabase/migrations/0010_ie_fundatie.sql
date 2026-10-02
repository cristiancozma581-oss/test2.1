-- ============================================================================
-- 0010 — IMMY & EMY: fundația (extensii, funcții ajutătoare, setări, audit).
--
-- Convenții pentru toate migrațiile `ie_*` (aceleași ca la `lex_*`):
--   * fiecare fișier este idempotent — reaplicarea este inofensivă;
--   * vocabularele sunt `text` + constrângere `check`, NU enum-uri Postgres:
--     `alter type ... add value` nu poate rula în aceeași tranzacție cu restul
--     migrației, deci fiecare extindere de vocabular ar deveni migrație dublă;
--   * sumele de bani sunt `bigint`, în cenți (1 EUR = 100 de cenți) — niciun
--     preț nu trece vreodată prin virgulă mobilă;
--   * momentele în timp sunt `timestamptz`. Ora de perete a biroului se obține
--     convertind la fusul din `ie_settings.timezone` (implicit Europe/Rome).
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;
-- `btree_gist` este obligatoriu pentru constrângerea EXCLUDE care împiedică
-- suprapunerea programărilor: fără el nu poți combina `operator_id with =` și
-- `perioada with &&` în același index GiST.
create extension if not exists btree_gist;

-- --- Configurația de căutare italiană ---------------------------------------
--
-- Catalogul de servicii este în italiană și se caută în italiană („cittadinanza",
-- „soggiorno"). Copiem configurația `italian` și îi adăugăm `unaccent`, ca
-- „però" și „pero" să genereze aceleași leme.
do $$
begin
  create text search configuration public.ie_it (copy = pg_catalog.italian);
exception
  when duplicate_object then null;
end $$;

alter text search configuration public.ie_it
  alter mapping for asciiword, asciihword, hword_asciipart, word, hword, hword_part
  with unaccent, italian_stem;

-- --- Funcții ajutătoare ------------------------------------------------------

create or replace function public.ie_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

/*
 * Codul unic al programării (§13): IMMY-2026-000124.
 *
 * Anul vine din momentul programării, nu din cel al creării — un client care
 * rezervă în decembrie pentru ianuarie primește codul anului în care chiar vine.
 * Secvența este per an, ca numerele să rămână scurte și lizibile la telefon.
 */
create table if not exists public.ie_appointment_counters (
  year int primary key,
  last_value bigint not null default 0
);

create or replace function public.ie_genereaza_cod(la timestamptz)
returns text language plpgsql volatile as $$
declare
  an int;
  urmator bigint;
begin
  an := extract(year from la)::int;

  insert into public.ie_appointment_counters (year, last_value)
  values (an, 1)
  on conflict (year) do update
    set last_value = public.ie_appointment_counters.last_value + 1
  returning last_value into urmator;

  return 'IMMY-' || an::text || '-' || lpad(urmator::text, 6, '0');
end $$;

-- --- Setările platformei (§64) ----------------------------------------------
--
-- O singură linie, cu `id` fixat la 1. Administratorul editează de aici numele
-- firmei, contactele, fusul orar și regulile de rezervare, fără schimbare de cod.
create table if not exists public.ie_settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'IMMY & EMY',
  tagline text not null default 'Pratiche per immigrati e CAF',
  phone text not null default '333 47 59 704',
  phone_secondary text default '011 85 32 73',
  whatsapp text default '393347759704',
  email text not null default 'caf.immyemy@libero.it',
  address text not null default 'Via Monte Rosa, 101/B, 10154 — Torino (TO)',
  map_lat numeric(9,6) default 45.089500,
  map_lng numeric(9,6) default 7.717300,
  timezone text not null default 'Europe/Rome',
  default_locale text not null default 'it' check (default_locale in ('it','ro','en')),

  -- Reguli de rezervare (§11, §17, §28).
  booking_lead_minutes int not null default 120 check (booking_lead_minutes >= 0),
  booking_horizon_days int not null default 60 check (booking_horizon_days between 1 and 365),
  booking_granularity_minutes int not null default 15 check (booking_granularity_minutes between 5 and 120),
  cancel_cutoff_hours int not null default 12 check (cancel_cutoff_hours >= 0),
  reminder_offsets_minutes int[] not null default '{1440,120}',

  -- Reguli pentru documente (§22, §50).
  max_upload_mb int not null default 10 check (max_upload_mb between 1 and 100),
  retention_months int not null default 60 check (retention_months >= 1),

  -- Comutatoare de integrare. Cheile stau în mediu; aici doar pornit/oprit.
  payments_online_enabled boolean not null default false,
  ai_assistant_enabled boolean not null default true,

  updated_at timestamptz not null default now()
);

insert into public.ie_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_ie_settings_updated on public.ie_settings;
create trigger trg_ie_settings_updated before update on public.ie_settings
  for each row execute function public.ie_set_updated_at();

-- --- Jurnalul de audit (§48) -------------------------------------------------
--
-- Scris exclusiv prin cheia de service, din stratul de acces la date. Nimeni
-- nu poate insera aici din browser, iar liniile nu se pot modifica: politicile
-- din 0018 acordă doar `select` administratorilor.
create table if not exists public.ie_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text not null check (action in (
    'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'UPLOAD', 'DOWNLOAD',
    'BOOKING', 'CANCEL', 'RESCHEDULE', 'STATUS_CHANGE', 'ROLE_CHANGE',
    'EXPORT', 'LOGIN_FAILED', 'ACCESS_DENIED'
  )),
  entity_type text not null,
  entity_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_audit_created on public.ie_audit_logs (created_at desc);
create index if not exists idx_ie_audit_actor on public.ie_audit_logs (actor_id, created_at desc);
create index if not exists idx_ie_audit_entity on public.ie_audit_logs (entity_type, entity_id);
