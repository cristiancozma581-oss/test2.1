import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDosarBadge } from "@/components/immy/stari";
import { dosareleMele } from "@/lib/immy/dal/dosare";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Le mie pratiche",
  robots: { index: false, follow: false },
};

export default async function PaginaDosare() {
  const [dosare, s] = await Promise.all([dosareleMele(), setari()]);

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <AntetPagina
        titlu="Le mie pratiche"
        descriere="Ogni pratica raccoglie documenti, messaggi e appuntamenti in un unico posto."
      />

      <div className="px-5 py-6 lg:px-8">
        {dosare.length === 0 ? (
          <StareGoala
            titlu="Nessuna pratica"
            descriere="Apriamo la pratica dopo il primo appuntamento. Da quel momento la segui da qui, passo per passo."
            actiune={{ eticheta: "Prenota un appuntamento", href: "/prenota" }}
          />
        ) : (
          <ul className="space-y-3">
            {dosare.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/area-cliente/pratiche/${d.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.titlu}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {d.serviciu?.nume}
                        {d.operator ? ` · con ${d.operator.nume}` : null}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{d.referinta}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusDosarBadge status={d.status} />
                      {d.termen ? (
                        <span className="text-xs text-muted-foreground">
                          Scadenza: {format.format(new Date(d.termen))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
