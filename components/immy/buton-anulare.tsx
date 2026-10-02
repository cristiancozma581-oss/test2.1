"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import { anuleazaProgramarea, type StareActiune } from "@/app/(portale)/area-cliente/actiuni";

const INITIALA: StareActiune = { ok: false };

/**
 * Anularea unei programări (§19).
 *
 * Cere o confirmare explicită înainte de a trimite: anularea eliberează slotul
 * imediat și nu se poate întoarce (§14 nu are tranziție din CANCELLED), deci un
 * clic greșit ar costa un drum până la birou.
 */
export function ButonAnulare({ appointmentId }: { appointmentId: string }) {
  const [confirma, setConfirma] = useState(false);
  const [stare, actiune, aster] = useActionState(anuleazaProgramarea, INITIALA);

  if (stare.ok && stare.mesaj) return <Anunt ton="succes">{stare.mesaj}</Anunt>;

  if (!confirma) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setConfirma(true)}>
          Annulla appuntamento
        </Button>
        {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      </div>
    );
  }

  return (
    <form action={actiune} className="space-y-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />

      <p className="text-sm font-medium">
        Vuoi davvero annullare? L&apos;orario tornerà disponibile per un&apos;altra persona.
      </p>

      <Textarea
        name="motiv"
        rows={2}
        maxLength={500}
        placeholder="Motivo (facoltativo) — ci aiuta a migliorare il servizio"
        aria-label="Motivo dell'annullamento"
      />

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={aster} className="rounded-full">
          {aster ? "Annullamento…" : "Sì, annulla"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setConfirma(false)}
        >
          No, mantieni
        </Button>
      </div>
    </form>
  );
}
