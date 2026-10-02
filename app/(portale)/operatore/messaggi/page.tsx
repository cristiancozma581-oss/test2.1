import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { firuriPersonal } from "@/lib/immy/dal/mesaje";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Messaggi",
  robots: { index: false, follow: false },
};

export default async function PaginaMesajeOperator() {
  const [firuri, s] = await Promise.all([firuriPersonal(), setari()]);

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina titlu="Messaggi" descriere="Le conversazioni con i clienti che segui." />

      <div className="px-5 py-6 lg:px-8">
        {firuri.length === 0 ? (
          <StareGoala
            titlu="Nessuna conversazione"
            descriere="Quando un cliente scrive, la conversazione compare qui."
          />
        ) : (
          <ul className="space-y-2.5">
            {firuri.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/operatore/messaggi/${f.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
                >
                  <span>
                    <span className="block font-medium">{f.subiect}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {f.client?.nume ?? f.client?.email}
                      {f.dosar ? ` · ${f.dosar}` : null}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.format(new Date(f.ultimulMesaj))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
