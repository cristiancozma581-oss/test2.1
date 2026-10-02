#!/usr/bin/env node
/**
 * Date DEMO pentru IMMY & EMY (§74).
 *
 * Creează conturi (admin, operatori, clienți), programări și dosare de
 * exemplu. Tot ce scrie are `is_demo = true`, deci se șterge cu o comandă,
 * fără să atingă catalogul real din migrația 0017.
 *
 * Cere:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Conturile se creează prin Auth, nu prin SQL: `ie_profiles.id` referă
 * `auth.users`, iar parolele trebuie hash-uite de Supabase.
 *
 * Rulează cu `--sterge` ca să ștergi datele demo în loc să le creezi.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.IMMY_SUPABASE_URL?.trim();
const cheie =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !cheie) {
  console.error(
    "Lipsesc NEXT_PUBLIC_SUPABASE_URL și/sau SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Le găsești în Supabase → Project Settings → API.",
  );
  process.exit(1);
}

const sb = createClient(url, cheie, { auth: { persistSession: false } });

/*
 * Parola conturilor demo.
 *
 * Se poate schimba din mediu. Este demo, dar tot un cont real: cine lasă
 * platforma cu date demo într-o instalare publică trebuie să știe ce parolă a
 * rămas în picioare — de aceea o și scriem în consolă la final.
 */
const PAROLA = process.env.IMMY_DEMO_PASSWORD ?? "DemoImmyEmy2026";

const CONTURI = [
  { email: "admin.demo@immyemy.local", nume: "Admin Demo", rol: "SUPER_ADMIN", telefon: "011 8532373" },
  { email: "immy.demo@immyemy.local", nume: "Immy Demo", rol: "OPERATOR", telefon: "333 4759704", operator: "immy" },
  { email: "emy.demo@immyemy.local", nume: "Emy Demo", rol: "OPERATOR", telefon: "333 4759705", operator: "emy" },
  { email: "reception.demo@immyemy.local", nume: "Accoglienza Demo", rol: "RECEPTIONIST", telefon: "011 8532374" },
  { email: "maria.demo@immyemy.local", nume: "Maria Rossi", rol: "CLIENT", telefon: "340 1112233" },
  { email: "ahmed.demo@immyemy.local", nume: "Ahmed Haddad", rol: "CLIENT", telefon: "340 4445566" },
  { email: "elena.demo@immyemy.local", nume: "Elena Ionescu", rol: "CLIENT", telefon: "340 7778899" },
];

async function sterge() {
  console.log("Șterg datele demo…\n");

  // Ordinea contează: copiii înaintea părinților, ca să nu lovim în chei străine.
  for (const tabel of [
    "ie_document_versions",
    "ie_documents",
    "ie_messages",
    "ie_threads",
    "ie_notifications",
    "ie_appointments",
    "ie_cases",
  ]) {
    const { error } = await sb.from(tabel).delete().eq("is_demo", true);
    if (error && !/column .* does not exist/i.test(error.message)) {
      console.warn(`  ${tabel}: ${error.message}`);
    } else {
      console.log(`  ${tabel}: curățat`);
    }
  }

  const { data: utilizatori } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of utilizatori?.users ?? []) {
    if (u.email?.endsWith("@immyemy.local")) {
      await sb.auth.admin.deleteUser(u.id);
      console.log(`  cont șters: ${u.email}`);
    }
  }

  console.log("\nGata. Catalogul real nu a fost atins.");
}

