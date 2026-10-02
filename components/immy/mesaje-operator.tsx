"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import { raspundeLaMesaj, type StareActiune } from "@/app/(portale)/operatore/actiuni";

const INITIALA: StareActiune = { ok: false };

export function FormularRaspunsOperator({ threadId }: { threadId: string }) {
  const [stare, actiune, aster] = useActionState(raspundeLaMesaj, INITIALA);
  const formularRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formularRef}
      action={async (date) => {
        await actiune(date);
        formularRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="threadId" value={threadId} />

      <Textarea
        name="corp"
        required
        rows={3}
        maxLength={5000}
        placeholder="Scrivi la risposta al cliente…"
        aria-label="La tua risposta"
      />

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" disabled={aster} className="rounded-full">
        {aster ? "Invio…" : "Invia"}
      </Button>
    </form>
  );
}
