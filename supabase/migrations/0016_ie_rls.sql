-- ============================================================================
-- 0016 — Row Level Security (§24, §35, §50, §75).
--
-- Modelul: RLS activ pe TOATE tabelele `ie_*`, deci lipsa unei politici
-- înseamnă acces zero, nu acces liber. Cheia `anon` care ajunge inevitabil în
-- browser nu deschide nimic în afară de catalogul public.
--
-- Ce NU se face prin RLS, ci prin cheia de service, din stratul de acces la
-- date, după verificarea explicită a autorizării:
--   * inserarea unei programări făcute fără cont (oaspetele nu are `auth.uid()`
--     și nu trebuie să primească un drept de insert pe care l-ar putea folosi
--     în buclă);
--   * emiterea linkurilor semnate către documente;
--   * scrierile în jurnalul de audit și în coada de notificări.
--
-- Testele din `lib/immy/*.test.ts` verifică matricea de permisiuni a aplicației;
-- politicile de aici sunt a doua plasă, sub ea.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'ie_settings', 'ie_audit_logs', 'ie_appointment_counters',
    'ie_profiles', 'ie_operators',
    'ie_categories', 'ie_services', 'ie_operator_services',
    'ie_service_documents', 'ie_service_steps', 'ie_faq',
    'ie_availability', 'ie_availability_exceptions',
    'ie_appointments', 'ie_appointment_status_history',
    'ie_cases', 'ie_case_status_history',
    'ie_documents', 'ie_document_versions',
    'ie_threads', 'ie_messages', 'ie_message_attachments',
    'ie_notifications', 'ie_notification_templates',
    'ie_payments', 'ie_site_content', 'ie_knowledge_base', 'ie_assistant_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- `force` face ca politicile să se aplice și proprietarului tabelei. Fără
    -- el, o migrație rulată ca owner ar putea masca o politică lipsă.
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Catalogul public: oricine citește, numai personalul scrie.
-- ---------------------------------------------------------------------------

drop policy if exists ie_settings_citire on public.ie_settings;
create policy ie_settings_citire on public.ie_settings for select using (true);
drop policy if exists ie_settings_scriere on public.ie_settings;
create policy ie_settings_scriere on public.ie_settings for update
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_categories_citire on public.ie_categories;
create policy ie_categories_citire on public.ie_categories for select
  using (is_active or public.ie_este_personal());
drop policy if exists ie_categories_scriere on public.ie_categories;
create policy ie_categories_scriere on public.ie_categories for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- Doar serviciile ACTIVE sunt publice: o ciornă nu trebuie să fie vizibilă
-- cuiva care ghicește slug-ul.
drop policy if exists ie_services_citire on public.ie_services;
create policy ie_services_citire on public.ie_services for select
  using (status = 'ACTIVE' or public.ie_este_personal());
drop policy if exists ie_services_scriere on public.ie_services;
create policy ie_services_scriere on public.ie_services for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_operators_citire on public.ie_operators;
create policy ie_operators_citire on public.ie_operators for select
  using (is_active or public.ie_este_personal());
drop policy if exists ie_operators_scriere on public.ie_operators;
create policy ie_operators_scriere on public.ie_operators for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_operator_services_citire on public.ie_operator_services;
create policy ie_operator_services_citire on public.ie_operator_services for select using (true);
drop policy if exists ie_operator_services_scriere on public.ie_operator_services;
create policy ie_operator_services_scriere on public.ie_operator_services for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_service_documents_citire on public.ie_service_documents;
create policy ie_service_documents_citire on public.ie_service_documents for select using (true);
drop policy if exists ie_service_documents_scriere on public.ie_service_documents;
create policy ie_service_documents_scriere on public.ie_service_documents for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_service_steps_citire on public.ie_service_steps;
create policy ie_service_steps_citire on public.ie_service_steps for select using (true);
drop policy if exists ie_service_steps_scriere on public.ie_service_steps;
create policy ie_service_steps_scriere on public.ie_service_steps for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_faq_citire on public.ie_faq;
create policy ie_faq_citire on public.ie_faq for select
  using (is_active or public.ie_este_personal());
drop policy if exists ie_faq_scriere on public.ie_faq;
create policy ie_faq_scriere on public.ie_faq for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_content_citire on public.ie_site_content;
create policy ie_content_citire on public.ie_site_content for select using (true);
drop policy if exists ie_content_scriere on public.ie_site_content;
create policy ie_content_scriere on public.ie_site_content for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- Baza de cunoștințe: articolele `internal` rămân la personal.
drop policy if exists ie_kb_citire on public.ie_knowledge_base;
create policy ie_kb_citire on public.ie_knowledge_base for select
  using ((is_active and visibility = 'public') or public.ie_este_personal());
