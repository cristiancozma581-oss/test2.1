-- ============================================================================
-- 0017 — Date de pornire (§9, §74).
--
-- Două feluri de date, deliberat separate:
--   * CATALOGUL REAL — categoriile, serviciile, programul biroului, FAQ-ul.
--     Sunt datele cu care biroul chiar lucrează, preluate din situl existent.
--     `is_demo = false`.
--   * DATELE DEMO — clienți, programări și dosare de exemplu. Toate au
--     `is_demo = true`, deci se șterg cu o singură comandă (vezi finalul
--     fișierului), fără să atingă catalogul.
--
-- Fișierul este idempotent: rulat de două ori, actualizează, nu dublează.
-- ============================================================================

-- --- Categorii (§7) ----------------------------------------------------------
insert into public.ie_categories (slug, name, description, icon, color, sort_order) values
  ('cittadinanza-soggiorno', 'Cittadinanza e Soggiorno',
   'Cittadinanza italiana, carta e permessi di soggiorno, ricongiungimento familiare.',
   'passport', '#0a6b3a', 10),
  ('decreto-flussi-sanatoria', 'Decreto Flussi e Sanatoria',
   'Domande nell''ambito del decreto flussi e delle procedure di emersione.',
   'file-stack', '#0f8a45', 20),
  ('servizi-digitali-anagrafici', 'Servizi Digitali e Anagrafici',
   'SPID, residenza online, certificati anagrafici e casellario giudiziale.',
   'id-card', '#00b34a', 30),
  ('fiscale-caf', 'Fiscale e CAF',
   'Dichiarazione dei redditi, partita IVA, assegno unico e prestazioni INPS.',
   'calculator', '#045c33', 40),
  ('lavoro', 'Lavoro',
   'Contratti di lavoro domestico, curriculum vitae e pratiche collegate.',
   'briefcase', '#0a6b3a', 50),
  ('legali-internazionali', 'Legali e Internazionali',
   'Legalizzazioni, apostille, traduzioni, visti e assistenza legale.',
   'scale', '#0f8a45', 60)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      color = excluded.color,
      sort_order = excluded.sort_order;

-- --- Operatori (§16, §74) ----------------------------------------------------
insert into public.ie_operators (slug, display_name, title, color, sort_order) values
  ('immy', 'Immy', 'Consulente pratiche e assistenza fiscale', '#0a6b3a', 10),
  ('emy', 'Emy', 'Accoglienza, servizi digitali e appuntamenti', '#00b34a', 20)
on conflict (slug) do update
  set display_name = excluded.display_name,
      title = excluded.title,
      color = excluded.color,
      sort_order = excluded.sort_order;

-- --- Servicii (§9) -----------------------------------------------------------
--
-- Duratele și repartiția pe operatori vin din mockup-ul existent: „L" era
-- calendarul lui Immy, „S" cel al lui Emy.
with c as (select id, slug from public.ie_categories)
insert into public.ie_services
  (category_id, slug, name, short_description, keywords, duration_minutes, status,
   requires_documents, sort_order)
select c.id, v.slug, v.name, v.short_description, v.keywords, v.durata, 'ACTIVE',
       v.cere_documente, v.ordine
