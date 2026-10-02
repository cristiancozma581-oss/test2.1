import Link from "next/link";
import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { Button } from "@/components/ui/button";
import { marcheazaNotificarile } from "../actiuni";
import { notificarileMele } from "@/lib/immy/dal/notificari";
import { setari } from "@/lib/immy/dal/setari";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifiche",
  robots: { index: false, follow: false },
};

const TON = {
  info: "border-info/25 bg-info/8",
  success: "border-success/25 bg-success/8",
  warning: "border-warning/30 bg-warning/10",
  urgent: "border-destructive/30 bg-destructive/8",
} as const;

export default async function PaginaNotificari() {
  const [notificari, s] = await Promise.all([notificarileMele(100), setari()]);
  const necitite = notificari.filter((n) => !n.citita).length;

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AntetPagina
        titlu="Notifiche"
        descriere="Conferme, promemoria e aggiornamenti sulle tue pratiche."
        actiuni={
          necitite > 0 ? (
            <form action={marcheazaNotificarile}>
              <Button type="submit" variant="outline" size="sm" className="rounded-full">
                Segna tutte come lette
              </Button>
            </form>
          ) : undefined
        }
      />

      <div className="px-5 py-6 lg:px-8">
        {notificari.length === 0 ? (
          <StareGoala
            titlu="Nessuna notifica"
            descriere="Qui arrivano le conferme degli appuntamenti, i promemoria e gli aggiornamenti sulle pratiche."
          />
        ) : (
          <ul className="space-y-2.5">
            {notificari.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border p-4",
                  TON[n.severitate] ?? "border-border bg-surface",
                  n.citita ? "opacity-70" : undefined,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {!n.citita ? (
                        <span aria-label="Non letta" className="mr-2 text-primary">
                          ●
                        </span>
                      ) : null}
                      {n.titlu}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.corp}</p>
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="mt-2 inline-block text-sm font-semibold text-primary-deep hover:underline"
                      >
                        Apri
                      </Link>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format.format(new Date(n.creatLa))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
