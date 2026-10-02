"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input } from "@/components/ui/input";
import { Anunt } from "./stari";
import { salveazaOperatorul, type StareAdmin } from "@/app/(portale)/admin/actiuni";

const INITIALA: StareAdmin = { ok: false };

type OperatorAdmin = {
  id: string;
  numeAfisat: string;
  slug: string;
  titlu: string;
  culoare: string;
  email: string;
  telefon: string;
  activ: boolean;
  servicii: string[];
};

export function EditorOperatori({
  operatori,
  servicii,
}: {
  operatori: OperatorAdmin[];
  servicii: { id: string; nume: string }[];
}) {
  const [selectat, setSelectat] = useState<OperatorAdmin | null>(null);
  const [nou, setNou] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Operatori ({operatori.length})</h2>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              setSelectat(null);
              setNou(true);
            }}
          >
            Nuovo operatore
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {operatori.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setNou(false);
                  setSelectat(o);
                }}
                aria-pressed={selectat?.id === o.id}
                className={
                  selectat?.id === o.id
                    ? "flex w-full items-center gap-3 rounded-xl border-2 border-primary bg-tint p-4 text-left"
                    : "flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary"
                }
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif font-semibold text-white"
                  style={{ backgroundColor: o.culoare }}
                >
                  {o.numeAfisat.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{o.numeAfisat}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.servicii.length} servizi
                    {!o.activ ? " · non attivo" : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {nou || selectat ? (
          <FormularOperator
            key={selectat?.id ?? "nou"}
            operator={selectat}
            servicii={servicii}
            onInchide={() => {
              setSelectat(null);
              setNou(false);
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Scegli un operatore per modificarlo, oppure creane uno nuovo.
          </p>
        )}
      </div>
    </div>
  );
}

function FormularOperator({
  operator,
  servicii,
  onInchide,
}: {
  operator: OperatorAdmin | null;
  servicii: { id: string; nume: string }[];
  onInchide: () => void;
}) {
  const [stare, actiune, aster] = useActionState(salveazaOperatorul, INITIALA);

  return (
    <form action={actiune} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      {operator ? <input type="hidden" name="id" value={operator.id} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">
          {operator ? "Modifica operatore" : "Nuovo operatore"}
        </h2>
        <button
          type="button"
          onClick={onInchide}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Chiudi
        </button>
      </div>

      <Camp id="numeAfisat" eticheta="Nome" eroare={stare.campuri?.numeAfisat} obligatoriu>
        <Input name="numeAfisat" required defaultValue={operator?.numeAfisat ?? ""} maxLength={80} />
      </Camp>

      <Camp id="slug-operator" eticheta="Slug" eroare={stare.campuri?.slug} obligatoriu>
        <Input name="slug" required defaultValue={operator?.slug ?? ""} maxLength={80} />
      </Camp>

      <Camp id="titlu" eticheta="Ruolo" indiciu="Compare sul sito, sotto il nome.">
        <Input name="titlu" defaultValue={operator?.titlu ?? ""} maxLength={160} />
      </Camp>

      <div className="grid gap-4 sm:grid-cols-2">
        <Camp id="email-operator" eticheta="Email" eroare={stare.campuri?.email}>
          <Input name="email" type="email" defaultValue={operator?.email ?? ""} />
        </Camp>
        <Camp id="telefon-operator" eticheta="Telefono" eroare={stare.campuri?.telefon}>
          <Input name="telefon" type="tel" defaultValue={operator?.telefon ?? ""} />
        </Camp>
      </div>

      <Camp
        id="culoare"
        eticheta="Colore nel calendario"
        indiciu="Serve a distinguere gli appuntamenti a colpo d'occhio."
      >
        <Input
          name="culoare"
          type="color"
          defaultValue={operator?.culoare ?? "#00b34a"}
          className="h-11 w-24 p-1"
        />
      </Camp>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Servizi offerti</legend>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {servicii.map((s) => (
            <label key={s.id} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="servicii"
                value={s.id}
                defaultChecked={operator?.servicii.includes(s.id) ?? false}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {s.nume}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2.5 rounded-lg bg-surface-muted/50 p-4 text-sm">
        <input
          type="checkbox"
          name="activ"
          defaultChecked={operator?.activ ?? true}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Operatore attivo
      </label>
      <p className="text-xs text-muted-foreground">
        Disattivando un operatore sparisce dal calendario pubblico, ma i suoi appuntamenti e le
        sue pratiche restano intatti.
      </p>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}

      <Button type="submit" disabled={aster} className="w-full rounded-full">
        {aster ? "Salvataggio…" : "Salva l'operatore"}
      </Button>
    </form>
  );
}