drop policy if exists ie_kb_scriere on public.ie_knowledge_base;
create policy ie_kb_scriere on public.ie_knowledge_base for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- Disponibilitatea trebuie să fie publică: fără ea, pagina de rezervare nu
-- poate desena calendarul. Nu conține date personale — doar ore de birou.
drop policy if exists ie_availability_citire on public.ie_availability;
create policy ie_availability_citire on public.ie_availability for select using (true);
drop policy if exists ie_availability_scriere on public.ie_availability;
create policy ie_availability_scriere on public.ie_availability for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_exceptions_citire on public.ie_availability_exceptions;
create policy ie_exceptions_citire on public.ie_availability_exceptions for select using (true);
drop policy if exists ie_exceptions_scriere on public.ie_availability_exceptions;
create policy ie_exceptions_scriere on public.ie_availability_exceptions for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- ---------------------------------------------------------------------------
-- Profiluri
-- ---------------------------------------------------------------------------

drop policy if exists ie_profiles_citire on public.ie_profiles;
create policy ie_profiles_citire on public.ie_profiles for select
  using (id = auth.uid() or public.ie_este_personal());

-- Utilizatorul își editează profilul, dar NU rolul și NU statusul: `with check`
-- compară cu valorile deja existente în rând, deci un update care le-ar schimba
-- este respins. Fără asta, oricine s-ar putea promova administrator.
drop policy if exists ie_profiles_actualizare_proprie on public.ie_profiles;
create policy ie_profiles_actualizare_proprie on public.ie_profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.ie_profiles p where p.id = auth.uid())
    and status = (select p.status from public.ie_profiles p where p.id = auth.uid())
  );

drop policy if exists ie_profiles_admin on public.ie_profiles;
create policy ie_profiles_admin on public.ie_profiles for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- ---------------------------------------------------------------------------
-- Programări
-- ---------------------------------------------------------------------------

drop policy if exists ie_appointments_citire on public.ie_appointments;
create policy ie_appointments_citire on public.ie_appointments for select
  using (client_id = auth.uid() or public.ie_este_personal());

-- Clientul autentificat poate rezerva pentru el însuși. Oaspeții trec prin
-- stratul de acces la date, cu cheia de service.
drop policy if exists ie_appointments_insert_client on public.ie_appointments;
create policy ie_appointments_insert_client on public.ie_appointments for insert
  with check (client_id = auth.uid() and status = 'PENDING');

-- Clientul poate doar să anuleze: `with check` îi limitează destinația la
-- CANCELLED, deci nu-și poate confirma singur programarea și nici nu o poate
-- muta pe ora altcuiva.
drop policy if exists ie_appointments_anulare_client on public.ie_appointments;
create policy ie_appointments_anulare_client on public.ie_appointments for update
  using (client_id = auth.uid() and status in ('PENDING', 'CONFIRMED', 'RESCHEDULED'))
  with check (client_id = auth.uid() and status = 'CANCELLED');

drop policy if exists ie_appointments_personal on public.ie_appointments;
create policy ie_appointments_personal on public.ie_appointments for all
  using (public.ie_este_personal()) with check (public.ie_este_personal());