from (values
  -- Cittadinanza e Soggiorno
  ('cittadinanza-soggiorno', 'cittadinanza', 'Cittadinanza',
   'Domanda di cittadinanza italiana: verifica dei requisiti, preparazione e invio della pratica.',
   array['cittadinanza','naturalizzazione','matrimonio','residenza','citizenship','cetatenie'], 60, true, 10),
  ('cittadinanza-soggiorno', 'carta-di-soggiorno-informazioni', 'Carta di soggiorno — Informazioni',
   'Colloquio informativo sui requisiti del permesso di soggiorno UE per soggiornanti di lungo periodo.',
   array['carta di soggiorno','lungo periodo','informazioni','permesso'], 15, false, 20),
  ('cittadinanza-soggiorno', 'carta-di-soggiorno-kit', 'Carta di soggiorno — Compilazione kit',
   'Compilazione completa del kit postale per la carta di soggiorno.',
   array['carta di soggiorno','kit','compilazione','poste'], 60, true, 30),
  ('cittadinanza-soggiorno', 'permessi-di-soggiorno-kit', 'Permessi di soggiorno — Compilazione kit',
   'Richiesta o rinnovo del permesso di soggiorno: compilazione del kit e verifica dei documenti.',
   array['permesso di soggiorno','rinnovo','richiesta','kit','questura'], 60, true, 40),
  ('cittadinanza-soggiorno', 'ricongiungimento-familiare', 'Ricongiungimento familiare',
   'Nulla osta al ricongiungimento familiare: requisiti di reddito e alloggio, domanda allo Sportello Unico.',
   array['ricongiungimento','famiglia','nulla osta','coesione'], 60, true, 50),

  -- Decreto Flussi e Sanatoria
  ('decreto-flussi-sanatoria', 'decreto-flussi-informazioni', 'Decreto flussi e sanatoria — Informazioni',
   'Colloquio informativo su quote, requisiti e scadenze del decreto flussi.',
   array['decreto flussi','sanatoria','quote','informazioni','click day'], 15, false, 10),
  ('decreto-flussi-sanatoria', 'decreto-flussi-domanda', 'Decreto flussi e sanatoria',
   'Preparazione e invio della domanda nell''ambito del decreto flussi.',
   array['decreto flussi','sanatoria','domanda','emersione','lavoro subordinato'], 60, true, 20),

  -- Servizi Digitali e Anagrafici
  ('servizi-digitali-anagrafici', 'spid', 'SPID — Richiesta SPID',
   'Attivazione dell''identità digitale SPID con riconoscimento in sede.',
   array['spid','identita digitale','identita','pin','accesso'], 15, true, 10),
  ('servizi-digitali-anagrafici', 'residenza-online', 'Residenza on-line',
   'Domanda di residenza o cambio di indirizzo tramite i servizi anagrafici online.',
   array['residenza','cambio indirizzo','anagrafe','domicilio'], 60, true, 20),
  ('servizi-digitali-anagrafici', 'certificati-anagrafici', 'Certificati anagrafici',
   'Richiesta di certificati anagrafici: stato di famiglia, nascita, residenza, cittadinanza.',
   array['certificati','anagrafe','stato di famiglia','nascita','residenza'], 15, false, 30),
  ('servizi-digitali-anagrafici', 'casellario-giudiziale', 'Casellario giudiziale e carichi pendenti / procure',
   'Richiesta del certificato del casellario giudiziale, dei carichi pendenti e redazione di procure.',
   array['casellario','carichi pendenti','procura','penale','tribunale'], 30, true, 40),

  -- Fiscale e CAF
  ('fiscale-caf', '730-modello-unico', '730 e Mod. Unico',
   'Compilazione e invio della dichiarazione dei redditi, modello 730 o Redditi PF.',
   array['730','modello unico','redditi','dichiarazione','tasse','irpef','caf'], 60, true, 10),
  ('fiscale-caf', 'apertura-chiusura-iva', 'Apertura e chiusura IVA',
   'Apertura, variazione e chiusura della partita IVA.',
   array['partita iva','apertura','chiusura','regime forfettario','autonomo'], 30, true, 20),
  ('fiscale-caf', 'assegno-unico', 'Assegno unico',
   'Domanda di assegno unico e universale per i figli a carico.',
   array['assegno unico','figli','inps','famiglia','bonus'], 15, true, 30),
  ('fiscale-caf', 'naspi', 'Naspi',
   'Domanda di indennità di disoccupazione Naspi e verifica dei requisiti.',
   array['naspi','disoccupazione','inps','licenziamento','indennita'], 30, true, 40),

  -- Lavoro
  ('lavoro', 'contratti-lavoro-domestico', 'Contratti di lavoro domestico',
   'Assunzione, gestione e cessazione di colf, badanti e baby sitter, con contributi INPS.',
   array['colf','badante','domestico','contratto','inps','baby sitter'], 60, true, 10),
  ('lavoro', 'curriculum-vitae', 'Curriculum vitae',
   'Redazione del curriculum vitae in formato europeo e supporto alla candidatura.',
   array['curriculum','cv','lavoro','europass','candidatura'], 60, false, 20),

  -- Legali e Internazionali
  ('legali-internazionali', 'legalizzazioni-apostille-traduzioni', 'Legalizzazioni / Apostille / Traduzioni',
   'Legalizzazione e apostille di documenti, traduzioni giurate.',
   array['apostille','legalizzazione','traduzione','giurata','asseverata'], 30, true, 10),
  ('legali-internazionali', 'visti-assicurazioni-informazioni', 'Visti turismo / Assicurazioni sanitarie — Informazioni',
   'Informazioni su visti turistici, lettere di invito e assicurazioni sanitarie per viaggio.',
   array['visto','turismo','invito','assicurazione','viaggio'], 60, false, 20),
  ('legali-internazionali', 'assistenza-legale-informazioni', 'Assistenza legale — Informazioni',
   'Primo colloquio informativo e orientamento verso il professionista competente.',
   array['legale','avvocato','ricorso','consulenza','informazioni'], 15, false, 30)
) as v(cat_slug, slug, name, short_description, keywords, durata, cere_documente, ordine)
join c on c.slug = v.cat_slug
on conflict (slug) do update
  set name = excluded.name,
      short_description = excluded.short_description,
      keywords = excluded.keywords,
      duration_minutes = excluded.duration_minutes,
      category_id = excluded.category_id,
      requires_documents = excluded.requires_documents,
      sort_order = excluded.sort_order;

