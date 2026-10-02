import { redirect } from "next/navigation";
import { InvelisPortal, type LegaturaPortal } from "@/components/immy/invelis-portal";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { numarNecitite } from "@/lib/immy/dal/notificari";
import { esteAdmin, paginaDeStart } from "@/lib/immy/rbac";

/*
 * Zonele private nu se prerandează NICIODATĂ.
 *
 * Fără asta, Next poate marca pagina drept statică atunci când integrarea
 * lipsește la build (`clientSesiune()` iese devreme și nu atinge `cookies()`).
 * Într-o instalare configurată, o pagină privată prerandată ar servi tuturor
 * același HTML — exact felul de scurgere care nu se vede la testare.
 */
export const dynamic = "force-dynamic";

/** Centrul de control al administratorului (§32, §73). */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) redirect("/accedi");
  if (!esteAdmin(sesiune.rol)) redirect(paginaDeStart(sesiune.rol));

  const notificari = await numarNecitite();

  const legaturi: LegaturaPortal[] = [
    { href: "/admin", eticheta: "Dashboard" },
    { href: "/admin/calendario", eticheta: "Calendario" },
    { href: "/admin/appuntamenti", eticheta: "Appuntamenti" },
    { href: "/admin/clienti", eticheta: "Clienti" },
    { href: "/admin/pratiche", eticheta: "Pratiche" },
    { href: "/admin/servizi", eticheta: "Servizi" },
    { href: "/admin/operatori", eticheta: "Operatori" },
    { href: "/admin/disponibilita", eticheta: "Disponibilità" },
    { href: "/admin/faq", eticheta: "FAQ" },
    { href: "/admin/statistiche", eticheta: "Statistiche" },
    { href: "/admin/utenti", eticheta: "Utenti" },
    { href: "/admin/audit", eticheta: "Audit log" },
    { href: "/admin/impostazioni", eticheta: "Impostazioni" },
    { href: "/admin/notifiche", eticheta: "Notifiche", insigna: notificari },
  ];

  return (
    <InvelisPortal sesiune={sesiune} legaturi={legaturi} titlu="Control center">
      {children}
    </InvelisPortal>
  );
}
