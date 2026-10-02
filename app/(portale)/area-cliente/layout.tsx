import { redirect } from "next/navigation";
import { InvelisPortal, type LegaturaPortal } from "@/components/immy/invelis-portal";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { numarNecitite } from "@/lib/immy/dal/notificari";
import { mesajeNecitite } from "@/lib/immy/dal/mesaje";
import { estePersonal, paginaDeStart } from "@/lib/immy/rbac";

/*
 * Zonele private nu se prerandează NICIODATĂ.
 *
 * Fără asta, Next poate marca pagina drept statică atunci când integrarea
 * lipsește la build (`clientSesiune()` iese devreme și nu atinge `cookies()`).
 * Într-o instalare configurată, o pagină privată prerandată ar servi tuturor
 * același HTML — exact felul de scurgere care nu se vede la testare.
 */
export const dynamic = "force-dynamic";

export default async function LayoutClient({ children }: { children: React.ReactNode }) {
  const sesiune = await sesiuneCurenta();

  // Fără sesiune: la autentificare. Cu sesiune de personal: la portalul lui —
  // un operator care aterizează aici ar vedea o zonă goală și ar crede că
  // sistemul e stricat.
  if (!sesiune) redirect("/accedi");
  if (estePersonal(sesiune.rol)) redirect(paginaDeStart(sesiune.rol));

  const [notificari, mesaje] = await Promise.all([numarNecitite(), mesajeNecitite()]);

  const legaturi: LegaturaPortal[] = [
    { href: "/area-cliente", eticheta: "Riepilogo" },
    { href: "/area-cliente/appuntamenti", eticheta: "I miei appuntamenti" },
    { href: "/area-cliente/pratiche", eticheta: "Le mie pratiche" },
    { href: "/area-cliente/documenti", eticheta: "I miei documenti" },
    { href: "/area-cliente/messaggi", eticheta: "Messaggi", insigna: mesaje },
    { href: "/area-cliente/notifiche", eticheta: "Notifiche", insigna: notificari },
    { href: "/area-cliente/profilo", eticheta: "Profilo" },
  ];

  return (
    <InvelisPortal sesiune={sesiune} legaturi={legaturi} titlu="Area riservata">
      {children}
    </InvelisPortal>
  );
}
