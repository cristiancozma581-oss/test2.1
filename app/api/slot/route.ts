import { NextResponse, type NextRequest } from "next/server";
import { operatoriPentruServiciu, serviciuDupaId } from "@/lib/immy/dal/catalog";
import { sloturiPentru } from "@/lib/immy/dal/disponibilitate";
import { setari } from "@/lib/immy/dal/setari";
import { adaugaZile, dataISO } from "@/lib/immy/fus-orar";
import { etichetaZi } from "@/lib/immy/disponibilitate";

/**
 * Disponibilitatea, pentru fluxul de rezervare (§11, §17, §53).
 *
 * Ruta este publică pentru că trebuie să fie: cine rezervă fără cont are nevoie
 * de calendar. Nu expune însă nimic personal — doar ore libere. Nu spune cine
 * ocupă orele lipsă și nici măcar dacă lipsesc pentru că sunt ocupate sau
 * pentru că operatorul e în concediu.
 *
 * Trei forme, după parametri:
 *   ?servizio=…                         → operatorii serviciului
 *   ?servizio=…&operatore=…             → zilele cu locuri libere
 *   ?servizio=…&operatore=…&giorno=…    → orele libere din acea zi
 */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZI = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(cerere: NextRequest) {
  const p = cerere.nextUrl.searchParams;
  const serviciuId = p.get("servizio");
  const operatorId = p.get("operatore");
  const zi = p.get("giorno");

  // Identificatorii se verifică înainte de a atinge baza: un parametru care nu
  // are forma unui UUID nu are ce căuta într-o interogare.
  if (!serviciuId || !UUID.test(serviciuId)) {
    return NextResponse.json({ eroare: "Servizio non valido." }, { status: 400 });
  }

  const serviciu = await serviciuDupaId(serviciuId);
  if (!serviciu || serviciu.status !== "ACTIVE" || !serviciu.bookable_online) {
    return NextResponse.json({ eroare: "Servizio non disponibile." }, { status: 404 });
  }

  if (!operatorId) {
    return NextResponse.json({ operatori: await operatoriPentruServiciu(serviciuId) });
  }

  if (!UUID.test(operatorId)) {
    return NextResponse.json({ eroare: "Operatore non valido." }, { status: 400 });
  }

  // Operatorul trebuie să presteze chiar serviciul cerut; altfel s-ar putea
  // afla programul cuiva combinând identificatori la întâmplare.
  const permisi = await operatoriPentruServiciu(serviciuId);
  if (!permisi.some((o) => o.id === operatorId)) {
    return NextResponse.json({ eroare: "Operatore non disponibile per questo servizio." }, { status: 404 });
  }

  const s = await setari();
  const azi = dataISO(s.fusOrar, new Date());

  if (!zi) {
    // Două săptămâni deodată: destul pentru a alege, destul de puțin pentru a
    // rămâne o singură rundă de interogări.
    const zile = await sloturiPentru(operatorId, serviciu.duration_minutes, azi, 14);
    return NextResponse.json({
      zile: zile.map((z) => ({
        zi: z.zi,
        eticheta: etichetaZi(s.fusOrar, z.zi),
        libere: z.sloturi.length,
      })),
    });
  }

  if (!ZI.test(zi)) {
    return NextResponse.json({ eroare: "Data non valida." }, { status: 400 });
  }
  // Orizontul este verificat și de motor; aici oprim din start cererile care
  // ar cere calendarul peste doi ani.
  if (zi < azi || zi > adaugaZile(azi, s.orizontZile)) {
    return NextResponse.json({ sloturi: [] });
  }

  const [rezultat] = await sloturiPentru(operatorId, serviciu.duration_minutes, zi, 1);

  return NextResponse.json({
    sloturi: (rezultat?.sloturi ?? []).map((x) => ({
      inceput: x.inceput.toISOString(),
      ora: x.ora,
    })),
  });
}
