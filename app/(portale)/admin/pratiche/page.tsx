import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala, StatusDosarBadge } from "@/components/immy/stari";
import { dosarePersonal } from "@/lib/immy/dal/dosare";
import { setari } from "@/lib/immy/dal/setari";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";

export const metadata: Metadata = {
  title: "Pratiche",
  robots: { index: false, follow: false },
};

export default async function PaginaDosareAdmin() {
  await cerutAdmin();
  const [dosare, s] = await Promise.all([dosarePersonal(), setari()]);

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const azi = new Date();

  return (
    <>
      <AntetPagina titlu="Pratiche" descriere={`${dosare.length} pratiche in archivio`} />

      <div className="px-5 py-6 lg:px-8">
        {dosare.length === 0 ? (
          <StareGoala
            titlu="Nessuna pratica"
            descriere="Le pratiche si aprono dal workspace operatore, a partire da un appuntamento."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Riferimento</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Pratica</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Operatore</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Scadenza</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {dosare.map((d) => {
                  const intarziat =
                    d.termen &&
                    new Date(d.termen) < azi &&
                    !["COMPLETED", "CLOSED", "CANCELLED"].includes(d.status);

                  return (
                    <tr key={d.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/operatore/pratiche/${d.id}`}
                          className="text-primary-deep hover:underline"
                        >
                          {d.referinta}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{d.titlu}</td>
                      <td className="px-4 py-3">{d.client?.nume ?? d.client?.email ?? "—"}</td>
                      <td className="px-4 py-3">{d.operator?.nume ?? "—"}</td>
                      <td
                        className={
                          intarziat
                            ? "whitespace-nowrap px-4 py-3 font-semibold text-destructive"
                            : "whitespace-nowrap px-4 py-3 text-muted-foreground"
                        }
                      >
                        {d.termen ? format.format(new Date(d.termen)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusDosarBadge status={d.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