-- Repartiția pe operatori, exact ca în mockup („L" = Immy, „S" = Emy).
delete from public.ie_operator_services;
insert into public.ie_operator_services (operator_id, service_id)
select o.id, s.id
from public.ie_operators o
join public.ie_services s on s.slug = any (
  case o.slug
    when 'immy' then array[
      'cittadinanza', 'ricongiungimento-familiare',
      'decreto-flussi-informazioni', 'decreto-flussi-domanda',
      '730-modello-unico', 'apertura-chiusura-iva',
      'legalizzazioni-apostille-traduzioni', 'visti-assicurazioni-informazioni',
      'assistenza-legale-informazioni']
    when 'emy' then array[
      'carta-di-soggiorno-informazioni', 'carta-di-soggiorno-kit',
      'permessi-di-soggiorno-kit', 'spid', 'residenza-online',
      'certificati-anagrafici', 'casellario-giudiziale',
      'assegno-unico', 'naspi',
      'contratti-lavoro-domestico', 'curriculum-vitae']
    else array[]::text[]
  end
)
on conflict do nothing;

-- --- Documentele cerute de fiecare serviciu (§10) ----------------------------
delete from public.ie_service_documents;
insert into public.ie_service_documents (service_id, label, hint, is_required, sort_order)
select s.id, v.label, v.hint, v.obligatoriu, v.ordine
from (values
  ('cittadinanza', 'Passaporto in corso di validità', 'Tutte le pagine con timbri.', true, 10),
  ('cittadinanza', 'Permesso di soggiorno', 'Fronte e retro.', true, 20),
  ('cittadinanza', 'Certificato di nascita tradotto e legalizzato', 'Con apostille del paese di origine.', true, 30),
  ('cittadinanza', 'Certificato penale del paese di origine', 'Rilasciato da meno di 6 mesi.', true, 40),
  ('cittadinanza', 'Dichiarazione dei redditi degli ultimi 3 anni', null, true, 50),
  ('cittadinanza', 'Certificato di conoscenza della lingua italiana B1', null, true, 60),

  ('carta-di-soggiorno-kit', 'Passaporto in corso di validità', null, true, 10),
  ('carta-di-soggiorno-kit', 'Permesso di soggiorno attuale', null, true, 20),
  ('carta-di-soggiorno-kit', 'Certificato di residenza e stato di famiglia', null, true, 30),
  ('carta-di-soggiorno-kit', 'Idoneità alloggiativa', null, true, 40),
  ('carta-di-soggiorno-kit', 'Documentazione del reddito', 'CUD, 730 o buste paga.', true, 50),
  ('carta-di-soggiorno-kit', 'Attestato di lingua italiana A2', null, true, 60),

  ('permessi-di-soggiorno-kit', 'Passaporto in corso di validità', null, true, 10),
  ('permessi-di-soggiorno-kit', 'Permesso di soggiorno scaduto o in scadenza', null, true, 20),
  ('permessi-di-soggiorno-kit', 'Contratto di lavoro o documentazione del reddito', null, true, 30),
  ('permessi-di-soggiorno-kit', 'Contratto di affitto o ospitalità', null, true, 40),
  ('permessi-di-soggiorno-kit', 'Marca da bollo da 16 €', null, true, 50),

  ('ricongiungimento-familiare', 'Passaporto del richiedente', null, true, 10),
  ('ricongiungimento-familiare', 'Documentazione del reddito', 'Ultima dichiarazione dei redditi.', true, 20),
  ('ricongiungimento-familiare', 'Idoneità alloggiativa', null, true, 30),
  ('ricongiungimento-familiare', 'Certificati di stato civile del familiare', 'Tradotti e legalizzati.', true, 40),

  ('spid', 'Documento d''identità italiano in corso di validità', null, true, 10),
  ('spid', 'Tessera sanitaria o codice fiscale', null, true, 20),
  ('spid', 'Numero di cellulare e indirizzo email personali', 'Devono essere accessibili durante l''appuntamento.', true, 30),

  ('730-modello-unico', 'Documento d''identità e codice fiscale', null, true, 10),
  ('730-modello-unico', 'CU / CUD del datore di lavoro', null, true, 20),
  ('730-modello-unico', 'Spese mediche e scontrini detraibili', null, false, 30),
  ('730-modello-unico', 'Contratto di affitto registrato', 'Se richiedi la detrazione per l''abitazione.', false, 40),
  ('730-modello-unico', 'Visure catastali degli immobili', null, false, 50),

  ('naspi', 'Documento d''identità e codice fiscale', null, true, 10),
  ('naspi', 'Lettera di licenziamento o cessazione', null, true, 20),
  ('naspi', 'Ultime buste paga', null, true, 30),
  ('naspi', 'IBAN per l''accredito', null, true, 40),

  ('assegno-unico', 'Documento d''identità del richiedente', null, true, 10),
  ('assegno-unico', 'Codici fiscali dei figli', null, true, 20),
  ('assegno-unico', 'Attestazione ISEE in corso di validità', null, false, 30),
  ('assegno-unico', 'IBAN per l''accredito', null, true, 40),

  ('contratti-lavoro-domestico', 'Documenti d''identità del datore e del lavoratore', null, true, 10),
  ('contratti-lavoro-domestico', 'Permesso di soggiorno del lavoratore', null, true, 20),
  ('contratti-lavoro-domestico', 'Codice fiscale di entrambe le parti', null, true, 30),

  ('casellario-giudiziale', 'Documento d''identità', null, true, 10),
  ('casellario-giudiziale', 'Codice fiscale', null, true, 20),
  ('casellario-giudiziale', 'Marca da bollo', null, true, 30),

  ('legalizzazioni-apostille-traduzioni', 'Documento originale da legalizzare', null, true, 10),
  ('legalizzazioni-apostille-traduzioni', 'Documento d''identità', null, true, 20),

  ('decreto-flussi-domanda', 'Passaporto del lavoratore', null, true, 10),
  ('decreto-flussi-domanda', 'Documenti del datore di lavoro', null, true, 20),
  ('decreto-flussi-domanda', 'Documentazione dell''alloggio', null, true, 30),

  ('residenza-online', 'Documento d''identità di tutti i componenti', null, true, 10),
  ('residenza-online', 'Contratto di affitto o titolo di occupazione', null, true, 20),

  ('apertura-chiusura-iva', 'Documento d''identità e codice fiscale', null, true, 10),
  ('apertura-chiusura-iva', 'Descrizione dell''attività da avviare', null, false, 20)
) as v(service_slug, label, hint, obligatoriu, ordine)
join public.ie_services s on s.slug = v.service_slug;

