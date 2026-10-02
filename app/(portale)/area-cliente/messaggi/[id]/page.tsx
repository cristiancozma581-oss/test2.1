import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { FormularRaspuns } from "@/components/immy/mesaje-client";
import { fir } from "@/lib/immy/dal/mesaje";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Conversazione",
  robots: { index: false, follow: false },
};

type Proprietati = { params: Promise<{ id: string }> };

export default async function PaginaFir(props: Proprietati) {
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
        descriere={f.dosar ? `Pratica: ${f.dosar}` : undefined}
        actiuni={
          <Link
            href="/area-cliente/messaggi"
            className="text-sm font-medium text-muted-foreground hover:text-primary-deep"
          >
            ← Tutte le conversazioni
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-8">
        <ol className="space-y-4">
          {f.mesaje.map((m) => {
            const eAlMeu = m.expeditorRol === "CLIENT";
            return (
              <li key={m.id} className={eAlMeu ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    eAlMeu
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm">{m.corp}</p>
                  <p
                    className={
                      eAlMeu ? "mt-1.5 text-[11px] text-white/70" : "mt-1.5 text-[11px] text-muted-foreground"
                    }
                  >
                    {eAlMeu ? "Tu" : (m.expeditorNume ?? "IMMY & EMY")} ·{" "}
                    {format.format(new Date(m.creatLa))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {f.inchis ? (
          <p className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
            Questa conversazione è chiusa. Per un nuovo argomento aprine una nuova.
          </p>
        ) : (
          <div className="mt-6">
            <FormularRaspuns threadId={f.id} />
          </div>
        )}
      </div>
    </>
  );
}
