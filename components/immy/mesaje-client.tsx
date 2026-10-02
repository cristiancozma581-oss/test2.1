"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import {
  deschideConversatie,
  scrieMesaj,
  type StareActiune,
} from "@/app/(portale)/area-cliente/actiuni";

const INITIALA: StareActiune = { ok: false };

export function FormularFirNou() {
  const [stare, actiune, aster] = useActionState(deschideConversatie, INITIALA);

  if (stare.ok && stare.mesaj) return <Anunt ton="succes">{stare.mesaj}</Anunt>;

  return (
    <form action={actiune} className="space-y-4">
      <Camp id="subiect" eticheta="Oggetto" obligatoriu>
        <Input name="subiect" required maxLength={200} placeholder="Es. Documenti per la cittadinanza" />
      </Camp>

      <Camp id="corp" eticheta="Messaggio" obligatoriu>
        <Textarea name="corp" required rows={5} maxLength={5000} />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" disabled={aster} className="rounded-full">
        {aster ? "Invio…" : "Invia il messaggio"}
      </Button>
    </form>
  );
}

export function FormularRaspuns({ threadId }: { threadId: string }) {
  const [stare, actiune, aster] = useActionState(scrieMesaj, INITIALA);
  const formularRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formularRef}
      action={async (date) => {
        await actiune(date);
        // Golim caseta după trimitere, ca următorul mesaj să nu înceapă cu
        // textul celui dinainte.
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
        placeholder="Scrivi la tua risposta…"
        aria-label="La tua risposta"
      />

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" disabled={aster} className="rounded-full">
        {aster ? "Invio…" : "Invia"}
      </Button>
    </form>
  );
}