-- --- Pașii procedurii, pentru cele mai cerute servicii (§10) -----------------
delete from public.ie_service_steps;
insert into public.ie_service_steps (service_id, title, description, sort_order)
select s.id, v.title, v.descriere, v.ordine
from (values
  ('cittadinanza', 'Verifica dei requisiti', 'Controlliamo insieme anni di residenza, redditi e requisito linguistico.', 10),
  ('cittadinanza', 'Raccolta dei documenti', 'Ti diamo la lista completa e verifichiamo ogni documento prima dell''invio.', 20),
  ('cittadinanza', 'Compilazione e invio telematico', 'Presentiamo la domanda sul portale del Ministero dell''Interno.', 30),
  ('cittadinanza', 'Monitoraggio della pratica', 'Segui lo stato dalla tua area riservata e ti avvisiamo a ogni aggiornamento.', 40),

  ('spid', 'Prenotazione dell''appuntamento', 'Scegli data e ora dal calendario.', 10),
  ('spid', 'Riconoscimento in sede', 'Porta documento e tessera sanitaria: il riconoscimento richiede pochi minuti.', 20),
  ('spid', 'Attivazione dell''identità', 'Completi l''attivazione con il tuo cellulare e sei subito operativo.', 30),

  ('730-modello-unico', 'Raccolta della documentazione', 'CU, spese detraibili, visure e contratti.', 10),
  ('730-modello-unico', 'Elaborazione della dichiarazione', 'Calcoliamo detrazioni e conguaglio.', 20),
  ('730-modello-unico', 'Firma e invio all''Agenzia delle Entrate', 'Ricevi copia della dichiarazione e della ricevuta di invio.', 30),

  ('permessi-di-soggiorno-kit', 'Verifica dei documenti', 'Controlliamo che il fascicolo sia completo prima di aprire il kit.', 10),
  ('permessi-di-soggiorno-kit', 'Compilazione del kit postale', 'Compiliamo insieme i moduli, senza errori che allungano i tempi.', 20),
  ('permessi-di-soggiorno-kit', 'Invio in Posta e appuntamento in Questura', 'Ti accompagniamo fino alla ricevuta e alla convocazione.', 30)
) as v(service_slug, title, descriere, ordine)
join public.ie_services s on s.slug = v.service_slug;

