-- ============================================================================
-- 0011 — Identitate, roluri și operatori (§35, §36, §16).
--
-- Rolul este o coloană scalară, nu un grant cu domeniu: spre deosebire de
-- LexUSM, aici o persoană are exact o poziție în birou. Un operator este
-- operator peste tot; nu există „operator, dar numai pentru fiscal". Ceea ce
-- limitează un operator este lista lui de servicii (`ie_operator_services`) și
-- proprietatea asupra dosarelor, nu domeniul rolului.
-- ============================================================================

create table if not exists public.ie_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'CLIENT'
    check (role in ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'RECEPTIONIST', 'CLIENT')),
  preferred_locale text not null default 'it' check (preferred_locale in ('it','ro','en')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  -- Consimțământul GDPR (§49): momentul, nu doar bifa, ca să fie demonstrabil.
  gdpr_accepted_at timestamptz,
  marketing_opt_in boolean not null default false,
  last_sign_in_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_profiles_email on public.ie_profiles (lower(email));
create index if not exists idx_ie_profiles_role on public.ie_profiles (role) where status = 'active';
create index if not exists idx_ie_profiles_phone on public.ie_profiles (phone);

drop trigger if exists trg_ie_profiles_updated on public.ie_profiles;
create trigger trg_ie_profiles_updated before update on public.ie_profiles
  for each row execute function public.ie_set_updated_at();

/*
 * Profilul se creează singur la înregistrare.
 *
 * `security definer` este necesar: triggerul rulează în contextul lui
 * `auth.users`, unde utilizatorul proaspăt creat nu are încă drept de insert în
 * `public`. Rolul este forțat la CLIENT — nimeni nu se poate face administrator
 * trimițând metadate la înregistrare.
 */
create or replace function public.ie_creeaza_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ie_profiles (id, email, full_name, phone, preferred_locale, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_locale', ''), 'it'),
    'CLIENT'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_ie_creeaza_profil on auth.users;
create trigger trg_ie_creeaza_profil after insert on auth.users
  for each row execute function public.ie_creeaza_profil();

-- --- Predicate de rol pentru RLS --------------------------------------------
--
-- `stable` + `security definer`: predicatul citește `ie_profiles`, iar dacă ar
-- rula sub RLS-ul apelantului ar intra în recursiune la evaluarea propriilor
-- politici. `search_path` fixat închide vectorul clasic de deturnare a căutării.
create or replace function public.ie_rol()
returns text language sql stable security definer set search_path = public as $$
  select role from public.ie_profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.ie_este_personal()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.ie_rol() in ('SUPER_ADMIN','ADMIN','OPERATOR','RECEPTIONIST'), false);
$$;

create or replace function public.ie_este_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.ie_rol() in ('SUPER_ADMIN','ADMIN'), false);
$$;

-- --- Operatori (§16) ---------------------------------------------------------
--
-- Un operator este un profil cu program, culoare de calendar și listă de
-- servicii. Îl ținem separat de profil pentru că are câmpuri pe care un client
-- nu le are niciodată, și pentru că un operator poate fi dezactivat (pleacă din
-- birou) fără să-i ștergem contul și istoricul.
create table if not exists public.ie_operators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.ie_profiles(id) on delete set null,
  display_name text not null,
  slug text not null unique,
  title text,
  bio text,
  email text,
  phone text,
  -- Culoarea barei din calendar. Hex validat, ca să nu ajungă CSS arbitrar în
  -- atributul `style` al unei componente de calendar.
  color text not null default '#00b34a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active boolean not null default true,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_operators_activ on public.ie_operators (is_active, sort_order);

drop trigger if exists trg_ie_operators_updated on public.ie_operators;
create trigger trg_ie_operators_updated before update on public.ie_operators
  for each row execute function public.ie_set_updated_at();

/* Operatorul legat de utilizatorul curent — folosit de politicile RLS. */
create or replace function public.ie_operator_curent()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.ie_operators where profile_id = auth.uid() and is_active;
$$;
