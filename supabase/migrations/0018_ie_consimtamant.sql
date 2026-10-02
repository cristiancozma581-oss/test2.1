-- ============================================================================
-- 0018 — Consimțământul GDPR se păstrează la înregistrare (§49).
--
-- Formularul de înregistrare cere bifa, schema o validează, iar `ie_profiles`
-- are coloana `gdpr_accepted_at` exact pentru ea — dar triggerul de creare a
-- profilului o ignora, deci fiecare cont rămânea cu `null`. Platforma cerea un
-- consimțământ pe care apoi nu-l putea demonstra, ceea ce anulează rostul
-- câmpului.
--
-- Momentul se scrie în bază, în aceeași tranzacție cu crearea profilului, nu
-- printr-un `update` separat din aplicație: un al doilea apel care poate eșua
-- tăcut ar readuce exact problema pe care o reparăm.
-- ============================================================================

create or replace function public.ie_creeaza_profil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  consimtit timestamptz;
begin
  /*
   * Momentul consimțământului vine din metadatele înregistrării.
   *
   * Este o dată aleasă de client, deci nu i se dă crezare oarbă: dacă lipsește
   * sau nu se poate citi, folosim `now()`. Contul nu se poate crea decât prin
   * formularul care CERE bifa, așa că momentul creării este o aproximare
   * onestă — și, oricum, nu poate fi mai devreme decât adevărul.
   */
  begin
    consimtit := (new.raw_user_meta_data->>'gdpr_accepted_at')::timestamptz;
  exception
    when others then consimtit := null;
  end;

  if consimtit is null or consimtit > now() then
    consimtit := now();
  end if;

  insert into public.ie_profiles (
    id, email, full_name, phone, preferred_locale, role, gdpr_accepted_at
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_locale', ''), 'it'),
    'CLIENT',
    consimtit
  )
  on conflict (id) do nothing;

  return new;
end $$;
