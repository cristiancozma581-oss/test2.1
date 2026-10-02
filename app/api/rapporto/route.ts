import { NextResponse, type NextRequest } from "next/server";
import { randuriRaport } from "@/lib/immy/dal/statistici";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";
import { auditeaza } from "@/lib/immy/audit";
import { poate } from "@/lib/immy/rbac";
import { dataISO, oraLocala } from "@/lib/immy/fus-orar";

/**
 * Exportul CSV al programărilor (§42).
 *
 * Excel deschide CSV-ul cu separatorul din setările regionale; în Italia acela
 * este `;`. Cu virgulă, tot fișierul ar ajunge într-o singură coloană — un
 * export pe care nimeni nu-l poate folosi este un export inexistent.
 */
export const dynamic = "force-dynamic";

/**
 * Scapă o valoare pentru CSV.
 *
 * Prefixul apostrof pentru valorile care încep cu `=`, `+`, `-` sau `@` oprește
 * injecția de formule: o celulă `=HYPERLINK(...)` s-ar executa la deschiderea
 * fișierului, cu datele clientului în ea.
 */
function celula(v: unknown): string {
  const t = v === null || v === undefined ? "" : String(v);
  const sigur = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  return `"${sigur.replace(/"/g, '""')}"`;
}

const ZI = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(cerere: NextRequest) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune || !poate(sesiune.rol, "statistici.vezi")) {
    return NextResponse.json({ eroare: "Non autorizzato." }, { status: 403 });
  }

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());
  const dal = cerere.nextUrl.searchParams.get("dal");
  const al = cerere.nextUrl.searchParams.get("al");

  const deLa = dal && ZI.test(dal) ? dal : azi;
  const panaLa = al && ZI.test(al) ? al : azi;

  const randuri = await randuriRaport(deLa, panaLa);

  const antet = [
    "Codice", "Data", "Ora", "Servizio", "Operatore",
    "Cliente", "Email", "Telefono", "Stato",
  ];

  const linii = randuri.map((r) => {
    const serviciu = Array.isArray(r.ie_services) ? r.ie_services[0] : r.ie_services;
    const operator = Array.isArray(r.ie_operators) ? r.ie_operators[0] : r.ie_operators;
    const profil = Array.isArray(r.ie_profiles) ? r.ie_profiles[0] : r.ie_profiles;
    const inceput = new Date(r.starts_at as string);

    return [
      r.code,
      dataISO(s.fusOrar, inceput),
      oraLocala(s.fusOrar, inceput),
      serviciu?.name ?? "",
      operator?.display_name ?? "",
      profil?.full_name ?? `${r.guest_first_name ?? ""} ${r.guest_last_name ?? ""}`.trim(),
      profil?.email ?? r.guest_email ?? "",
      r.guest_phone ?? "",
      r.status,
    ].map(celula).join(";");
  });

  // BOM UTF-8: fără el, Excel pe Windows strică diacriticele și accentele.
  const csv = "﻿" + [antet.map(celula).join(";"), ...linii].join("\r\n");

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "EXPORT",
    entitate: "appointment",
    rezumat: `Export CSV ${deLa} → ${panaLa} (${randuri.length} righe)`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="immyemy-appuntamenti-${deLa}_${panaLa}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
