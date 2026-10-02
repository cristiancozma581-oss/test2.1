# IMMY & EMY — raport de livrare

Inventarul complet a ceea ce s-a construit, cu ce a fost verificat și ce a
rămas nefăcut. Cifrele din acest document sunt măsurate din depozit, nu
estimate.

| | |
|---|---|
| **Depozit** | `86iyfg797/nextjs-boilerplate` |
| **Ramură** | `claude/immy-emy-digital-platform-oegxd9` |
| **Pull request** | [#2](https://github.com/86iyfg797/nextjs-boilerplate/pull/2) |
| **Amploare** | 151 de fișiere, +19 976 / −93 linii, 5 commit-uri |
| **Stare** | typecheck, lint și build curate; 168 de teste trecute; deploy Vercel verde |

---

## 1. Punctul de plecare și ce s-a cerut

Punctul de plecare au fost două mockup-uri HTML statice: un catalog de servicii
cu butoane „Prenota" care afișau un mesaj de tip *„link în arrivo"*, și o pagină
de contact cu numere de telefon. Zero logică, zero date.

Cerința a fost un ecosistem digital complet — sit public, motor de rezervări,
CRM, portal client, portal operator, management de dosare și documente,
notificări, panou de administrare, statistici, asistent, securitate și GDPR —
cu regula explicită de la §78: *„fiecare buton important trebuie să aibă logică
reală"*.

O cerință ulterioară a fost ca **totul să fie separat de situl ELSA**.

---

## 2. Ce funcționează cu date reale

Fluxul care definește „gata" în specificație merge de la un cap la altul, iar
fiecare pas scrie în baza de date:

```
client → serviciu → programare → confirmare → operator → dosar → document
       → notificare → finalizare
```

Concret:

- **„Prenota"** deschide fluxul real de rezervare, nu un mesaj.
- **„Conferma"** creează programarea în `ie_appointments` și întoarce codul
  `IMMY-2026-000124`.
- **Documentul încărcat** ajunge într-un bucket privat, cu versionare.
- **Schimbarea de status** trimite notificarea clientului.
- **Anularea** eliberează slotul pe loc, iar ora redevine rezervabilă.
- **Operatorul ocupat** nu apare cu ore libere la acea oră.

---

## 3. Harta aplicației

### Sit public (`app/(sito)/`)

| Rută | Conținut |
|---|---|
| `/` | Hero, căutare în catalog, categorii, „cum funcționează", orar, sediu, CTA |
| `/servizi` | Catalogul complet, cu filtrare pe categorii |
| `/servizi/[slug]` | Durată, preț, documente necesare, pașii procedurii, operatori, FAQ, date structurate `Service` |
| `/prenota` | Fluxul în patru pași |
| `/prenota/conferma` | Codul rezervării și ce urmează |
| `/come-funziona` | Cei șase pași, de la căutare la pratica încheiată |
| `/faq` | Întrebări frecvente, cu date structurate `FAQPage` |
| `/contatti` | Telefoane, e-mail, hartă, indicații, orar, `LocalBusiness` |
| `/privacy` | Informare scrisă pe ce face chiar sistemul acesta |
| `/termini` | Condițiile serviciului |
| `/sitemap.xml`, `/robots.txt` | Generate din bază |

### Autentificare (`app/(auth)/`)

`/accedi`, `/registrati`, `/recupera`, `/reimposta`, plus `/auth/callback`
(confirmarea adresei) și `/auth/esci` (deconectare, doar prin POST).

### Area riservata — clientul (`app/(portale)/area-cliente/`)

| Rută | Ce poate face clientul |
|---|---|
| `/area-cliente` | Ce i se cere acum, următoarea programare, dosare active, ultimele noutăți |
| `/appuntamenti` | Programări viitoare și istoric, cu anulare |
| `/pratiche`, `/pratiche/[id]` | Starea dosarului, documentele, istoricul, programările legate |
| `/documenti` | Ce i se cere, ce a încărcat, toate versiunile |
| `/messaggi`, `/messaggi/[id]` | Conversații cu operatorul |
| `/notifiche` | Centrul de notificări |
| `/profilo` | Date personale și **export GDPR** în JSON |

### Workspace operatore (`app/(portale)/operatore/`)

`/operatore` (ziua curentă cu acțiuni), `/calendario` (săptămânal),
`/appuntamenti` (30 de zile), `/pratiche` și `/pratiche/[id]` (cu cerere de
documente și schimbare de status), `/documenti` (verificare), `/messaggi`,
`/notifiche`.

### Control center — administratorul (`app/(portale)/admin/`)

`/admin` (indicatori), `/calendario` (cu filtru pe operator), `/appuntamenti`
(cu **căutare globală** după cod, nume, e-mail sau telefon), `/clienti`,
`/pratiche`, `/servizi`, `/operatori`, `/disponibilita`, `/faq`,
`/statistiche`, `/utenti`, `/audit`, `/impostazioni`, `/messaggi`,
`/notifiche`.

### API (`app/api/`)

| Rută | Rol |
|---|---|
| `/api/slot` | Operatori, zile și ore libere — publică, dar nu divulgă nimic personal |
| `/api/assistente` | Asistentul, cu limită de debit proprie |
| `/api/documenti/[id]` | Emite linkul semnat, după verificarea accesului |
| `/api/dati-personali` | Exportul GDPR |
| `/api/rapporto` | Export CSV al programărilor |
| `/api/cron/promemoria` | Remindere automate, idempotente |

---

## 4. Baza de date

**9 migrații**, 1 709 linii de SQL, **28 de tabele**.

| Fișier | Linii | Conținut |
|---|---:|---|
| `0010_ie_fundatie.sql` | 144 | extensii, căutare italiană cu `unaccent`, setări, jurnal de audit, generatorul de coduri |
| `0011_ie_identitate.sql` | 118 | profiluri, roluri, operatori, predicatele RLS |
| `0012_ie_catalog.sql` | 125 | categorii, servicii, documente necesare, pași, FAQ |
| `0013_ie_programari.sql` | 192 | program, excepții, programări, **constrângerea anti-suprapunere** |
| `0014_ie_dosare_documente.sql` | 163 | dosare, istoric, documente, versiuni |
| `0015_ie_comunicare.sql` | 215 | conversații, mesaje, notificări, plăți, CMS, bază de cunoștințe |
| `0016_ie_rls.sql` | 354 | politicile RLS pe toate tabelele + bucketul privat |
| `0017_ie_seed.sql` | 345 | **catalogul real**: 6 categorii, 20 de servicii, 2 operatori, program, FAQ |
| `0018_ie_consimtamant.sql` | 53 | consimțământul GDPR scris odată cu profilul |

Tabelele: `ie_profiles`, `ie_operators`, `ie_categories`, `ie_services`,
`ie_operator_services`, `ie_service_documents`, `ie_service_steps`,
`ie_availability`, `ie_availability_exceptions`, `ie_appointments`,
`ie_appointment_status_history`, `ie_appointment_counters`, `ie_cases`,
`ie_case_status_history`, `ie_documents`, `ie_document_versions`, `ie_threads`,
`ie_messages`, `ie_message_attachments`, `ie_notifications`,
`ie_notification_templates`, `ie_payments`, `ie_faq`, `ie_knowledge_base`,
`ie_assistant_messages`, `ie_site_content`, `ie_settings`, `ie_audit_logs`.

### Catalogul din seed

Cele 20 de servicii reale ale biroului, preluate din mockup, cu duratele și
repartiția pe operatori de acolo („L" = Immy, „S" = Emy), grupate în șase
categorii: *Cittadinanza e Soggiorno*, *Decreto Flussi e Sanatoria*, *Servizi
Digitali e Anagrafici*, *Fiscale e CAF*, *Lavoro*, *Legali e Internazionali*.

Fiecare are lista completă de documente necesare — de la pașaport și permis de
ședere până la marca da bollo — iar cele mai cerute au și pașii procedurii.

---

## 5. Trei decizii care explică restul codului

### Suprapunerea programărilor este imposibilă la nivel de bază

```sql
exclude using gist (operator_id with =, perioada with &&)
  where (status in ('PENDING', 'CONFIRMED', 'RESCHEDULED'))
```

Motorul de sloturi nu propune ora ocupată, stratul de acces la date o
reverifică înainte de scriere — dar **garanția** este constrângerea de mai sus.
Primele două straturi sunt confort; al treilea este cel care ține când doi
clienți apasă „Conferma" în aceeași milisecundă: exact unul reușește, celălalt
primește un mesaj omenesc, nu un cod de eroare Postgres.

### Autorizarea stă în stratul de acces la date, nu în proxy

Documentația Next avertizează că Server Functions sunt POST-uri către ruta în
care trăiesc: sunt apelabile direct, fără interfață. Un `matcher` care exclude o
cale sare și peste ele.

De aceea fiecare funcție din `lib/immy/dal/*` își cere singură verdictul, iar
RLS-ul — **activ ȘI forțat** pe toate tabelele, deci lipsa unei politici
înseamnă acces zero — este a doua plasă, sub el.

### Documentele nu au adresă publică

Bucket privat, fără politici de storage pentru `anon` sau `authenticated`.
Singura cale este un link semnat de două minute, emis după verificarea
accesului și înregistrat în audit. Nu există URL de ghicit, deci nu există IDOR
pe cale de storage.

---

## 6. Biblioteca de domeniu (`lib/immy/`)

| Fișier | Linii | Ce face |
|---|---:|---|
| `disponibilitate.ts` | 287 | **Motorul de sloturi**: program − pauze − zile libere − programări existente. Pur, fără efecte |
| `fus-orar.ts` | 172 | Conversia oră de perete ↔ moment absolut, cu ora de vară rezolvată explicit |
| `flux.ts` | 155 | Mașinile de stare: programare, dosar, document — fiecare tranziție cu rolurile care o pot cere |
| `rbac.ts` | 148 | Matricea de permisiuni + regula de acces la dosar |
| `validare.ts` | 448 | Schemele Zod, folosite identic în browser și pe server |
| `tipuri.ts` | 211 | Vocabularele: statusuri, roluri, evenimente, tipuri de fișier |
| `notificari.ts` | 350 | Motorul de notificări + adaptoarele e-mail și Telegram |
| `asistent.ts` | 255 | Regăsire în baza de cunoștințe, cu formulare opțională |
| `audit.ts` | 63 | Jurnalul, scris exclusiv cu cheia de service |
| `env.ts` | 111 | Contractul de mediu — niciun secret în cod |
| `supabase.ts` | 78 | Cei trei clienți: sesiune, serviciu, public |
| `acum.ts` | 17 | Citirea explicită a ceasului pe server |

### Stratul de acces la date (`lib/immy/dal/`)

`programari.ts` (638), `documente.ts` (446), `dosare.ts` (378), `catalog.ts`
(327), `mesaje.ts` (323), `statistici.ts` (258), `disponibilitate.ts` (225),
`sesiune.ts` (128), `setari.ts` (128), `notificari.ts` (104).

**2 955 de linii** în care fiecare funcție publică verifică autorizarea înainte
de a atinge date.

---

## 7. Interfața

**26 de componente proprii** (`components/immy/`) plus 4 primitive de formular.

Cele mai substanțiale: `flux-rezervare.tsx` (498 linii — fluxul în patru pași),
`editor-servicii.tsx` (290), `editor-disponibilitate.tsx` (288),
`editor-operatori.tsx` (209), `formular-setari.tsx` (207), `stari.tsx` (205 —
stările din §55 și insignele de status), `cautare-servicii.tsx` (192),
`asistent.tsx` (188), `formular-auth.tsx` (174).

Designul păstrează identitatea vizuală din mockup — verdele IMMY & EMY, globul
cu meridiane, tipografia — dusă într-un sistem complet, cu paletă pentru mod
clar și întunecat, definită o singură dată pe `:root`.

---

## 8. Ce s-a testat

**168 de teste**, dintre care 130 pentru această platformă:

| Fișier | Teste | Ce apără |
|---|---:|---|
| `disponibilitate.test.ts` | 33 | Pauze, concedii, sărbători, deschideri extraordinare, adiacență, preaviz, orizont, eliberarea slotului la anulare, refuzul unui slot ocupat între timp |
| `validare.test.ts` | 27 | GDPR obligatoriu, prețuri fără virgulă mobilă, `../` blocat în numele fișierelor, extensie ↔ MIME |
| `flux.test.ts` | 20 | Clientul nu-și confirmă singur programarea, nu marchează `COMPLETED`, nu schimbă statusul unui dosar; din statusurile terminale nu se mai iese |
| `rbac.test.ts` | 20 | Clientul n-are nicio permisiune; operatorul n-are funcțiile globale și nu intră în dosarul colegului; accoglienza rămâne afară din dosare |
| `fus-orar.test.ts` | 17 | Cele două nopți pe an în care ceasul sare |
| `tipuri.test.ts` | 13 | **Deriva vocabularelor** |

Două merită explicate:

**Fusul orar.** Fără testele acelea, programul de dimineață s-ar deplasa cu o
oră în ultima duminică din martie, iar nimeni n-ar observa până luni dimineața,
când primul client sună că a venit degeaba.

**Deriva vocabularelor.** Un test citește chiar fișierele SQL și compară
constrângerile `check` cu listele din TypeScript. Dacă cineva adaugă un status
doar într-un loc, testul cade — altfel aplicația fie ar oferi o opțiune pe care
baza o respinge, fie ar ascunde una validă.

---

## 9. Integrări

| Integrare | Stare | Fără ea |
|---|---|---|
| **E-mail** (Resend) | funcțional | Notificările rămân în aplicație, marcate `queued` — vizibile, nu pierdute |
| **Telegram** | funcțional | Biroul nu primește avertizările instantanee |
| **Asistent** | **funcțional fără cheie** | Cu `ANTHROPIC_API_KEY` formulează mai natural, tot numai din ce găsește |
| **Remindere** | funcțional | Fără `IMMY_CRON_SECRET` ruta răspunde 404 |
| **WhatsApp** | adaptor pregătit | Canalul se activează când există cheile |
| **Plăți** | schema pregătită | Rămân închise până la configurare |

Asistentul merită o notă: **funcționează fără nicio cheie de API.** Caută în
baza de cunoștințe, în FAQ și în catalog, apoi răspunde cu ce a găsit — text
scris de birou, deci imposibil de inventat. Nu dă consultanță juridică
definitivă și, când întrebarea îl depășește, oferă butoanele „Prenota" și
„Scrivici". Întrebările la care n-a știut să răspundă se adună în
`ie_assistant_messages`, ca baza de cunoștințe să crească din întrebări reale.

---

## 10. Securitate și GDPR

- RLS activ și forțat pe toate cele 28 de tabele.
- Autorizare în stratul de acces la date, pe fiecare cerere.
- Documente private, cu linkuri semnate de scurtă durată și fiecare deschidere
  auditată.
- **Jurnal de audit needitabil**: nu există politică de insert, update sau
  delete pe `ie_audit_logs` pentru nimeni, nici pentru administratori.
- Validare pe server cu aceleași scheme ca în browser; fișierele se verifică
  după extensie ȘI după tip MIME, iar cele două trebuie să coincidă.
- Antete de securitate (CSP, X-Frame-Options, HSTS, Referrer-Policy,
  Permissions-Policy) pe fiecare răspuns.
- Mesaje de eroare care nu divulgă: la login și la recuperarea parolei
  răspunsul este același fie că adresa există, fie că nu.
- Consimțământul stocat ca moment, nu ca bifă. Export propriu al datelor din
  interfață. Retenție configurabilă, care este chiar cifra afișată în informarea
  de pe `/privacy` — un singur loc, deci nu se pot contrazice.

### Trei probleme găsite la review, reparate

Un bot de review a semnalat trei probleme reale pe prima versiune. Toate erau
ale mele:

1. **Accoglienza putea deschide orice dosar prin adresă directă.** Garda
   verifica *numele* rolului — „dacă e OPERATOR…" — nu permisiunea, deci orice
   alt rol de personal trecea neatins, iar RLS îl lăsa să citească rândul.
   Legătura lipsea din meniu, ceea ce este curtoazie, nu securitate. Regula a
   devenit funcția pură `poateVedeaDosarul`, cu 7 teste de regresie — garda
   scrisă inline în interogare nu putea fi verificată decât cu o bază de date,
   și exact acolo a scăpat.

2. **Programările unui oaspete se legau de cont înainte de verificarea
   adresei.** `signUp` întoarce `data.user` și cu confirmarea activă. Cine se
   înregistra cu e-mailul unui client care rezervase fără cont îi muta
   programările la el. Legarea s-a mutat în `/auth/callback`, după schimbarea
   codului pe sesiune și numai cu `email_confirmed_at` completat.

3. **Consimțământul GDPR nu se păstra.** Coloana exista, formularul cerea bifa,
   schema o valida — și nimic nu o scria. Migrația `0018` îl scrie odată cu
   profilul, în aceeași tranzacție.

---

## 11. Ce NU s-a făcut

Spus explicit, ca să nu fie surprize:

| Element | Stare reală |
|---|---|
| **Plăți online** | Schema, statusurile și comutatorul există. Integrarea Stripe/PayPal propriu-zisă nu este scrisă |
| **WhatsApp Business** | Adaptorul așteaptă cheile; nu a fost testat cu un cont real |
| **PWA** | Arhitectura permite; manifestul și service worker-ul nu sunt scrise |
| **Traduceri `ro`/`en`** | Schema le acceptă peste tot; textele interfeței sunt deocamdată doar în italiană |
| **Aplicație nativă** | API-ul o permite, cum cerea §67, dar nu s-a construit |
| **Testare end-to-end** | Testele sunt unitare, pe logica pură. Nu există teste care pornesc aplicația și fac clic |
| **Rapoarte PDF/Excel** | Exportul este CSV; PDF și Excel nu |
| **Editor CMS complet** | Tabela `ie_site_content` și citirea există; editorul din admin acoperă FAQ și setări, nu toate textele |

Și o limitare de mediu, nu de cod: **n-am putut deschide aplicația într-un
browser** ca să verific vizual. Accesul spre exterior este blocat în mediul în
care am lucrat. Ce am verificat sunt typecheck, lint, build și teste — care
prind logica, nu felul în care arată pagina pe un telefon real.

---

## 12. Cum se pornește

```bash
npm install
cp .env.example .env.local     # completează valorile

npm install --no-save pg
node scripts/migreaza.mjs      # aplică migrațiile 0010–0018

node scripts/seed-demo.mjs     # opțional: conturi și date de exemplu
npm run dev
```

Variabilele minime: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.

**Primul administrator:** înregistrează-te normal de pe sit, apoi ridică rolul o
singură dată din SQL Editor —

```sql
update public.ie_profiles set role = 'SUPER_ADMIN' where email = 'adresa@ta';
```

Rolurile nu se pot atribui prin formularul de înregistrare: triggerul forțează
`CLIENT` la orice cont nou, ca nimeni să nu se poată promova trimițând metadate.

**O cerință de configurare:** în Supabase, „Confirm email" trebuie să rămână
pornit. Legarea programărilor făcute înainte de înregistrare se sprijină pe
faptul că linkul a fost deschis în acea cutie poștală.

Restul — servicii, operatori, orar, FAQ, texte, setări — se administrează din
`/admin`, fără cod.

---

## 13. Despre separare

Cerința a fost ca totul să fie aparte de situl ELSA. **Repo-ul
`v0-elsa-usm-design-system` nu a fost atins deloc.**

---

## 14. Convenții

- Comentariile și denumirile interne sunt în **română**, ca în restul
  depozitului; textele către utilizator sunt în **italiană**.
- Sumele de bani sunt `bigint` în cenți — niciun preț nu trece prin virgulă
  mobilă.
- Vocabularele sunt `text` + `check`, nu enum-uri Postgres.
- Migrațiile sunt idempotente.
- Ce se calculează pur trăiește în module fără efecte, ca să poată fi testat
  direct.
