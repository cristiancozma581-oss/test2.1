"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select, Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import {
  cereUnDocument,
  schimbaStatusulDosarului,
  verificaUnDocument,
  type StareActiune,
} from "@/app/(portale)/operatore/actiuni";
import { statusuriDocumentUrmatoare, statusuriDosarUrmatoare } from "@/lib/immy/flux";
import {
  ETICHETE_DOCUMENT,
  ETICHETE_DOSAR,
  type Rol,
  type StatusDocument,
  type StatusDosar,
} from "@/lib/immy/tipuri";

const INITIALA: StareActiune = { ok: false };

/**
 * Schimbarea statusului unui dosar (§72).
 *
 * Ca și la programări, lista de destinații vine din aceeași mașină de stare pe
 * care o consultă serverul: interfața nu poate oferi o tranziție pe care baza
 * ar refuza-o.
 */
export function SchimbaStatusDosar({
  caseId,
  status,
  rol,
}: {
  caseId: string;
  status: StatusDosar;
  rol: Rol;
}) {
  const [stare, actiune, aster] = useActionState(schimbaStatusulDosarului, INITIALA);
  const urmatoare = statusuriDosarUrmatoare(status, rol);

  if (urmatoare.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Questa pratica è in uno stato finale: non ci sono altri passaggi.
      </p>
    );
  }

  return (
    <form action={actiune} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Camp id="status-dosar" eticheta="Nuovo stato">
          <Select name="status" defaultValue={urmatoare[0]}>
            {urmatoare.map((u) => (
              <option key={u} value={u}>
                {ETICHETE_DOSAR[u]}
              </option>
            ))}
          </Select>
        </Camp>
        <Button type="submit" disabled={aster} className="rounded-full">
          {aster ? "Salvo…" : "Aggiorna"}
        </Button>
      </div>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}
    </form>
  );
}

export function CereDocument({ caseId }: { caseId: string }) {
  const [stare, actiune, aster] = useActionState(cereUnDocument, INITIALA);

  if (stare.ok && stare.mesaj) return <Anunt ton="succes">{stare.mesaj}</Anunt>;

  return (
    <form action={actiune} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />

      <Camp id="eticheta" eticheta="Documento" eroare={stare.campuri?.eticheta} obligatoriu>
        <Input name="eticheta" required maxLength={200} placeholder="Es. Passaporto in corso di validità" />
      </Camp>

      <Camp
        id="observatie"
        eticheta="Nota per il cliente"
        indiciu="Spiega che cosa serve esattamente: fa risparmiare un giro a entrambi."
      >
        <Textarea name="observatie" rows={2} maxLength={500} />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="sm" disabled={aster} className="rounded-full">
        {aster ? "Invio…" : "Chiedi il documento"}
      </Button>
    </form>
  );
}

export function VerificaDocument({
  documentId,
  status,
  rol,
}: {
  documentId: string;
  status: StatusDocument;
  rol: Rol;
}) {
  const [stare, actiune, aster] = useActionState(verificaUnDocument, INITIALA);

  // Doar destinațiile pe care le poate cere personalul: `UPLOADED` este starea
  // în care ajunge documentul când clientul îl încarcă, nu una de verificare.
  const urmatoare = statusuriDocumentUrmatoare(status, rol).filter((u) => u !== "UPLOADED");

  if (urmatoare.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna verifica disponibile.</p>;
  }

  return (
    <form action={actiune} className="space-y-3">
      <input type="hidden" name="documentId" value={documentId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Camp id={`stato-${documentId}`} eticheta="Esito della verifica">
          <Select name="status" defaultValue={urmatoare[0]}>
            {urmatoare.map((u) => (
              <option key={u} value={u}>
                {ETICHETE_DOCUMENT[u]}
              </option>
            ))}
          </Select>
        </Camp>
        <Button type="submit" size="sm" disabled={aster} className="rounded-full">
          {aster ? "Salvo…" : "Registra"}
        </Button>
      </div>

      <Camp
        id={`nota-${documentId}`}
        eticheta="Nota"
        indiciu="Se chiedi una correzione, scrivi qui che cosa non va: il cliente la legge nella sua area."
      >
        <Textarea name="observatie" rows={2} maxLength={1000} />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}
    </form>
  );
}
