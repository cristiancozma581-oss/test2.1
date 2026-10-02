import { NextResponse, type NextRequest } from "next/server";
import { clientSesiune } from "@/lib/immy/supabase";
import { leagaProgramariDeCont } from "@/lib/immy/dal/programari";
import { auditeaza } from "@/lib/immy/audit";
import { paginaDeStart } from "@/lib/immy/rbac";
import type { Rol } from "@/lib/immy/tipuri";

/**
 * Întoarcerea din e-mail: confirmarea adresei și recuperarea parolei.
 *
 * Supabase trimite un `code` de unică folosință, pe care îl schimbăm aici pe o
 * sesiune. Destinația se ia din `next`, dar numai dacă este o cale relativă:
 * fără verificarea aceea, un link cu `next=https://…` ar face din ruta noastră
 * o redirecționare deschisă, folositoare într-un atac de tip phishing.
 */
export async function GET(cerere: NextRequest) {
  const url = cerere.nextUrl;
  const cod = url.searchParams.get("code");
  const urmator = url.searchParams.get("next");

  const destinatie =
    urmator && urmator.startsWith("/") && !urmator.startsWith("//") ? urmator : null;

  if (!cod) {
    return NextResponse.redirect(new URL("/accedi?errore=link", url.origin));
  }

  const sb = await clientSesiune();
  if (!sb) return NextResponse.redirect(new URL("/accedi", url.origin));

  const { data, error } = await sb.auth.exchangeCodeForSession(cod);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/accedi?errore=scaduto", url.origin));
  }

  /*
   * Aici — și numai aici — programările făcute ca oaspete se leagă de cont.
   *
   * Deschiderea acestui link dovedește că omul are acces la cutia poștală, deci
   * că adresa este a lui. Făcută la înregistrare, legarea ar muta programările
   * cuiva în contul primului care se înregistrează cu adresa lui.
   *
   * `email_confirmed_at` este condiția explicită: dacă instanța Supabase are
   * confirmarea dezactivată, ea nu mai înseamnă nimic, iar legarea automată nu
   * trebuie să se producă (operatorul poate atașa programarea din admin).
   */
  if (data.user.email && data.user.email_confirmed_at) {
    const legate = await leagaProgramariDeCont(data.user.id, data.user.email);
    if (legate > 0) {
      await auditeaza({
        actorId: data.user.id,
        actorEmail: data.user.email,
        actorRol: "CLIENT",
        actiune: "UPDATE",
        entitate: "appointment",
        rezumat: `${legate} prenotazioni collegate all'account dopo la verifica dell'email.`,
      });
    }
  }

  if (destinatie) return NextResponse.redirect(new URL(destinatie, url.origin));

  const { data: profil } = await sb
    .from("ie_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(paginaDeStart((profil?.role ?? "CLIENT") as Rol), url.origin),
  );
}
