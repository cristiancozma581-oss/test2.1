import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDosarBadge } from "@/components/immy/stari";
import { dosarePersonal } from "@/lib/immy/dal/dosare";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Pratiche",
  robots: { index: false, follow: false },
};

export default async function PaginaDosareOperator() {
  const [dosare, s] = await Promise.all([dosarePersonal(), setari()]);

  const active = dosare.filter((d) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(d.status));
  const inchise = dosare.filter((d) => !active.includes(d));

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const azi = new Date();

  function Rand({ d }: { d: (typeof dosare)[number] }) {
    // Termenul depășit se marchează vizibil: un dosar în întârziere trebuie să
    // sară în ochi din listă, nu doar când îl deschizi.
    const intarziat =
      d.termen && new Date(d.termen) < azi && !["COMPLETED", "CLOSED"].includes(d.status);

    return (
      <li>
        <Link
          href={`/operatore/pratiche/${d.id}`}
          className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{d.titlu}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {d.client?.nume ?? d.client?.email} · {d.serviciu?.nume}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{d.referinta}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusDosarBadge status={d.status} />
              {d.termen ? (
                <span
                  className={
                    intarziat
                      ? "text-xs font-semibold text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {intarziat ? "In ritardo: " : "Scadenza: "}
                  {format.format(new Date(d.termen))}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <>
      <AntetPagina
        titlu="Pratiche"
        descriere="Le pratiche che segui, con scadenze e stato di avanzamento."
      />

      <div className="space-y-8 px-5 py-6 lg:px-8">
        {dosare.length === 0 ? (
          <StareGoala
            titlu="Nessuna pratica assegnata"
            descriere="Le pratiche che apri o che ti vengono assegnate compaiono qui."
          />
        ) : null}

        {active.length > 0 ? (
          <section>
            <h2 className="font-serif text-lg font-semibold">Aperte ({active.length})</h2>
            <ul className="mt-3 space-y-2.5">
              {active.map((d) => (
                <Rand key={d.id} d={d} />
              ))}
            </ul>
          </section>
        ) : null}

        {inchise.length > 0 ? (
          <section>
            <h2 className="font-serif text-lg font-semibold">Chiuse ({inchise.length})</h2>
            <ul className="mt-3 space-y-2.5 opacity-70">
              {inchise.map((d) => (
                <Rand key={d.id} d={d} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