async function creeaza() {
  console.log("Creez datele demo…\n");

  // --- Conturi ---------------------------------------------------------------
  const idPeEmail = new Map();

  for (const c of CONTURI) {
    const { data, error } = await sb.auth.admin.createUser({
      email: c.email,
      password: PAROLA,
      email_confirm: true,
      user_metadata: { full_name: c.nume, phone: c.telefon, preferred_locale: "it" },
    });

    let id = data?.user?.id;

    if (error) {
      if (!/already|registered|exists/i.test(error.message)) {
        console.error(`  ${c.email}: ${error.message}`);
        continue;
      }
      // Contul există deja de la o rulare anterioară: îl regăsim.
      const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
      id = lista?.users.find((u) => u.email === c.email)?.id;
    }

    if (!id) continue;
    idPeEmail.set(c.email, id);

    // Triggerul din 0011 a creat profilul cu rolul CLIENT; îl ridicăm aici, cu
    // cheia de service — singura cale prin care un rol poate fi atribuit.
    await sb
      .from("ie_profiles")
      .update({
        role: c.rol,
        full_name: c.nume,
        phone: c.telefon,
        is_demo: true,
        gdpr_accepted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (c.operator) {
      await sb.from("ie_operators").update({ profile_id: id }).eq("slug", c.operator);
    }

    console.log(`  ${c.rol.padEnd(13)} ${c.email}`);
  }

  // --- Programări ------------------------------------------------------------
  const { data: servicii } = await sb
    .from("ie_services")
    .select("id, slug, duration_minutes")
    .eq("status", "ACTIVE");
  const { data: operatori } = await sb.from("ie_operators").select("id, slug");
  const { data: legaturi } = await sb.from("ie_operator_services").select("operator_id, service_id");

  if (!servicii?.length || !operatori?.length) {
    console.log("\nCatalogul e gol: rulează întâi migrațiile (inclusiv 0017).");
    return;
  }

  const clienti = CONTURI.filter((c) => c.rol === "CLIENT")
    .map((c) => ({ ...c, id: idPeEmail.get(c.email) }))
    .filter((c) => c.id);

  /**
   * Următoarea zi lucrătoare la ora dată, ca moment absolut.
   *
   * Se calculează din ora de perete a Romei, ca programările demo să cadă
   * chiar în programul biroului și nu la 3 dimineața pe un server în UTC.
   */
  function momentLucrator(pesteZile, ora, minut) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + pesteZile);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const zi = d.toISOString().slice(0, 10);
    // Decalajul Romei pentru ziua respectivă, prin Intl.
    const proba = new Date(`${zi}T12:00:00Z`);
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      hour12: false,
      hour: "2-digit",
    });
    const decalajOre = Number(f.format(proba)) - 12;
    return new Date(`${zi}T${String(ora - decalajOre).padStart(2, "0")}:${String(minut).padStart(2, "0")}:00Z`);
  }

  const planificate = [
    { client: 0, serviciu: "spid", peste: 1, ora: 10, minut: 0, status: "CONFIRMED" },
    { client: 1, serviciu: "permessi-di-soggiorno-kit", peste: 2, ora: 11, minut: 0, status: "PENDING" },
    { client: 2, serviciu: "730-modello-unico", peste: 3, ora: 15, minut: 30, status: "CONFIRMED" },
    { client: 0, serviciu: "certificati-anagrafici", peste: -7, ora: 9, minut: 30, status: "COMPLETED" },
    { client: 1, serviciu: "cittadinanza", peste: -14, ora: 16, minut: 0, status: "COMPLETED" },
  ];

  let create = 0;
  for (const p of planificate) {
    const client = clienti[p.client];
    const serviciu = servicii.find((s) => s.slug === p.serviciu);
    if (!client || !serviciu) continue;

    const operatorId = legaturi?.find((l) => l.service_id === serviciu.id)?.operator_id;
    if (!operatorId) continue;

    const inceput = momentLucrator(p.peste, p.ora, p.minut);
    const sfarsit = new Date(inceput.getTime() + serviciu.duration_minutes * 60_000);
    const [nume, ...restul] = client.nume.split(" ");

    const { error } = await sb.from("ie_appointments").insert({
      service_id: serviciu.id,
      operator_id: operatorId,
      client_id: client.id,
      guest_first_name: nume,
      guest_last_name: restul.join(" ") || nume,
      guest_email: client.email,
      guest_phone: client.telefon,
      starts_at: inceput.toISOString(),
      ends_at: sfarsit.toISOString(),
      status: p.status,
      source: "web",
      is_demo: true,
    });

    if (error) {
      // Constrângerea EXCLUDE poate refuza o suprapunere la o rulare repetată:
      // e chiar comportamentul dorit, nu o eroare de raportat zgomotos.
      if (error.code !== "23P01") console.warn(`  programare: ${error.message}`);
    } else {
      create += 1;
    }
  }
  console.log(`\n  ${create} programări demo`);

  // --- Dosare cu documente cerute --------------------------------------------
  const serviciuDosar = servicii.find((s) => s.slug === "permessi-di-soggiorno-kit");
  const operatorDosar = legaturi?.find((l) => l.service_id === serviciuDosar?.id)?.operator_id;

  if (serviciuDosar && operatorDosar && clienti[1]) {
    const { data: dosar, error } = await sb
      .from("ie_cases")
      .insert({
        client_id: clienti[1].id,
        service_id: serviciuDosar.id,
        operator_id: operatorDosar,
        title: "Rinnovo permesso di soggiorno — Ahmed Haddad",
        status: "WAITING_DOCUMENTS",
        priority: "high",
        deadline: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
        is_demo: true,
      })
      .select("id")
      .single();

    if (error) {
      console.warn(`  dosar: ${error.message}`);
    } else {
      await sb.from("ie_documents").insert([
        {
          case_id: dosar.id,
          client_id: clienti[1].id,
          label: "Passaporto in corso di validità",
          status: "REQUESTED",
          review_note: "Servono tutte le pagine con i timbri.",
          is_demo: true,
        },
        {
          case_id: dosar.id,
          client_id: clienti[1].id,
          label: "Contratto di lavoro",
          status: "REQUESTED",
          is_demo: true,
        },
      ]);

      const { data: fir } = await sb
        .from("ie_threads")
        .insert({
          case_id: dosar.id,
          client_id: clienti[1].id,
          operator_id: operatorDosar,
          subject: "Documenti per il rinnovo",
          is_demo: true,
        })
        .select("id")
        .single();

      if (fir) {
        await sb.from("ie_messages").insert([
          {
            thread_id: fir.id,
            sender_id: clienti[1].id,
            sender_role: "CLIENT",
            body: "Buongiorno, ho il passaporto in scadenza il mese prossimo. Va bene lo stesso?",
            is_demo: true,
          },
          {
            thread_id: fir.id,
            sender_role: "OPERATOR",
            body: "Buongiorno Ahmed. Sì, va bene: prepariamo la pratica e nel frattempo puoi avviare il rinnovo del passaporto. Carichi intanto le pagine con i timbri?",
            is_demo: true,
          },
        ]);
      }

      console.log("  1 dosar demo, cu 2 documente cerute și o conversație");
    }
  }

  console.log(
    `\nGata.\n\nConturi demo (parola: ${PAROLA}):\n` +
      CONTURI.map((c) => `  ${c.rol.padEnd(13)} ${c.email}`).join("\n") +
      "\n\nȘterge-le înainte de a pune platforma în producție:\n" +
      "  node scripts/seed-demo.mjs --sterge",
  );
}

if (process.argv.includes("--sterge")) {
  await sterge();
} else {
  await creeaza();
}
