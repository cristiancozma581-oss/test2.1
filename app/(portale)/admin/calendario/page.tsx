import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { CalendarSaptamanal } from "@/components/immy/calendar";
import { programariInterval } from "@/lib/immy/dal/programari";
import { operatori } from "@/lib/immy/dal/catalog";
import { setari } from "@/lib/immy/dal/setari";
import { adaugaZile, dataISO, momentDinZiSiMinut, ziSaptamanii } from "@/lib/immy/fus-orar";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Calendario",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ settimana?: string; operatore?: string }> };

export default async function PaginaCalendarAdmin(props: Proprietati) {
  await cerutAdmin();
  const { settimana, operatore } = await props.searchParams;

  const [s, lista] = await Promise.all([setari(), operatori()]);

  const azi = dataISO(s.fusOrar, new Date());
  const ancora = settimana && /^\d{4}-\d{2}-\d{2}$/.test(settimana) ? settimana : azi;
  const dow = ziSaptamanii(ancora);
  const luni = adaugaZile(ancora, dow === 0 ? -6 : 1 - dow);
  const zile = Array.from({ length: 7 }, (_, i) => adaugaZile(luni, i));

  const programari = await programariInterval(
    momentDinZiSiMinut(s.fusOrar, luni, 0),
    momentDinZiSiMinut(s.fusOrar, adaugaZile(luni, 7), 0),
    { operatorId: operatore },
  );

  const format = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });
  const baza = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const val = { settimana: luni, operatore, ...extra };
    for (const [k, v] of Object.entries(val)) if (v) p.set(k, v);
    return `/admin/calendario?${p.toString()}`;
  };

  return (
    <>
      <AntetPagina
        titlu="Calendario"
        descriere={`Settimana del ${format.format(new Date(`${luni}T12:00:00Z`))}`}
        actiuni={
          <div className="flex flex-wrap gap-2">
            <Link
              href={baza({ settimana: adaugaZile(luni, -7) })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              ← Precedente
            </Link>
            <Link
              href={baza({ settimana: azi })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              Oggi
            </Link>
            <Link
              href={baza({ settimana: adaugaZile(luni, 7) })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              Successiva →
            </Link>
          </div>
        }
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per operatore">
          <Link
            href={baza({ operatore: undefined })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              !operatore
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary",
            )}
          >
            Tutti
          </Link>
          {lista.map((o) => (
            <Link
              key={o.id}
              href={baza({ operatore: o.id })}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold",
                operatore === o.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {o.nume}
            </Link>
          ))}
        </div>

        <CalendarSaptamanal
          programari={programari}
          zile={zile}
          fus={s.fusOrar}
          bazaLegatura="/admin/appuntamenti"
        />
      </div>
    </>
  );
}
