import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { FormularRaspunsOperator } from "@/components/immy/mesaje-operator";
import { fir } from "@/lib/immy/dal/mesaje";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Conversazione",
  robots: { index: false, follow: false },
};

type Proprietati = { params: Promise<{ id: string }> };

export default async function PaginaFirOperator(props: Proprietati) {
  const { id } = await props.params;
  const [f, s] = await Promise.all([fir(id), setari()]);

  if (!f) notFound();

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu={f.subiect}
        descriere={`${f.client?.nume ?? f.client?.email ?? ""}${f.dosar ? ` · ${f.dosar}` : ""}`}
        actiuni={
          <Link
            href="/operatore/messaggi"
            className="text-sm font-medium text-muted-foreground hover:text-primary-deep"
          >
            ← Tutte le conversazioni
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-8">
        <ol className="space-y-4">
          {f.mesaje.map((m) => {
            const eDeLaBirou = m.expeditorRol !== "CLIENT";
            return (
              <li key={m.id} className={eDeLaBirou ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    eDeLaBirou
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm">{m.corp}</p>
                  <p
                    className={
                      eDeLaBirou
                        ? "mt-1.5 text-[11px] text-white/70"
                        : "mt-1.5 text-[11px] text-muted-foreground"
                    }
                  >
                    {eDeLaBirou ? (m.expeditorNume ?? "Ufficio") : (f.client?.nume ?? "Cliente")} ·{" "}
                    {format.format(new Date(m.creatLa))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {f.inchis ? (
          <p className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
            Conversazione chiusa.
          </p>
        ) : (
          <div className="mt-6">
            <FormularRaspunsOperator threadId={f.id} />
          </div>
        )}
      </div>
    </>
  );
}
