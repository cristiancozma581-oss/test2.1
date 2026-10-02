import { NextResponse, type NextRequest } from "next/server";
import { clientServiciu } from "@/lib/immy/supabase";
import { setari } from "@/lib/immy/dal/setari";
import { trimiteNotificare } from "@/lib/immy/notificari";
import { fereastraCronMinute, secretCron } from "@/lib/immy/env";
import { dataISO, oraLocala } from "@/lib/immy/fus-orar";

/**
 * Reminderele automate (§28).
 *
 * Se apelează dintr-un planificator (Vercel Cron, cron de sistem, orice), cu
 * antetul `Authorization: Bearer $IMMY_CRON_SECRET`.
 *
 * Fără secretul configurat ruta refuză TOT: un endpoint care trimite mesaje
 * către clienți nu are voie să fie deschis pentru că nimeni n-a apucat să-l
 * configureze. Un 404 în loc de 401 nu-i confirmă existența unui scanner.
 *
 * Idempotență: fiecare programare ține în `reminder_sent_offsets` decalajele
 * pentru care i s-a trimis deja. Rulat de zece ori într-o oră, tot un singur
 * reminder pleacă — iar planificatoarele chiar repetă apelurile.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(cerere: NextRequest) {
  const secret = secretCron();
  if (!secret) {
    return NextResponse.json({ eroare: "Non trovato." }, { status: 404 });
  }

  /*
   * Două forme de autorizare, ambele pe secret.
   *
   * Un planificator oarecare trimite `Authorization: Bearer <secret>`.
   * Cron-ul Vercel nu poate trimite antete proprii, dar semnează cererea cu
   * `x-vercel-cron`; acolo cerem secretul în parametru. Ambele căi verifică
   * ACELAȘI secret — a doua nu este o portiță, ci același zăvor cu altă cheie
   * în mână.
   */
  const antet = cerere.headers.get("authorization");
  const dinParametru = cerere.nextUrl.searchParams.get("token");
  const autorizat = antet === `Bearer ${secret}` || dinParametru === secret;

  if (!autorizat) {
    return NextResponse.json({ eroare: "Non autorizzato." }, { status: 401 });
  }

  const sb = clientServiciu();
  if (!sb) {
    return NextResponse.json({ eroare: "Integrazione non configurata." }, { status: 503 });
  }

  const s = await setari();
  const acum = Date.now();
  let trimise = 0;

  /*
   * Fereastra de căutare trebuie să fie cât intervalul dintre rulări.
   *
   * La un cron orar (fereastră 60), reminderul de 24 de ore se caută între 24h
   * și 25h în viitor: fiecare programare intră în fereastră exact o dată. La un
   * cron zilnic, fereastra trebuie să fie 1440 — altfel rularea ar vedea doar o
   * felie de o oră din zi și ar rata restul programărilor, tăcut.
   *
   * O fereastră prea largă nu duce la remindere duble: `deja` de mai jos
   * oprește al doilea. Duce însă la remindere trimise mai devreme decât scrie
   * pe etichetă, de unde recomandarea din README de a păstra un singur decalaj
   * atunci când planificatorul rulează o dată pe zi.
   */
  const fereastra = fereastraCronMinute();

  for (const decalaj of s.remindereMinute) {
    const de = new Date(acum + decalaj * 60_000);
    const pana = new Date(acum + (decalaj + fereastra) * 60_000);

    const { data } = await sb
      .from("ie_appointments")
      .select(
        "id, code, starts_at, client_id, guest_email, locale, reminder_sent_offsets, ie_services ( name )",
      )
      .in("status", ["PENDING", "CONFIRMED", "RESCHEDULED"])
      .gte("starts_at", de.toISOString())
      .lt("starts_at", pana.toISOString())
      .limit(500);

    for (const p of data ?? []) {
      const deja = (p.reminder_sent_offsets ?? []) as number[];
      if (deja.includes(decalaj)) continue;

      const serviciu = Array.isArray(p.ie_services) ? p.ie_services[0] : p.ie_services;
      const inceput = new Date(p.starts_at as string);

      await trimiteNotificare({
        eveniment: "APPOINTMENT_REMINDER",
        destinatarId: p.client_id as string | null,
        destinatarEmail: p.guest_email as string | null,
        limba: (p.locale as string) ?? "it",
        context: {
          cod: p.code as string,
          serviciu: serviciu?.name ?? "",
          data: dataISO(s.fusOrar, inceput),
          ora: oraLocala(s.fusOrar, inceput),
        },
        entitate: { tip: "appointment", id: p.id as string },
      });

      await sb
        .from("ie_appointments")
        .update({ reminder_sent_offsets: [...deja, decalaj] })
        .eq("id", p.id as string);

      trimise += 1;
    }
  }

  return NextResponse.json({ ok: true, trimise }, { headers: { "Cache-Control": "no-store" } });
}