-- --- Programul de lucru (§16) ------------------------------------------------
--
-- Luni–vineri 9:30–13:00 și 15:00–18:00, cu pauza de prânz modelată explicit ca
-- interval `break` — motorul de sloturi o scade, deci nu poate apărea o oră la 14:00.
delete from public.ie_availability;
insert into public.ie_availability (operator_id, weekday, starts_at, ends_at, kind)
select o.id, z.weekday, t.starts_at, t.ends_at, t.kind
from public.ie_operators o
cross join generate_series(1, 5) as z(weekday)
cross join (values
  ('09:30'::time, '13:00'::time, 'work'),
  ('15:00'::time, '18:00'::time, 'work')
) as t(starts_at, ends_at, kind);

-- --- FAQ (§38) ---------------------------------------------------------------
insert into public.ie_faq (question, answer, sort_order) values
  ('Devo prendere appuntamento o posso venire direttamente?',
   'Lavoriamo su appuntamento, così non aspetti in fila e l''operatore ha il tempo necessario per la tua pratica. Puoi prenotare online in pochi minuti scegliendo il servizio, il giorno e l''ora.', 10),
  ('Quanto costa un appuntamento?',
   'Il colloquio informativo è gratuito. Il costo delle pratiche dipende dal servizio: te lo comunichiamo con chiarezza prima di iniziare, senza sorprese.', 20),
  ('Quali documenti devo portare?',
   'Ogni servizio ha la sua lista, che trovi sulla pagina del servizio e nell''email di conferma. Se manca qualcosa te lo diciamo prima dell''appuntamento, così non perdi il viaggio.', 30),
  ('Posso disdire o spostare l''appuntamento?',
   'Sì. Dalla tua area riservata puoi annullare o chiedere lo spostamento. Ti chiediamo di farlo con almeno 12 ore di anticipo, così liberiamo il posto per un''altra persona.', 40),
  ('In che lingue parlate?',
   'Parliamo italiano, romeno e inglese. Se hai bisogno di un''altra lingua, scrivicelo nelle note della prenotazione e cerchiamo una soluzione.', 50),
  ('I miei documenti sono al sicuro?',
   'Sì. I documenti che carichi sono conservati in uno spazio protetto, visibile solo a te e all''operatore che segue la tua pratica. Non sono mai pubblici e non vengono condivisi con terzi.', 60),
  ('Posso seguire lo stato della mia pratica?',
   'Sì. Creando un account vedi in ogni momento lo stato della pratica, i documenti caricati e i messaggi dell''operatore, e ricevi una notifica a ogni aggiornamento.', 70),
  ('Dove vi trovate?',
   'Siamo in Via Monte Rosa 101/B, 10154 Torino. Trovi la mappa e le indicazioni stradali nella pagina Contatti.', 80)
