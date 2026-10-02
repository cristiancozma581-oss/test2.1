"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select } from "@/components/ui/input";
import { Anunt } from "./stari";
import { salveazaProfilul, type StareActiune } from "@/app/(portale)/actiuni-profil";

const INITIALA: StareActiune = { ok: false };

export function FormularProfil({
  numeComplet,
  telefon,
  limba,
  email,
}: {
  numeComplet: string | null;
  telefon: string | null;
  limba: string;
  email: string;
}) {
  const [stare, actiune, aster] = useActionState(salveazaProfilul, INITIALA);

  return (
    <form action={actiune} className="space-y-4">
      <Camp
        id="email-profil"
        eticheta="Email"
        indiciu="L'indirizzo email non si cambia da qui: scrivici e lo aggiorniamo insieme, verificando l'identità."
      >
        <Input value={email} disabled readOnly />
      </Camp>

      <Camp id="numeComplet" eticheta="Nome e cognome" eroare={stare.campuri?.numeComplet} obligatoriu>
        <Input name="numeComplet" defaultValue={numeComplet ?? ""} required maxLength={160} />
      </Camp>

      <Camp id="telefon" eticheta="Telefono" eroare={stare.campuri?.telefon} obligatoriu>
        <Input name="telefon" type="tel" defaultValue={telefon ?? ""} required />
      </Camp>

      <Camp id="limba" eticheta="Lingua preferita">
        <Select name="limba" defaultValue={limba}>
          <option value="it">Italiano</option>
          <option value="ro">Română</option>
          <option value="en">English</option>
        </Select>
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}

      <Button type="submit" disabled={aster} className="rounded-full">
        {aster ? "Salvataggio…" : "Salva le modifiche"}
      </Button>
    </form>
  );
}
