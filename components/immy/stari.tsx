import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ETICHETE_DOCUMENT,
  ETICHETE_DOSAR,
  ETICHETE_PROGRAMARE,
  type StatusDocument,
  type StatusDosar,
  type StatusProgramare,
} from "@/lib/immy/tipuri";

/**
 * Stările interfeței (§55) și insignele de status (§69).
 *
 * §55 cere ca fiecare funcție să aibă loading, success, error, empty și retry.
 * Componentele de aici sunt forma comună a acelor stări, ca ele să arate la fel
 * peste tot și să nu fie reinventate în fiecare pagină.
 */

// --- Insigne de status -------------------------------------------------------

const CULORI = {
  neutru: "bg-surface-muted text-muted-foreground border-border",
  info: "bg-info/12 text-info border-info/25",
  succes: "bg-success/12 text-success border-success/25",
  atentie: "bg-warning/15 text-warning border-warning/30",
  pericol: "bg-destructive/12 text-destructive border-destructive/25",
} as const;

type Ton = keyof typeof CULORI;

function Insigna({ ton, children }: { ton: Ton; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        CULORI[ton],
      )}
    >
      {children}
    </span>
  );
}

const TON_PROGRAMARE: Record<StatusProgramare, Ton> = {
  PENDING: "atentie",
  CONFIRMED: "succes",
  RESCHEDULED: "info",
  COMPLETED: "neutru",
  CANCELLED: "pericol",
  NO_SHOW: "pericol",
};

export function StatusProgramareBadge({ status }: { status: StatusProgramare }) {
  return <Insigna ton={TON_PROGRAMARE[status] ?? "neutru"}>{ETICHETE_PROGRAMARE[status]}</Insigna>;
}

const TON_DOSAR: Record<StatusDosar, Ton> = {
  NEW: "info",
  IN_PROGRESS: "info",
  WAITING_DOCUMENTS: "atentie",
  DOCUMENTS_RECEIVED: "info",
  UNDER_REVIEW: "info",
  READY: "succes",
  COMPLETED: "succes",
  CLOSED: "neutru",
  CANCELLED: "pericol",
};

export function StatusDosarBadge({ status }: { status: StatusDosar }) {
  return <Insigna ton={TON_DOSAR[status] ?? "neutru"}>{ETICHETE_DOSAR[status]}</Insigna>;
}

const TON_DOCUMENT: Record<StatusDocument, Ton> = {
  REQUESTED: "atentie",
  UPLOADED: "info",
  UNDER_REVIEW: "info",
  VERIFIED: "succes",
  REJECTED: "pericol",
  NEEDS_CORRECTION: "atentie",
};

export function StatusDocumentBadge({ status }: { status: StatusDocument }) {
  return <Insigna ton={TON_DOCUMENT[status] ?? "neutru"}>{ETICHETE_DOCUMENT[status]}</Insigna>;
}

// --- Stări de pagină ---------------------------------------------------------

/** Starea goală: spune ce lipsește ȘI ce se poate face în privința asta. */
export function StareGoala({
  titlu,
  descriere,
  actiune,
}: {
  titlu: string;
  descriere?: string;
  actiune?: { eticheta: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-6 py-12 text-center">
      <p className="font-serif text-lg">{titlu}</p>
      {descriere ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{descriere}</p>
      ) : null}
      {actiune ? (
        <Button asChild className="mt-5">
          <Link href={actiune.href}>{actiune.eticheta}</Link>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Starea de eroare, cu reîncercare (§55).
 *
 * Nu arată niciodată urma de execuție: utilizatorului îi spune ce s-a întâmplat
 * și ce poate face, iar detaliul tehnic rămâne în logurile serverului.
 */
export function StareEroare({
  titlu = "Qualcosa non ha funzionato",
  descriere = "Riprova tra qualche istante. Se il problema continua, chiamaci: 333 47 59 704.",
  reincearca,
}: {
  titlu?: string;
  descriere?: string;
  reincearca?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/8 px-6 py-8 text-center"
    >
      <p className="font-serif text-lg text-destructive">{titlu}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{descriere}</p>
      {reincearca ? <div className="mt-5">{reincearca}</div> : null}
    </div>
  );
}

/** Scheletul de încărcare, pentru `loading.tsx` și `Suspense`. */
export function Schelet({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}

export function ScheletLista({ randuri = 3 }: { randuri?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Caricamento in corso">
      <span className="doar-cititor-ecran">Caricamento in corso…</span>
      {Array.from({ length: randuri }).map((_, i) => (
        <Schelet key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

/** Mesaj de succes sau de eroare, sub un formular. */
export function Anunt({
  ton,
  children,
}: {
  ton: "succes" | "eroare" | "info";
  children: React.ReactNode;
}) {
  const stil =
    ton === "succes"
      ? "border-success/30 bg-success/10 text-success"
      : ton === "eroare"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-info/30 bg-info/10 text-info";

  return (
    <p
      role={ton === "eroare" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm font-medium", stil)}
    >
      {children}
    </p>
  );
}

/**
 * Bannerul care apare când Supabase nu este configurat.
 *
 * §55 cere stări explicite: fără el, un catalog gol ar arăta exact ca un birou
 * fără servicii, iar cine instalează platforma n-ar ști ce-i lipsește.
 */
export function BannerNeconfigurat() {
  return (
    <div className="rounded-xl border border-warning/35 bg-warning/10 px-5 py-4">
      <p className="text-sm font-semibold text-warning">Integrazione non ancora configurata</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Il database non è collegato: catalogo e prenotazioni non sono disponibili. Chi gestisce
        il sito trova la procedura nel README, alla voce «Configurazione».
      </p>
    </div>
  );
}
