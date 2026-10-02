import Link from "next/link";
import { Marca } from "./marca";
import { MeniuPortal } from "./meniu-portal";
import type { Sesiune } from "@/lib/immy/dal/sesiune";

/**
 * Învelișul zonelor private (§32, §70).
 *
 * Bară laterală întunecată pe desktop, meniu pliabil pe mobil. Aceeași
 * structură pentru client, operator și administrator: se schimbă doar lista de
 * legături, primită ca argument, în funcție de ce are voie rolul să vadă.
 */

export type LegaturaPortal = {
  href: string;
  eticheta: string;
  insigna?: number;
};

export function InvelisPortal({
  sesiune,
  legaturi,
  titlu,
  children,
}: {
  sesiune: Sesiune;
  legaturi: LegaturaPortal[];
  titlu: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Bara laterală pe desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d1c14] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/" className="text-white">
            <Marca />
          </Link>
          <p className="mt-1 text-xs text-white/55">{titlu}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label={titlu}>
          <MeniuPortal legaturi={legaturi} />
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{sesiune.numeComplet ?? sesiune.email}</p>
          <p className="mt-0.5 text-xs text-white/55">{sesiune.email}</p>
          <form action="/auth/esci" method="post" className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              Esci
            </button>
          </form>
        </div>
      </aside>

      {/* Antet pe mobil */}
      <header className="border-b border-border bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <Marca />
          </Link>
          <form action="/auth/esci" method="post">
            <button type="submit" className="text-sm font-medium text-muted-foreground">
              Esci
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label={titlu}>
          <MeniuPortal legaturi={legaturi} orizontal />
        </nav>
      </header>

      <div className="min-w-0 flex-1 bg-background">{children}</div>
    </div>
  );
}

/** Antetul unei pagini din portal. */
export function AntetPagina({
  titlu,
  descriere,
  actiuni,
}: {
  titlu: string;
  descriere?: string;
  actiuni?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-6 lg:px-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold">{titlu}</h1>
        {descriere ? <p className="mt-1 text-sm text-muted-foreground">{descriere}</p> : null}
      </div>
      {actiuni ? <div className="flex flex-wrap gap-2">{actiuni}</div> : null}
    </div>
  );
}