on conflict do nothing;

-- --- Texte editabile din admin (§37) ----------------------------------------
insert into public.ie_site_content (key, locale, value) values
  ('hero.title', 'it', 'La tua pratica, senza pensieri.'),
  ('hero.subtitle', 'it', 'Assistenza fiscale, previdenziale e servizi per immigrati, con prenotazione online e assistenza diretta.'),
  ('hero.eyebrow', 'it', 'CAF · Pratiche per immigrati · Torino'),
  ('hero.cta_primary', 'it', 'Prenota ora'),
  ('hero.cta_secondary', 'it', 'Scopri i servizi'),
  ('search.placeholder', 'it', 'Di cosa hai bisogno? — es. SPID, cittadinanza, permesso di soggiorno…'),
  ('cta.title', 'it', 'Hai bisogno di assistenza?'),
  ('cta.body', 'it', 'Scegli il servizio che ti serve e prenota il tuo appuntamento in pochi click.'),
  ('footer.note', 'it', 'Pratiche per immigrati e CAF a Torino. Assistenza su appuntamento, dal lunedì al venerdì.')
on conflict (key, locale) do nothing;

-- --- Baza de cunoștințe a asistentului (§45) --------------------------------
insert into public.ie_knowledge_base (title, body, keywords, visibility) values
  ('Come prenotare un appuntamento',
   'Scegli il servizio dal catalogo, premi «Prenota», seleziona l''operatore, il giorno e l''ora liberi, inserisci i tuoi dati e conferma. Ricevi subito un codice di prenotazione nel formato IMMY-ANNO-NUMERO e un''email di conferma. Con quel codice puoi identificare la tua prenotazione in qualsiasi momento.',
   array['prenotare','appuntamento','prenotazione','codice','come'], 'public'),
  ('Orari e sede',
   'Siamo aperti dal lunedì al venerdì, dalle 9:30 alle 13:00 e dalle 15:00 alle 18:00. Sabato e domenica siamo chiusi. La sede è in Via Monte Rosa 101/B, 10154 Torino (TO).',
   array['orari','aperto','sede','indirizzo','quando','dove'], 'public'),
  ('Annullare o spostare un appuntamento',
   'Dalla tua area riservata, nella sezione «I miei appuntamenti», puoi annullare la prenotazione o chiedere lo spostamento. Ti chiediamo di farlo con almeno 12 ore di anticipo. Quando annulli, il posto torna subito disponibile per un''altra persona.',
   array['annullare','disdire','spostare','cambiare','cancellare','data'], 'public'),
  ('Documenti: come si caricano e chi li vede',
   'I documenti si caricano dall''area riservata, dentro la pratica a cui appartengono. Accettiamo PDF, JPG, PNG, DOC e DOCX fino a 10 MB. Se carichi di nuovo un documento già inviato, la versione precedente viene conservata nello storico. I documenti sono visibili solo a te e all''operatore che segue la tua pratica.',
   array['documenti','caricare','upload','pdf','file','sicurezza','versione'], 'public'),
  ('Stati di una pratica',
   'Una pratica passa per questi stati: Nuova, In lavorazione, In attesa di documenti, Documenti ricevuti, In verifica, Pronta, Completata, Chiusa. A ogni cambiamento ricevi una notifica e vedi lo stato aggiornato nella tua area riservata.',
   array['pratica','stato','avanzamento','dossier','fascicolo'], 'public')
on conflict do nothing;

-- ============================================================================
-- DATE DEMO (§74) — tot ce urmează are `is_demo = true`.
--
-- Se șterg complet cu:
--   delete from public.ie_appointments where is_demo;
--   delete from public.ie_cases where is_demo;
--   delete from public.ie_profiles where is_demo;
--   delete from public.ie_operators where is_demo;
--
-- Conturile demo NU se creează aici: `ie_profiles.id` referă `auth.users`, iar
-- utilizatorii se creează prin Auth, nu prin SQL. Scriptul
-- `scripts/seed-demo.mjs` îi creează cu cheia de service și apoi umple
-- programările și dosarele de exemplu.
-- ============================================================================
