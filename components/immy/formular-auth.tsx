"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select } from "@/components/ui/input";
import { Anunt } from "./stari";
import {
  autentifica,
  cereResetare,
  inregistreaza,
  schimbaParola,
  type StareAuth,
} from "@/app/(auth)/actiuni";

const INITIALA: StareAuth = { ok: false };

export function FormularLogin() {
  const [stare, actiune, aster] = useActionState(autentifica, INITIALA);

  return (
    <form action={actiune} className="space-y-4">
      <Camp id="email" eticheta="Email" eroare={stare.campuri?.email} obligatoriu>
        <Input name="email" type="email" required autoComplete="email" autoFocus />
      </Camp>

      <Camp id="parola" eticheta="Password" eroare={stare.campuri?.parola} obligatoriu>
        <Input name="parola" type="password" required autoComplete="current-password" />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="lg" disabled={aster} className="w-full rounded-full">
        {aster ? "Accesso in corso…" : "Accedi"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/recupera" className="font-medium text-primary-deep hover:underline">
          Password dimenticata?
        </Link>
      </p>
    </form>
  );
}

export function FormularInregistrare() {
  const [stare, actiune, aster] = useActionState(inregistreaza, INITIALA);

  if (stare.ok && stare.mesaj) {
    return <Anunt ton="succes">{stare.mesaj}</Anunt>;
  }

  return (
    <form action={actiune} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Camp id="nume" eticheta="Nome" eroare={stare.campuri?.nume} obligatoriu>
          <Input name="nume" required autoComplete="given-name" autoFocus />
        </Camp>
        <Camp id="prenume" eticheta="Cognome" eroare={stare.campuri?.prenume} obligatoriu>
          <Input name="prenume" required autoComplete="family-name" />
        </Camp>
      </div>

      <Camp id="email" eticheta="Email" eroare={stare.campuri?.email} obligatoriu>
        <Input name="email" type="email" required autoComplete="email" />
      </Camp>

      <Camp id="telefon" eticheta="Telefono" eroare={stare.campuri?.telefon} obligatoriu>
        <Input name="telefon" type="tel" required autoComplete="tel" />
      </Camp>

      <Camp
        id="parola"
        eticheta="Password"
        indiciu="Almeno 10 caratteri, con una lettera e un numero."
        eroare={stare.campuri?.parola}
        obligatoriu
      >
        <Input name="parola" type="password" required autoComplete="new-password" minLength={10} />
      </Camp>

      <Camp id="limba" eticheta="Lingua preferita">
        <Select name="limba" defaultValue="it">
          <option value="it">Italiano</option>
          <option value="ro">Română</option>
          <option value="en">English</option>
        </Select>
      </Camp>

      <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="gdpr"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            Ho letto l&apos;
            <Link href="/privacy" target="_blank" className="font-semibold text-primary-deep underline">
              informativa sulla privacy
            </Link>{" "}
            e accetto i{" "}
            <Link href="/termini" target="_blank" className="font-semibold text-primary-deep underline">
              termini di servizio
            </Link>
            .
          </span>
        </label>
        {stare.campuri?.gdpr ? (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
            {stare.campuri.gdpr}
          </p>
        ) : null}
      </div>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="lg" disabled={aster} className="w-full rounded-full">
        {aster ? "Creazione in corso…" : "Crea il mio account"}
      </Button>
    </form>
  );
}

export function FormularRecuperare() {
  const [stare, actiune, aster] = useActionState(cereResetare, INITIALA);

  if (stare.ok && stare.mesaj) {
    return <Anunt ton="succes">{stare.mesaj}</Anunt>;
  }

  return (
    <form action={actiune} className="space-y-4">
      <Camp id="email" eticheta="Email" eroare={stare.campuri?.email} obligatoriu>
        <Input name="email" type="email" required autoComplete="email" autoFocus />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="lg" disabled={aster} className="w-full rounded-full">
        {aster ? "Invio in corso…" : "Inviami il link"}
      </Button>
    </form>
  );
}

export function FormularParolaNoua() {
  const [stare, actiune, aster] = useActionState(schimbaParola, INITIALA);

  return (
    <form action={actiune} className="space-y-4">
      <Camp
        id="parola"
        eticheta="Nuova password"
        indiciu="Almeno 10 caratteri, con una lettera e un numero."
        eroare={stare.campuri?.parola}
        obligatoriu
      >
        <Input name="parola" type="password" required autoComplete="new-password" minLength={10} autoFocus />
      </Camp>

      <Camp id="confirmare" eticheta="Ripeti la password" eroare={stare.campuri?.confirmare} obligatoriu>
        <Input name="confirmare" type="password" required autoComplete="new-password" />
      </Camp>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="lg" disabled={aster} className="w-full rounded-full">
        {aster ? "Salvataggio…" : "Salva la nuova password"}
      </Button>
    </form>
  );
}
