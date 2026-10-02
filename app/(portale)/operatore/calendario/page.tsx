import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { CalendarSaptamanal } from "@/components/immy/calendar";
import { programariInterval } from "@/lib/immy/dal/programari";
import { setari } from "@/lib/immy/dal/setari";
import { adaugaZile, dataISO, momentDinZiSiMinut, ziSaptamanii } from "@/lib/immy/fus-orar";

export const metadata: Metadata = {
  title: "Calendario",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ settimana?: string }> };

export default async function PaginaCalendar(props: Proprietati) {
  const { settimana } = await props.searchParams;
  const s = await setari();

  const azi = dataISO(s.fusOrar, new Date());
  const ancora = settimana && /^\d{4}-\d{2}-\d{2}$/.test(settimana) ? settimana : azi;

  // Luni ca prima zi: `ziSaptamanii` întoarce 0 pentru duminică, deci duminica
  // aparține săptămânii care tocmai s-a încheiat, nu celei care începe.
  const dow = ziSaptamanii(ancora);
  const luni = adaugaZile(ancora, dow === 0 ? -6 : 1 - dow);
  const zile = Array.from({ length: 7 }, (_, i) => adaugaZile(luni, i));

  const programari = await programariInterval(
    momentDinZiSiMinut(s.fusOrar, luni, 0),
    momentDinZiSiMinut(s.fusOrar, adaugaZile(luni, 7), 0),
  );

  const format = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

  return (
    <>
      <AntetPagina
        titlu="Calendario"
        descriere={`Settimana del ${format.format(new Date(`${luni}T12:00:00Z`))}`}
        actiuni={
          <div className="flex gap-2">
            <Link
              href={`/operatore/calendario?settimana=${adaugaZile(luni, -7)}`}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              ← Precedente
            </Link>
            <Link
              href="/operatore/calendario"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              Oggi
            </Link>
            <Link
              href={`/operatore/calendario?settimana=${adaugaZile(luni, 7)}`}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              Successiva →
            </Link>
          </div>
        }
      />

      <div className="px-5 py-6 lg:px-8">
        <CalendarSaptamanal
          programari={programari}
          zile={zile}
          fus={s.fusOrar}
          bazaLegatura="/operatore/appuntamenti"
        />
      </div>
    </>
  );
}
