# IMMY & EMY — piattaforma digitale

Ecosistemul digital al centrului **IMMY & EMY** din Torino: pratiche per
immigrati, CAF, servizi fiscali, previdențiali și administrativi.

Nu este un sit de prezentare. Este o aplicație în care fluxul

> client → serviciu → programare → confirmare → operator → dosar → document →
> notificare → finalizare

funcționează de la un cap la altul, cu date reale în bază.

---

## 1. Ce conține

| Zonă | Adresă | Ce face |
|---|---|---|
| Sit public | `/` | Catalog cu căutare, pagini de serviciu cu documentele necesare, contacte, FAQ, informare privind confidențialitatea |
| Rezervare | `/prenota` | Serviciu → operator → zi → oră → date → confirmare, cu cod `IMMY-2026-000124` |
| Area riservata | `/area-cliente` | Programări, dosare, documente, mesaje, notificări, profil, export GDPR |
| Workspace operatore | `/operatore` | Ziua curentă, calendar, dosare, verificarea documentelor, mesaje |
| Control center | `/admin` | Indicatori, calendar, catalog, operatori, disponibilitate, FAQ, statistici, utilizatori, audit, setări |

### Ce este complet și ce este pregătit

Onest, ca să nu fie surprize la instalare:

**Funcționează cu date reale:** catalogul, motorul de disponibilitate,
rezervarea (inclusiv pentru clienți fără cont), anularea și reprogramarea,
dosarele, documentele cu versionare și linkuri semnate, mesageria, notificările
în aplicație, e-mailul, Telegram, reminderele, asistentul, statisticile,
exportul CSV, exportul GDPR, jurnalul de audit, RBAC-ul, administrarea
catalogului și a programului.

**Pregătit, dar neactivat:** plățile online (Stripe/PayPal — schema, statusurile
și comutatorul există; integrarea propriu-zisă se adaugă când administratorul
configurează furnizorul), WhatsApp Business (adaptorul așteaptă cheile), PWA
(arhitectura permite, manifestul nu este încă scris), traducerile `ro`/`en`
(schema le acceptă peste tot; textele interfeței sunt deocamdată în italiană).

---

## 2. Arhitectura

```
app/
  (sito)/          sit public — home, servizi, prenota, contatti, faq, legale
  (auth)/          accedi, registrati, recupera, reimposta
  (portale)/       area-cliente, operatore, admin
  api/             slot, assistente, documenti, rapporto, dati-personali, cron

lib/immy/
  tipuri.ts            vocabularele (statusuri, roluri, evenimente)
  fus-orar.ts          conversia oră de perete ↔ moment absolut (Europe/Rome)
  disponibilitate.ts   MOTORUL DE SLOTURI — pur, fără efecte, testat
  flux.ts              mașinile de stare: programare, dosar, document
  rbac.ts              matricea de permisiuni
  validare.ts          schemele Zod, folosite și în browser, și pe server
  notificari.ts        motorul de notificări + adaptoarele e-mail/Telegram
  asistent.ts          regăsire în baza de cunoștințe, cu formulare opțională
  audit.ts             jurnalul, scris exclusiv cu cheia de service
  dal/                 stratul de acces la date — autorizează la fiecare apel

supabase/migrations/   0010–0018 = IMMY & EMY (`ie_*`)
scripts/               migreaza.mjs, seed-demo.mjs
```

### Trei decizii care explică restul codului

**1. Suprapunerea programărilor este imposibilă la nivel de bază.**

```sql
exclude using gist (operator_id with =, perioada with &&)
  where (status in ('PENDING', 'CONFIRMED', 'RESCHEDULED'))
```

Motorul de sloturi nu propune ora ocupată, stratul de acces la date o
reverifică înainte de insert — dar garanția este constrângerea de mai sus.
Doi clienți care apasă „Conferma" în aceeași milisecundă: exact unul reușește,
celălalt primește un mesaj omenesc, nu un cod de eroare Postgres.

**2. Autorizarea se face în stratul de acces la date, nu în proxy.**

Server Functions sunt POST-uri către ruta în care trăiesc, deci apelabile
direct, fără interfață. Un `matcher` care exclude o cale sare și peste ele.
De aceea fiecare funcție din `lib/immy/dal/*` își cere singură verdictul, iar
RLS-ul din migrația 0016 este a doua plasă, sub ea.

**3. Documentele nu au adresă publică.**

Bucket privat, fără politici de storage pentru `anon` sau `authenticated`.
Singura cale este un link semnat de două minute, emis după verificarea
accesului și înregistrat în audit. Nu există URL de ghicit, deci nu există
IDOR pe cale de storage.

---

## 3. Instalare

### Cerințe

