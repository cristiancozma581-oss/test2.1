import { NextResponse, type NextRequest } from "next/server";
import { intreabaAsistentul } from "@/lib/immy/asistent";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";

/**
 * Asistentul (§44).
 *
 * Ruta este publică, deci are nevoie de o limită de debit proprie: fără ea,
 * cineva ar putea consuma cheia de model a biroului într-o buclă. Limita este
 * ținută în memoria procesului — suficient pentru o instanță, iar când
 * platforma va rula pe mai multe, se mută într-un depozit comun.
 */

export const dynamic = "force-dynamic";

const FEREASTRA_MS = 60_000;
const MAXIM_PE_FEREASTRA = 12;
const contor = new Map<string, { pana: number; numar: number }>();

function preaMulte(cheie: string): boolean {
  const acum = Date.now();
  const intrare = contor.get(cheie);

  if (!intrare || intrare.pana < acum) {
    contor.set(cheie, { pana: acum + FEREASTRA_MS, numar: 1 });
    // Curățare oportunistă: harta nu trebuie să crească la nesfârșit.
    if (contor.size > 5000) {
      for (const [k, v] of contor) if (v.pana < acum) contor.delete(k);
    }
    return false;
  }

  intrare.numar += 1;
  return intrare.numar > MAXIM_PE_FEREASTRA;
}

export async function POST(cerere: NextRequest) {
  const s = await setari();
  if (!s.asistentActiv) {
    return NextResponse.json({ eroare: "Assistente non attivo." }, { status: 404 });
  }

  const ip =
    cerere.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    cerere.headers.get("x-real-ip") ??
    "anonim";

  if (preaMulte(ip)) {
    return NextResponse.json(
      { eroare: "Troppe domande in poco tempo. Riprova fra un minuto." },
      { status: 429 },
    );
  }

  let corp: unknown;
  try {
    corp = await cerere.json();
  } catch {
    return NextResponse.json({ eroare: "Richiesta non valida." }, { status: 400 });
  }

  const intrebare =
    typeof corp === "object" && corp !== null && "domanda" in corp
      ? String((corp as { domanda: unknown }).domanda)
      : "";

  if (intrebare.trim().length < 2) {
    return NextResponse.json({ eroare: "Scrivi una domanda." }, { status: 400 });
  }

  const sesiune = await sesiuneCurenta();
  const rezultat = await intreabaAsistentul(intrebare, ip, sesiune?.id ?? null);

  return NextResponse.json({
    risposta: rezultat.raspuns,
    servizi: rezultat.serviciiSugerate,
    operatore: rezultat.predaLaOperator,
  });
}
