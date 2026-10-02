"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Anunt } from "./stari";
import { schimbaStatusProgramare, type StareActiune } from "@/app/(portale)/operatore/actiuni";
import { statusuriProgramareUrmatoare } from "@/lib/immy/flux";
import { ETICHETE_PROGRAMARE, type StatusProgramare } from "@/lib/immy/tipuri";
import type { Rol } from "@/lib/immy/tipuri";

const INITIALA: StareActiune = { ok: false };

/**
 * Butoanele de status ale unei programări (§15, §72).
 *
 * Se afișează DOAR tranzițiile permise din starea curentă pentru rolul curent,
 * calculate cu aceeași funcție pe care serverul o folosește ca să refuze. Nu
 * există buton care să ducă la un refuz — și nici tranziție validă ascunsă.
 */
export function ActiuniProgramare({
  appointmentId,
  status,
  rol,
  caseId,
}: {
  appointmentId: string;
  status: StatusProgramare;
  rol: Rol;
  caseId?: string | null;
}) {
  const [stare, actiune, aster] = useActionState(schimbaStatusProgramare, INITIALA);
  const urmatoare = statusuriProgramareUrmatoare(status, rol);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {urmatoare.map((tinta) => (
          <form key={tinta} action={actiune}>
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <input type="hidden" name="status" value={tinta} />
            <Button
              type="submit"
              size="sm"
              variant={
                tinta === "CONFIRMED" ? "default" : tinta === "CANCELLED" ? "destructive" : "outline"
              }
              disabled={aster}
              className="rounded-full"
            >
              {tinta === "CONFIRMED"
                ? "Conferma"
                : tinta === "COMPLETED"
                  ? "Completa"
                  : tinta === "CANCELLED"
                    ? "Annulla"
                    : tinta === "NO_SHOW"
                      ? "Non presentato"
                      : ETICHETE_PROGRAMARE[tinta]}
            </Button>
          </form>
        ))}

        {caseId ? (
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href={`/operatore/pratiche/${caseId}`}>Apri la pratica</Link>
          </Button>
        ) : null}

        {urmatoare.length === 0 && !caseId ? (
          <p className="text-sm text-muted-foreground">Nessuna azione disponibile.</p>
        ) : null}
      </div>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}
    </div>
  );
}
