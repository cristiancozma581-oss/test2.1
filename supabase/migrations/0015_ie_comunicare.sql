-- ============================================================================
-- 0015 — Mesagerie, notificări, plăți, conținut editabil (§26-§31, §37, §43-§45).
-- ============================================================================

-- --- Conversații client ↔ operator (§26) ------------------------------------
--
-- Firul este legat de dosar, nu de programare: pratica ține luni, programările
-- sunt momente în ea. Un fir fără dosar (`case_id` null) este contactul general.
create table if not exists public.ie_threads (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.ie_cases(id) on delete cascade,
  client_id uuid not null references public.ie_profiles(id) on delete cascade,
  operator_id uuid references public.ie_operators(id) on delete set null,
  subject text not null,
  is_closed boolean not null default false,
  last_message_at timestamptz not null default now(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_threads_client on public.ie_threads (client_id, last_message_at desc);
create index if not exists idx_ie_threads_operator on public.ie_threads (operator_id, last_message_at desc);
create index if not exists idx_ie_threads_dosar on public.ie_threads (case_id);

create table if not exists public.ie_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ie_threads(id) on delete cascade,
  sender_id uuid references public.ie_profiles(id) on delete set null,
  -- Rolul expeditorului se îngheață aici. Dacă mâine un operator devine
  -- administrator, mesajele lui de anul trecut trebuie să rămână afișate ca
  -- venind de la un operator.
  sender_role text not null check (sender_role in ('CLIENT', 'OPERATOR', 'ADMIN', 'SYSTEM')),
  body text not null,
  read_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_messages_fir on public.ie_messages (thread_id, created_at);
create index if not exists idx_ie_messages_necitite
  on public.ie_messages (thread_id) where read_at is null;

create table if not exists public.ie_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ie_messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_attachments_mesaj on public.ie_message_attachments (message_id);

/* Ordinea firelor în inbox trebuie să se întrețină singură; altfel un fir
 * activ cade la coadă pentru că o cale de cod a uitat să-l atingă. */
create or replace function public.ie_atinge_fir()
returns trigger language plpgsql as $$
begin
  update public.ie_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end $$;

drop trigger if exists trg_ie_messages_atinge_fir on public.ie_messages;
create trigger trg_ie_messages_atinge_fir after insert on public.ie_messages
  for each row execute function public.ie_atinge_fir();

-- --- Notificări (§27, §65, §66) ---------------------------------------------
create table if not exists public.ie_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.ie_profiles(id) on delete cascade,
  -- Destinatarul poate fi un oaspete fără cont: confirmarea unei rezervări
  -- făcute fără autentificare trebuie totuși să plece pe e-mail.
  recipient_email text,
  audience text not null default 'client' check (audience in ('client', 'staff')),
  event text not null check (event in (
    'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'APPOINTMENT_COMPLETED',
    'DOCUMENT_REQUESTED', 'DOCUMENT_UPLOADED', 'DOCUMENT_VERIFIED',
    'DOCUMENT_REJECTED', 'MESSAGE_RECEIVED', 'CASE_STATUS_CHANGED', 'ACCOUNT_WELCOME'
  )),
  title text not null,
  body text not null,
  link text,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'urgent')),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  -- Starea livrării pe canale externe. `queued` înseamnă „de trimis", nu
  -- „trimis": un adaptor neconfigurat lasă rândul în coadă, vizibil, în loc să
  -- pretindă că a livrat.
  email_status text not null default 'skipped'
    check (email_status in ('skipped', 'queued', 'sent', 'failed')),
  telegram_status text not null default 'skipped'
    check (telegram_status in ('skipped', 'queued', 'sent', 'failed')),
  delivery_error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_notif_destinatar
  on public.ie_notifications (recipient_id, created_at desc);
create index if not exists idx_ie_notif_necitite
  on public.ie_notifications (recipient_id) where read_at is null;
create index if not exists idx_ie_notif_coada
  on public.ie_notifications (created_at) where email_status = 'queued' or telegram_status = 'queued';

