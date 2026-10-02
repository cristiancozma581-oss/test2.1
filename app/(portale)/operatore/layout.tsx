import { redirect } from "next/navigation";
import { InvelisPortal, type LegaturaPortal } from "@/components/immy/invelis-portal";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { numarNecitite } from "@/lib/immy/dal/notificari";
import { poate } from "@/lib/immy/rbac";

/**
 * Spațiul de lucru al operatorului (§34).
 *
 * Meniul se construiește din permisiuni, nu dintr-o listă fixă: accoglienza
 * ține calendarul, dar nu intră în dosare și documente, deci nici nu vede
 * legăturile către ele. Ascunderea este comoditate; refuzul propriu-zis vine
 * din stratul de acces la date, care verifică din nou.
 */
/*
 * Zonele private nu se prerandează NICIODATĂ.
 *
 * Fără asta, Next poate marca pagina drept statică atunci când integrarea
 * lipsește la build (`clientSesiune()` iese devreme și nu atinge `cookies()`).
 * Într-o instalare configurată, o pagină privată prerandată ar servi tuturor
 * același HTML — exact felul de scurgere care nu se vede la testare.
 */
export const dynamic = "force-dynamic";

export default async function LayoutOperator({ children }: { children: React.ReactNode }) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) redirect("/accedi");

  if (!poate(sesiune.rol, "dashboard.operator")) {
    redirect(poate(sesiune.rol, "dashboard.admin") ? "/admin" : "/area-cliente");
  }

  const notificari = await numarNecitite();

  const legaturi: LegaturaPortal[] = [
    { href: "/operatore", eticheta: "Oggi" },
    { href: "/operatore/calendario", eticheta: "Calendario" },
    { href: "/operatore/appuntamenti", eticheta: "Appuntamenti" },
  ];

  if (poate(sesiune.rol, "dosare.vezi_propriu") || poate(sesiune.rol, "dosare.vezi_tot")) {
    legaturi.push({ href: "/operatore/pratiche", eticheta: "Pratiche" });
  }
  if (poate(sesiune.rol, "documente.verifica")) {
    legaturi.push({ href: "/operatore/documenti", eticheta: "Documenti" });
  }
  if (poate(sesiune.rol, "mesaje.raspunde")) {
    legaturi.push({ href: "/operatore/messaggi", eticheta: "Messaggi" });
  }
  legaturi.push({ href: "/operatore/notifiche", eticheta: "Notifiche", insigna: notificari });

  return (
    <InvelisPortal sesiune={sesiune} legaturi={legaturi} titlu="Workspace operatore">
      {children}
    </InvelisPortal>
  );
}