- Node.js 20.9 sau mai nou
- un proiect [Supabase](https://supabase.com) (PostgreSQL 15+)

### Pași

```bash
npm install
cp .env.example .env.local     # completează valorile
```

Minimul ca să pornească totul:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres:PAROLA@db.xxxx.supabase.co:5432/postgres
```

Le găsești în Supabase → **Project Settings → API** (primele trei) și
→ **Database → Connection string → URI** (a patra).

### Migrațiile

```bash
npm install --no-save pg          # necesar doar pentru migrare
node scripts/migreaza.mjs
```

Scriptul aplică `supabase/migrations/00*_ie_*.sql` în ordine, fiecare fișier
într-o tranzacție. Sunt idempotente: rulate de două ori, actualizează, nu
dublează.

Ce creează:

| Fișier | Conținut |
|---|---|
| `0010_ie_fundatie` | extensii, căutare italiană, setări, jurnal de audit, generatorul de coduri |
| `0011_ie_identitate` | profiluri, roluri, operatori, predicatele RLS |
| `0012_ie_catalog` | categorii, servicii, documente necesare, pași, FAQ |
| `0013_ie_programari` | program, excepții, programări, **constrângerea anti-suprapunere** |
| `0014_ie_dosare_documente` | dosare, istoric, documente, versiuni |
| `0015_ie_comunicare` | conversații, mesaje, notificări, plăți, CMS, bază de cunoștințe |
| `0016_ie_rls` | politicile RLS pe toate tabelele + bucket-ul privat |
| `0017_ie_seed` | **catalogul real** al biroului: 20 de servicii, 6 categorii, program, FAQ |
| `0018_ie_consimtamant` | consimțământul GDPR se scrie odată cu profilul, nu printr-un al doilea apel care poate eșua |

### Date demo (opțional)

```bash
node scripts/seed-demo.mjs
```

Creează conturi (`admin.demo@immyemy.local` și celelalte, parola
`DemoImmyEmy2026` sau `IMMY_DEMO_PASSWORD`), programări și un dosar cu
documente cerute. **Totul are `is_demo = true`.** Înainte de producție:

```bash
node scripts/seed-demo.mjs --sterge
```

Catalogul real din `0017` nu este atins de ștergere.

### Rulare

```bash
npm run dev        # http://localhost:3000
npm run build      # verificarea de producție
npm run typecheck
npm run lint
npm test           # 130 de teste
```

---

## 3.1. Confirmarea adresei de e-mail — obligatorie

În Supabase → **Authentication → Providers → Email**, lasă **Confirm email**
pornit. Nu este o preferință: platforma leagă de cont programările făcute
înainte de înregistrare, iar singura dovadă că adresa îi aparține omului este
că a deschis linkul primit în acea cutie poștală.

Legarea se face de aceea în `/auth/callback`, după confirmare, și numai dacă
`email_confirmed_at` este completat. Cu confirmarea dezactivată, `signUp`
întoarce imediat o sesiune pentru orice adresă, deci nimic nu mai este dovedit:
în acel caz programările nu se leagă automat, iar operatorul le atașează manual
din admin.

## 4. Primul administrator

Rolurile nu se atribuie prin SQL scris de mână și nici din formularul de
înregistrare — triggerul din `0011` forțează `CLIENT` la orice cont nou, ca
nimeni să nu se poată promova trimițând metadate.

1. Înregistrează-te normal, de pe sit: `/registrati`.
2. Ridică rolul o singură dată, din SQL Editor:

```sql
update public.ie_profiles
   set role = 'SUPER_ADMIN'
 where email = 'adresa.ta@example.com';
```

3. De acum, restul echipei se administrează din `/admin/utenti`: colegul se
   înregistrează, tu îi dai rolul. Schimbarea rolurilor este rezervată lui
   `SUPER_ADMIN`; un `ADMIN` face tot restul.

### Legarea operatorilor de conturi

În `/admin/operatori` operatorii `Immy` și `Emy` există din seed, dar nu au
încă un cont. Ca să-și vadă calendarul, fiecare se înregistrează, primește
rolul `OPERATOR`, apoi se leagă de fișa lui:

```sql
update public.ie_operators
   set profile_id = (select id from public.ie_profiles where email = 'immy@…')
 where slug = 'immy';
```

(`scripts/seed-demo.mjs` face legătura automat pentru conturile demo.)

---

## 5. Configurarea din interfață

Tot ce urmează se schimbă **fără cod**, din `/admin`:

| Unde | Ce |
|---|---|
| `/admin/servizi` | servicii, durate, prețuri, cuvinte-cheie, operatori atribuiți, status |
| `/admin/operatori` | persoane, culori de calendar, servicii prestate, activare |
| `/admin/disponibilita` | orar săptămânal, pauze, concedii, sărbători, deschideri extraordinare |
| `/admin/faq` | întrebările de pe `/faq`, care alimentează și asistentul |
| `/admin/impostazioni` | date de contact, fus orar, preaviz, orizont, pas, prag de anulare, limite de fișier, retenție |

Motorul de sloturi citește chiar aceste rânduri: o schimbare de orar se vede
imediat în calendarul public.

---

## 6. Integrări

Fiecare este opțională. Ce lipsește se vede în `/admin/impostazioni` ca „Non
configurata" — funcția e închisă, nu ruptă.

### E-mail (Resend)

```
EMAIL_API_KEY=re_...
EMAIL_FROM="IMMY & EMY <noreply@domeniul-tau.it>"
```

Fără cheie, notificările rămân în aplicație marcate `queued` — vizibile, nu
pierdute. Adaptorul este o singură cerere HTTP în `lib/immy/notificari.ts`:
alt furnizor se schimbă acolo.

### Telegram (§31)

```
TELEGRAM_BOT_TOKEN=...      # de la @BotFather
TELEGRAM_CHAT_ID=...        # grupul biroului
```

Biroul primește pe loc: programare nouă, anulare, document nou, mesaj nou.
`TELEGRAM_CHAT_ID` se află scriind botului și deschizând
`https://api.telegram.org/bot<TOKEN>/getUpdates`.

### Asistent (§44)

```
ANTHROPIC_API_KEY=sk-ant-...
IMMY_AI_MODEL=claude-sonnet-5
```

**Fără cheie asistentul funcționează.** Caută în baza de cunoștințe, în FAQ și
în catalog, apoi răspunde cu ce a găsit — text scris de birou, deci imposibil
de inventat. Cu cheie, un model leagă aceleași fragmente într-un răspuns mai
natural, cu instrucțiunea explicită de a nu adăuga nimic peste ele.

În ambele cazuri asistentul nu dă consultanță juridică definitivă și, când
întrebarea îl depășește, oferă butoanele „Prenota" și „Scrivici".

Conținutul lui se administrează în tabelele `ie_knowledge_base` și `ie_faq`;
întrebările la care n-a știut să răspundă se adună în `ie_assistant_messages`,
ca baza de cunoștințe să crească din întrebări reale.

### Remindere (§28)

```
IMMY_CRON_SECRET=$(openssl rand -hex 32)
```

Cheamă ruta periodic:

```
GET /api/cron/promemoria
Authorization: Bearer $IMMY_CRON_SECRET
```

Ruta este idempotentă: rulată de zece ori, tot un singur reminder pleacă.
Fără secret configurat răspunde 404 — un endpoint care trimite mesaje către
clienți nu are voie să fie deschis pentru că nimeni n-a apucat să-l configureze.

**Fereastra trebuie să fie cât intervalul dintre rulări.** Endpointul caută
programările dintr-un interval care începe la decalajul cerut și ține
`IMMY_CRON_WINDOW_MINUTES` minute. La un cron orar, fereastra de 60 de minute
vede fiecare programare exact o dată; la un cron zilnic, o fereastră de 60 de
minute ar vedea doar o felie de o oră din zi și ar rata restul, tăcut.

| Cadență | `schedule` | `IMMY_CRON_WINDOW_MINUTES` | `reminder_offsets_minutes` |
|---|---|---|---|
| Orară (recomandat) | `0 * * * *` | `60` | `{1440, 120}` — merge și cel de 2 h |
| Zilnică | `0 7 * * *` | `1440` | `{1440}` — doar cel din ajun |

Cu o rulare pe zi, reminderul de 2 ore nu are cum să funcționeze: lasă un
singur decalaj în setări, altfel mesajul „mancano 2 ore" pleacă cu o zi înainte.

### Pe Vercel

`vercel.json` este deja în depozit, cu **schedule zilnic**: planul Hobby nu
permite cron-uri mai dese de o dată pe zi, iar un `0 * * * *` face deploy-ul să
eșueze cu `Hobby accounts are limited to daily cron jobs`. Pe Pro, treci la
`0 * * * *` și pune `IMMY_CRON_WINDOW_MINUTES=60`.

Cron-ul Vercel nu poate trimite antete proprii, așa că acolo secretul merge în
parametru — același secret, verificat la fel:

```
/api/cron/promemoria?token=$IMMY_CRON_SECRET
```

Actualizează calea din `vercel.json` cu tokenul tău, sau apelează ruta dintr-un
planificator care poate trimite antetul `Authorization`.

### WhatsApp și plăți

`WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `STRIPE_SECRET_KEY`,
`PAYPAL_SECRET`. Schema, statusurile și comutatoarele există; integrarea
propriu-zisă se completează când biroul alege furnizorul. Plata online rămâne
închisă până când `payments_online_enabled` este pornit ȘI cheile există.

---

## 7. Securitate

- **RLS activ și forțat** pe toate tabelele `ie_*`. Lipsa unei politici
  înseamnă acces zero, nu acces liber.
- **Autorizare în stratul de acces la date**, pe fiecare cerere, pentru că
  Server Functions sunt apelabile direct.
- **Documente private**, servite doar prin linkuri semnate de scurtă durată,
  cu fiecare deschidere auditată.
- **Jurnal de audit needitabil**: nu există politică de insert, update sau
  delete pe `ie_audit_logs` pentru nimeni, nici pentru administratori. Singura
  cale de scriere este cheia de service.
- **Validare pe server** cu aceleași scheme ca în browser; fișierele se
  verifică după extensie ȘI după tip MIME, iar cele două trebuie să coincidă.
- **Antete de securitate** (CSP, X-Frame-Options, HSTS, Referrer-Policy,
  Permissions-Policy) puse în `proxy.ts`, pe fiecare răspuns.
- **Limită de debit** pe ruta publică a asistentului.
- **Mesaje de eroare care nu divulgă**: la login și la recuperarea parolei
  răspunsul este același fie că adresa există, fie că nu.

### GDPR

- Consimțământul se stochează ca moment (`gdpr_consent_at`), nu ca bifă.
- Clientul își descarcă datele din `/area-cliente/profilo` (JSON complet).
- Retenția este configurabilă și este chiar cifra afișată în informarea de pe
  `/privacy` — un singur loc, deci nu pot ajunge să se contrazică.
- Documentele sunt vizibile doar clientului și operatorului dosarului.

---

## 8. Teste

```bash
npm test
```

168 de teste, dintre care 130 pentru IMMY & EMY. Acoperă ce chiar poate
strica ziua cuiva:

- **Fus orar** — inclusiv cele două nopți pe an în care ceasul sare. Fără
  testele astea, programul de dimineață s-ar deplasa cu o oră în ultima
  duminică din martie, iar nimeni n-ar observa până luni.
- **Motorul de sloturi** — pauze, concedii, sărbători, deschideri
  extraordinare, adiacență (`10:00–10:30` lasă liber `10:30`), preaviz,
  orizont, eliberarea slotului la anulare, refuzul unui slot ocupat între timp.
- **Mașinile de stare** — clientul nu-și poate confirma singur programarea,
  nu poate marca `COMPLETED`, nu poate schimba statusul unui dosar; din
  statusurile terminale nu se mai iese.
- **RBAC și accesul la dosare** — clientul nu are nicio permisiune; operatorul
  nu are funcțiile globale și nu intră în dosarul colegului; accoglienza ține
  calendarul, dar nu intră în dosare și documente, nici prin adresă directă.
- **Validare** — GDPR obligatoriu, prețuri fără virgulă mobilă, `../` blocat
  în numele fișierelor, extensie ↔ MIME.
- **Deriva vocabularelor** — un test citește fișierele SQL și compară
  constrângerile `check` cu listele din TypeScript. Dacă cineva adaugă un
  status doar într-un loc, testul cade.

---

## 9. Punere în producție

1. Rulează migrațiile pe baza de producție.
2. Setează variabilele de mediu (fără `DATABASE_URL` — e nevoie de el doar
   la migrare).
3. Setează `IMMY_SITE_URL` pe domeniul real: intră în linkurile din e-mailuri
   și în sitemap.
4. Șterge datele demo: `node scripts/seed-demo.mjs --sterge`.
5. Verifică în Supabase că bucket-ul `ie-documenti` este **privat**.
6. Configurează cron-ul pentru remindere.
7. `npm run build` trebuie să treacă înainte de deploy.

### Copii de siguranță

Supabase face copii automate ale bazei; verifică frecvența pe planul tău.
Documentele stau în Storage și au nevoie de o politică proprie de backup —
baza fără fișiere reface doar jumătate din dosar.

---

## 10. Convenții de cod

- Comentariile și denumirile interne sunt în **română**, ca în restul
  depozitului. Textele către utilizator sunt în **italiană**: clienții
  biroului sunt italieni și imigranți din Italia.
- Sumele de bani sunt `bigint` în cenți. Niciun preț nu trece prin virgulă
  mobilă.
- Vocabularele sunt `text` + `check`, nu enum-uri Postgres: `alter type … add
  value` nu poate rula în aceeași tranzacție cu restul migrației.
- Migrațiile sunt idempotente.
- Ce se calculează pur (sloturi, tranziții, permisiuni) trăiește în module fără
  efecte, ca să poată fi testat direct.