-- Șabloanele de mesaj (§29). Corpul folosește substituții `{{cheie}}`,
-- rezolvate în `lib/immy/notificari/sabloane.ts`.
create table if not exists public.ie_notification_templates (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  channel text not null check (channel in ('inapp', 'email', 'whatsapp', 'telegram')),
  locale text not null default 'it' check (locale in ('it','ro','en')),
  subject text,
  body text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (event, channel, locale)
);

drop trigger if exists trg_ie_templates_updated on public.ie_notification_templates;
create trigger trg_ie_templates_updated before update on public.ie_notification_templates
  for each row execute function public.ie_set_updated_at();

-- --- Plăți (§43) -------------------------------------------------------------
--
-- Infrastructura există de la început, dar plata online rămâne închisă până
-- când administratorul o configurează (`ie_settings.payments_online_enabled`).
-- Până atunci, singura metodă validă este plata la sediu.
create table if not exists public.ie_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.ie_appointments(id) on delete set null,
  case_id uuid references public.ie_cases(id) on delete set null,
  client_id uuid references public.ie_profiles(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  method text not null default 'office' check (method in ('office', 'stripe', 'paypal')),
  status text not null default 'UNPAID'
    check (status in ('UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'CANCELLED')),
  provider_reference text,
  paid_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ie_payments_client on public.ie_payments (client_id, created_at desc);
create index if not exists idx_ie_payments_status on public.ie_payments (status);

drop trigger if exists trg_ie_payments_updated on public.ie_payments;
create trigger trg_ie_payments_updated before update on public.ie_payments
  for each row execute function public.ie_set_updated_at();

-- --- Conținut editabil din admin (§37) --------------------------------------
--
-- Cheie → valoare, pe limbă. Frontendul cere o cheie și primește textul curent;
-- dacă lipsește, folosește valoarea implicită din cod, deci pagina nu se rupe
-- niciodată pentru că o cheie n-a fost încă completată.
create table if not exists public.ie_site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  locale text not null default 'it' check (locale in ('it','ro','en')),
  value text not null,
  updated_by uuid references public.ie_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (key, locale)
);

drop trigger if exists trg_ie_content_updated on public.ie_site_content;
create trigger trg_ie_content_updated before update on public.ie_site_content
  for each row execute function public.ie_set_updated_at();

-- --- Baza de cunoștințe a asistentului (§45) --------------------------------
create table if not exists public.ie_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.ie_services(id) on delete set null,
  category_id uuid references public.ie_categories(id) on delete set null,
  title text not null,
  body text not null,
  keywords text[] not null default '{}',
  locale text not null default 'it' check (locale in ('it','ro','en')),
  -- Articolele interne ajută operatorii, dar nu trebuie citate clientului de
  -- către asistentul public.
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_vector tsvector generated always as (
    setweight(to_tsvector('public.ie_it', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('public.ie_it', array_to_string(keywords, ' ')), 'A') ||
    setweight(to_tsvector('public.ie_it', coalesce(body, '')), 'B')
  ) stored
);
create index if not exists idx_ie_kb_cautare on public.ie_knowledge_base using gin (search_vector);
create index if not exists idx_ie_kb_activ on public.ie_knowledge_base (is_active, visibility);

drop trigger if exists trg_ie_kb_updated on public.ie_knowledge_base;
create trigger trg_ie_kb_updated before update on public.ie_knowledge_base
  for each row execute function public.ie_set_updated_at();

-- Conversațiile cu asistentul, pentru a putea îmbunătăți baza de cunoștințe
-- pornind de la întrebările la care chiar nu a știut să răspundă (§46).
create table if not exists public.ie_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  profile_id uuid references public.ie_profiles(id) on delete set null,
  question text not null,
  answer text not null,
  matched_service_id uuid references public.ie_services(id) on delete set null,
  handed_off boolean not null default false,
  locale text not null default 'it',
  created_at timestamptz not null default now()
);
create index if not exists idx_ie_assistant_sesiune
  on public.ie_assistant_messages (session_key, created_at);
create index if not exists idx_ie_assistant_handoff
  on public.ie_assistant_messages (created_at desc) where handed_off;
