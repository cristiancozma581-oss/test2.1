# How to test IMMY & EMY

This is a full web application (Next.js + Supabase), not a static website, so
it cannot run on GitHub Pages. The simplest way to test it is free:
**Supabase** (database + logins) and **Vercel** (hosting). The full technical
documentation is in `README.md` (Romanian).

## 1. Create the database (Supabase)

1. Sign up at https://supabase.com and create a new project. Choose a region in
   Europe and save the database password.
2. Open **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (keep it secret)
3. Open **Database → Connection string → URI** and copy it → `DATABASE_URL`
   (put your password in place of `[YOUR-PASSWORD]`).
4. Under **Authentication → Providers → Email**, leave **Confirm email** ON.

## 2. Create the tables (once, from your computer)

Requires Node.js 20.9 or newer (https://nodejs.org).

```bash
git clone <this repository's URL>
cd test2.1
npm install
npm install --no-save pg
DATABASE_URL='postgresql://…' node scripts/migreaza.mjs
```

This creates all tables and the real catalogue (20 services, FAQ, opening hours).

Optional demo data (demo accounts, bookings and a case file):

```bash
cp .env.example .env.local   # fill in the four values from step 1
node scripts/seed-demo.mjs   # demo accounts: password DemoImmyEmy2026
```

Remove it later with `node scripts/seed-demo.mjs --sterge`.

## 3. Put it online (Vercel)

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project**, then import the `test2.1` repository.
3. Under **Environment Variables**, add the four values from step 1.
4. Click **Deploy**. After a minute or two you get a link such as
   `https://test2-1.vercel.app`.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to
   that link so confirmation emails point to it.

## 4. Become admin

1. On your site, register at `/registrati` and confirm your email.
2. In Supabase → **SQL Editor**, run:

```sql
update public.ie_profiles set role = 'SUPER_ADMIN' where email = 'your@email.com';
```

3. Log in at `/accedi`. The control centre is at `/admin`, the operator
   workspace at `/operatore` and the client area at `/area-cliente`.

## Optional integrations

Email (Resend), Telegram, the AI assistant and reminders all work without keys
in a reduced mode. To turn them on, see `README.md` section 6 and
`.env.example`.

## Run it on your own computer instead

After steps 1–2 (with `.env.local` filled in):

```bash
npm run dev    # open http://localhost:3000
```