drop policy if exists ie_appt_history_citire on public.ie_appointment_status_history;
create policy ie_appt_history_citire on public.ie_appointment_status_history for select
  using (
    public.ie_este_personal()
    or exists (select 1 from public.ie_appointments a
                where a.id = appointment_id and a.client_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Dosare
-- ---------------------------------------------------------------------------

drop policy if exists ie_cases_citire on public.ie_cases;
create policy ie_cases_citire on public.ie_cases for select
  using (client_id = auth.uid() or public.ie_este_personal());
drop policy if exists ie_cases_personal on public.ie_cases;
create policy ie_cases_personal on public.ie_cases for all
  using (public.ie_este_personal()) with check (public.ie_este_personal());

drop policy if exists ie_case_history_citire on public.ie_case_status_history;
create policy ie_case_history_citire on public.ie_case_status_history for select
  using (
    public.ie_este_personal()
    or exists (select 1 from public.ie_cases c where c.id = case_id and c.client_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Documente — §24: „un client poate vedea doar documentele proprii".
-- ---------------------------------------------------------------------------

drop policy if exists ie_documents_citire on public.ie_documents;
create policy ie_documents_citire on public.ie_documents for select
  using (client_id = auth.uid() or public.ie_este_personal());

-- Clientul încarcă documente doar în dosarele lui. Verificarea pe dosar este
-- separată de cea pe `client_id`: fără ea, un client ar putea crea un document
-- cu `client_id` propriu, dar `case_id` al altcuiva, și ar ateriza în dosarul
-- străin.
drop policy if exists ie_documents_insert_client on public.ie_documents;
create policy ie_documents_insert_client on public.ie_documents for insert
  with check (
    client_id = auth.uid()
    and (case_id is null
         or exists (select 1 from public.ie_cases c
                     where c.id = case_id and c.client_id = auth.uid()))
  );

drop policy if exists ie_documents_personal on public.ie_documents;
create policy ie_documents_personal on public.ie_documents for all
  using (public.ie_este_personal()) with check (public.ie_este_personal());

drop policy if exists ie_doc_versions_citire on public.ie_document_versions;
create policy ie_doc_versions_citire on public.ie_document_versions for select
  using (
    public.ie_este_personal()
    or exists (select 1 from public.ie_documents d
                where d.id = document_id and d.client_id = auth.uid())
  );

drop policy if exists ie_doc_versions_insert on public.ie_document_versions;
create policy ie_doc_versions_insert on public.ie_document_versions for insert
  with check (
    public.ie_este_personal()
    or exists (select 1 from public.ie_documents d
                where d.id = document_id and d.client_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Mesagerie
-- ---------------------------------------------------------------------------

drop policy if exists ie_threads_citire on public.ie_threads;
create policy ie_threads_citire on public.ie_threads for select
  using (client_id = auth.uid() or public.ie_este_personal());
drop policy if exists ie_threads_personal on public.ie_threads;
create policy ie_threads_personal on public.ie_threads for all
  using (public.ie_este_personal()) with check (public.ie_este_personal());
drop policy if exists ie_threads_insert_client on public.ie_threads;
create policy ie_threads_insert_client on public.ie_threads for insert
  with check (client_id = auth.uid());

drop policy if exists ie_messages_citire on public.ie_messages;
create policy ie_messages_citire on public.ie_messages for select
  using (
    public.ie_este_personal()
    or exists (select 1 from public.ie_threads t
                where t.id = thread_id and t.client_id = auth.uid())
  );

-- Un client nu poate scrie un mesaj semnat „OPERATOR": rolul din rând trebuie
-- să fie CLIENT, iar firul trebuie să fie al lui.
drop policy if exists ie_messages_insert_client on public.ie_messages;
create policy ie_messages_insert_client on public.ie_messages for insert
  with check (
    sender_id = auth.uid() and sender_role = 'CLIENT'
    and exists (select 1 from public.ie_threads t
                 where t.id = thread_id and t.client_id = auth.uid() and not t.is_closed)
  );

drop policy if exists ie_messages_personal on public.ie_messages;
create policy ie_messages_personal on public.ie_messages for all
  using (public.ie_este_personal()) with check (public.ie_este_personal());

drop policy if exists ie_attachments_citire on public.ie_message_attachments;
create policy ie_attachments_citire on public.ie_message_attachments for select
  using (
    public.ie_este_personal()
    or exists (select 1 from public.ie_messages m
                join public.ie_threads t on t.id = m.thread_id
                where m.id = message_id and t.client_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Notificări, plăți, audit
-- ---------------------------------------------------------------------------

drop policy if exists ie_notif_citire on public.ie_notifications;
create policy ie_notif_citire on public.ie_notifications for select
  using (
    (audience = 'client' and recipient_id = auth.uid())
    or (audience = 'staff' and public.ie_este_personal())
  );

-- Destinatarul poate marca „citit". `with check` reafirmă proprietatea, ca un
-- update să nu poată muta notificarea către alt cont.
drop policy if exists ie_notif_marcare on public.ie_notifications;
create policy ie_notif_marcare on public.ie_notifications for update
  using (recipient_id = auth.uid() or (audience = 'staff' and public.ie_este_personal()))
  with check (recipient_id = auth.uid() or (audience = 'staff' and public.ie_este_personal()));

drop policy if exists ie_templates_citire on public.ie_notification_templates;
create policy ie_templates_citire on public.ie_notification_templates for select
  using (public.ie_este_personal());
drop policy if exists ie_templates_scriere on public.ie_notification_templates;
create policy ie_templates_scriere on public.ie_notification_templates for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

drop policy if exists ie_payments_citire on public.ie_payments;
create policy ie_payments_citire on public.ie_payments for select
  using (client_id = auth.uid() or public.ie_este_personal());
drop policy if exists ie_payments_scriere on public.ie_payments;
create policy ie_payments_scriere on public.ie_payments for all
  using (public.ie_este_admin()) with check (public.ie_este_admin());

-- Jurnalul de audit se citește, nu se editează. Nu există politică de insert,
-- update sau delete pentru NIMENI: singura cale de scriere este cheia de
-- service, din `lib/immy/audit.ts`. Un administrator care ar putea rescrie
-- jurnalul ar face jurnalul inutil tocmai când contează.
drop policy if exists ie_audit_citire on public.ie_audit_logs;
create policy ie_audit_citire on public.ie_audit_logs for select
  using (public.ie_este_admin());

drop policy if exists ie_assistant_citire on public.ie_assistant_messages;
create policy ie_assistant_citire on public.ie_assistant_messages for select
  using (public.ie_este_personal() or profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket-ul privat al documentelor (§24, §62).
-- ---------------------------------------------------------------------------
--
-- Bucket NEPUBLIC. Nu i se atașează nicio politică de `storage.objects` pentru
-- `anon` sau `authenticated`: încărcarea și citirea trec prin cheia de service,
-- după verificarea accesului în aplicație, iar clientul primește doar un link
-- semnat, de scurtă durată. Astfel nu există nicio adresă directă utilizabilă,
-- deci nici IDOR pe cale de storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ie-documenti', 'ie-documenti', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
