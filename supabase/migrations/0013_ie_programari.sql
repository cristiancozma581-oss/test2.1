-- ============================================================================
-- 0013 — Disponibilitate și programări (§11-§17).
--
-- Inima sistemului. Regula din §78: „dacă operatorul este ocupat, slotul nu
-- trebuie să apară disponibil". Asta se apără pe trei niveluri:
--   1. motorul de sloturi din `lib/immy/disponibilitate.ts` nu propune ora;
--   2. stratul de acces la date reverifică înainte de insert;
--   3. constrângerea EXCLUDE de mai jos face imposibilă suprapunerea, chiar
--      dacă doi clienți apasă „Conferma" în aceeași milisecundă.
--      Nivelurile 1 și 2 sunt confort; nivelul 3 este garanția.
-- ============================================================================

-- --- Programul săptămânal al operatorului (§16) ------------------------------
--
-- `weekday`: 0 = duminică ... 6 = sâmbătă (la fel ca `Date.getDay()` în JS și
-- ca `extract(dow from ...)` în Postgres — o singură convenție, peste tot).
create table if not exists public.ie_availability (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.ie_operators(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  kind text not null default 'work' check (kind in ('work', 'break')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ie_availability_interval_valid check (ends_at > starts_at)
);
create index if not exists idx_ie_availability_operator
  on public.ie_availability (operator_id, weekday);

-- --- Excepții: concedii, sărbători, ore suplimentare (§16, §17) --------------
--
-- `operator_id` null = închidere pentru tot biroul (sărbătoare legală).
-- `kind = 'extra'` deschide un interval în afara programului obișnuit; pentru
-- el `starts_at`/`ends_at` sunt obligatorii, ceea ce constrângerea de mai jos
-- chiar impune, în loc să lase intervalul gol să treacă tăcut.
create table if not exists public.ie_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.ie_operators(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  kind text not null check (kind in ('closed', 'holiday', 'leave', 'extra')),
  starts_at time,
  ends_at time,
  reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ie_exceptions_interval_valid check (date_to >= date_from),
  constraint ie_exceptions_ore_valide check (
    (kind = 'extra' and starts_at is not null and ends_at is not null and ends_at > starts_at)
    or (kind <> 'extra' and (starts_at is null or ends_at is null or ends_at > starts_at))
  )
);
create index if not exists idx_ie_exceptions_perioada
  on public.ie_availability_exceptions (date_from, date_to);
create index if not exists idx_ie_exceptions_operator
  on public.ie_availability_exceptions (operator_id, date_from);

-- --- Programări (§11-§14) ----------------------------------------------------
create table if not exists public.ie_appointments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  service_id uuid not null references public.ie_services(id) on delete restrict,
  operator_id uuid not null references public.ie_operators(id) on delete restrict,

  -- Clientul poate rezerva fără cont (§12: „opțional: cont existent"). Când își
  -- creează contul mai târziu cu același e-mail, `ie_leaga_programari_la_cont`
  -- din 0019 îi atașează programările anterioare.
  client_id uuid references public.ie_profiles(id) on delete set null,
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'PENDING' check (status in (
    'PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
  )),
  locale text not null default 'it' check (locale in ('it','ro','en')),
  notes text,
  internal_notes text,
  cancel_reason text,
  -- §12 și §49: consimțământul nu este o bifă volatilă, ci un moment stocat.
  gdpr_consent_at timestamptz not null default now(),
  source text not null default 'web' check (source in ('web', 'admin', 'phone', 'walk_in')),
  reminder_sent_offsets int[] not null default '{}',
  is_demo boolean not null default false,
  created_by uuid references public.ie_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ie_appointments_interval_valid check (ends_at > starts_at),
  -- Orice programare are un client identificabil: sau un cont, sau numele și
  -- un mijloc de contact. Fără asta, operatorul are în calendar o oră oarbă.
  constraint ie_appointments_client_identificabil check (
    client_id is not null
    or (guest_first_name is not null and guest_last_name is not null
        and (guest_email is not null or guest_phone is not null))
  )
);

-- Perioada ca interval, pentru indexul GiST. Semi-deschis `[)`: o programare
-- 10:00–10:30 și una 10:30–11:00 sunt adiacente, NU suprapuse.
alter table public.ie_appointments
  drop column if exists perioada;
alter table public.ie_appointments
  add column perioada tstzrange
  generated always as (tstzrange(starts_at, ends_at, '[)')) stored;

/*
 * Garanția anti-suprapunere.
 *
 * Statusurile terminale (COMPLETED, CANCELLED, NO_SHOW) sunt excluse din
 * predicat: o programare anulată trebuie să elibereze slotul imediat (§78), iar
 * una încheiată nu mai blochează nimic. RESCHEDULED rămâne în predicat pentru
 * că este o programare vie, doar mutată.
 */
alter table public.ie_appointments
  drop constraint if exists ie_appointments_fara_suprapunere;
alter table public.ie_appointments
  add constraint ie_appointments_fara_suprapunere
  exclude using gist (operator_id with =, perioada with &&)
  where (status in ('PENDING', 'CONFIRMED', 'RESCHEDULED'));

create index if not exists idx_ie_appointments_operator_timp
  on public.ie_appointments (operator_id, starts_at);
create index if not exists idx_ie_appointments_client
  on public.ie_appointments (client_id, starts_at desc);
create index if not exists idx_ie_appointments_status
  on public.ie_appointments (status, starts_at);
create index if not exists idx_ie_appointments_email
  on public.ie_appointments (lower(guest_email)) where guest_email is not null;
create index if not exists idx_ie_appointments_zi
  on public.ie_appointments (starts_at) where status in ('PENDING','CONFIRMED','RESCHEDULED');

drop trigger if exists trg_ie_appointments_updated on public.ie_appointments;
create trigger trg_ie_appointments_updated before update on public.ie_appointments
  for each row execute function public.ie_set_updated_at();

/* Codul se atribuie în bază, nu în aplicație: două cereri paralele nu pot
 * primi același număr, pentru că secvența este incrementată tranzacțional. */
create or replace function public.ie_atribuie_cod()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.ie_genereaza_cod(new.starts_at);
  end if;
  return new;
end $$;

drop trigger if exists trg_ie_appointments_cod on public.ie_appointments;
create trigger trg_ie_appointments_cod before insert on public.ie_appointments
  for each row execute function public.ie_atribuie_cod();

-- --- Istoricul statusurilor (§51) -------------------------------------------
create table if not exists public.ie_appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.ie_appointments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.ie_profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_appt_history
  on public.ie_appointment_status_history (appointment_id, created_at desc);

/*
 * Istoricul se scrie singur.
 *
 * Dacă ar depinde de disciplina apelantului, prima cale de cod care uită să-l
 * scrie ar lăsa o gaură în audit exact acolo unde e nevoie de el.
 */
create or replace function public.ie_scrie_istoric_programare()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ie_appointment_status_history
      (appointment_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, new.created_by);
  elsif new.status is distinct from old.status then
    insert into public.ie_appointment_status_history
      (appointment_id, from_status, to_status, changed_by, reason)
    values (new.id, old.status, new.status, auth.uid(), new.cancel_reason);
  end if;
  return new;
end $$;

drop trigger if exists trg_ie_appointments_istoric on public.ie_appointments;
create trigger trg_ie_appointments_istoric after insert or update on public.ie_appointments
  for each row execute function public.ie_scrie_istoric_programare();
