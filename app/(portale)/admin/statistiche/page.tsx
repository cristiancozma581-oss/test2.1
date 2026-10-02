import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { Button } from "@/components/ui/button";
import { GraficBare } from "@/components/immy/grafic";
import {
  incarcareOperatori,
  kpi,
  programariPeZi,
  serviciiPopulare,
} from "@/lib/immy/dal/statistici";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";
import { adaugaZile, dataISO } from "@/lib/immy/fus-orar";

export const metadata: Metadata = {
  title: "Statistiche",
  robots: { index: false, follow: false },
};

export default async function PaginaStatistici() {
  await cerutAdmin();

  const [indicatori, peZi, populare, operatori, s] = await Promise.all([
    kpi(),
    programariPeZi(30),
    serviciiPopulare(8),
    incarcareOperatori(),
    setari(),
  ]);

  const azi = dataISO(s.fusOrar, new Date());
  const total = peZi.reduce((a, z) => a + z.total, 0);
  const anulate = peZi.reduce((a, z) => a + z.anulate, 0);
  const rataAnulare = total > 0 ? Math.round((anulate / total) * 100) : 0;

  return (
    <>
      <AntetPagina
        titlu="Statistiche"
        descriere="Ultimi 30 giorni."
        actiuni={
          <Button asChild variant="outline" className="rounded-full">
            <a href={`/api/rapporto?dal=${adaugaZile(azi, -30)}&al=${azi}`} download>
              Esporta CSV
            </a>
          </Button>
        }
      />

      <div className="space-y-7 px-5 py-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="font-serif text-3xl font-semibold">{total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Appuntamenti (30 giorni)</p>
          </li>
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="font-serif text-3xl font-semibold">{rataAnulare}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Tasso di annullamento</p>
          </li>
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="font-serif text-3xl font-semibold">{indicatori?.clientiNoi ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Clienti nuovi (mese)</p>
          </li>
          <li className="rounded-xl border border-border bg-surface p-4">
            <p className="font-serif text-3xl font-semibold">
              {indicatori?.neprezentariLunaAceasta ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mancate presenze (mese)</p>
          </li>
        </ul>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-serif text-lg font-semibold">Appuntamenti per giorno</h2>
          <div className="mt-5">
            <GraficBare
              date={peZi.map((z) => ({
                eticheta: z.zi.slice(8) + "/" + z.zi.slice(5, 7),
                valoare: z.total,
                secundar: z.anulate,
              }))}
              etichetaPrimar="Totale"
              etichetaSecundar="Annullati"
            />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold">Servizi più richiesti</h2>
            {populare.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Non ci sono ancora dati.</p>
            ) : (
              <ol className="mt-4 space-y-2.5">
                {populare.map((p, i) => (
                  <li key={p.nume} className="flex items-center gap-3 text-sm">
                    <span className="w-5 shrink-0 font-serif text-lg font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.nume}</span>
                    <span className="shrink-0 font-semibold">{p.total}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold">Carico per operatore (30 giorni)</h2>
            {operatori.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Non ci sono ancora dati.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {operatori.map((o) => (
                  <li key={o.nume}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: o.culoare }}
                        />
                        {o.nume}
                      </span>
                      <span className="font-semibold">
                        {o.total}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {o.finalizate} completati
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: o.culoare,
                          width: `${Math.round((o.total / Math.max(...operatori.map((x) => x.total))) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
