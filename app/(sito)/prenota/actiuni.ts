"use server";

import { redirect } from "next/navigation";
import { creeazaProgramare } from "@/lib/immy/dal/programari";
import { erori, schemaRezervare } from "@/lib/immy/validare";

/**
 * Acțiunea de rezervare (§11, §71, §78).
 *
 * „Dacă apăs Conferma, trebuie să creeze programarea în bază" — asta face.
 * Validează cu aceeași schemă ca browserul, apoi cheamă stratul de acces la
 * date, care reverifică slotul și scrie.
 *
 * Fișierul este marcat `"use server"`: fiecare export este un endpoint POST
 * apelabil direct. De aceea nu se presupune nimic despre apelant — nici că a
 * trecut prin formular, nici că a văzut vreodată pagina.
 */

export type StareRezervare = {
  ok: boolean;
  eroare?: string;
  campuri?: Record<string, string>;
};

export async function rezerva(
  _stareAnterioara: StareRezervare,
  formular: FormData,
): Promise<StareRezervare> {
  const brut = {
    serviceId: formular.get("serviceId"),
    operatorId: formular.get("operatorId"),
    inceput: formular.get("inceput"),
    nume: formular.get("nume"),
    prenume: formular.get("prenume"),
    email: formular.get("email"),
    telefon: formular.get("telefon"),
    limba: formular.get("limba") || "it",
    note: formular.get("note") || undefined,
    // O bifă neatinsă lipsește cu totul din FormData; `=== "on"` o transformă
    // în `false`, ceea ce schema respinge explicit.
    gdpr: formular.get("gdpr") === "on",
  };

  const verificat = schemaRezervare.safeParse(brut);
  if (!verificat.success) {
    return {
      ok: false,
      eroare: "Controlla i campi segnalati.",
      campuri: erori(verificat.error),
    };
  }

  const rezultat = await creeazaProgramare(verificat.data);
  if (!rezultat.ok) return { ok: false, eroare: rezultat.eroare };

  // `redirect` aruncă, deci stă în afara oricărui try/catch — altfel ar fi
  // prins ca eroare și navigarea n-ar mai avea loc.
  redirect(`/prenota/conferma?codice=${encodeURIComponent(rezultat.date.cod)}`);
}
