"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import { salveazaFaq, stergeFaq, type StareAdmin } from "@/app/(portale)/admin/actiuni";

const INITIALA: StareAdmin = { ok: false };

type Faq = {
  id: string;
  intrebare: string;
  raspuns: string;
  ordine: number;
  activa: boolean;
};

export function EditorFaq({ intrebari }: { intrebari: Faq[] }) {
  const [selectata, setSelectata] = useState<Faq | null>(null);
  const [nou, setNou] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Domande ({intrebari.length})</h2>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              setSelectata(null);
              setNou(true);
            }}
          >
            Nuova domanda
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {intrebari.map((f) => (
            <li key={f.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNou(false);
                    setSelectata(f);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block font-medium">{f.intrebare}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Ordine {f.ordine}
                    {!f.activa ? " · nascosta" : null}
                  </span>
                </button>
                <form action={stergeFaq}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs font-medium text-destructive hover:underline"
                  >
                    Elimina
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {nou || selectata ? (
          <FormularFaq
            key={selectata?.id ?? "nou"}
            faq={selectata}
            onInchide={() => {
              setSelectata(null);
              setNou(false);
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Scegli una domanda per modificarla, oppure creane una nuova.
          </p>
        )}
      </div>
    </div>
  );
}

function FormularFaq({ faq, onInchide }: { faq: Faq | null; onInchide: () => void }) {
  const [stare, actiune, aster] = useActionState(salveazaFaq, INITIALA);

  return (
    <form action={actiune} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">
          {faq ? "Modifica domanda" : "Nuova domanda"}
        </h2>
        <button
          type="button"
          onClick={onInchide}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Chiudi
        </button>
      </div>

      <Camp id="intrebare" eticheta="Domanda" eroare={stare.campuri?.intrebare} obligatoriu>
        <Input name="intrebare" required defaultValue={faq?.intrebare ?? ""} maxLength={300} />
      </Camp>

      <Camp
        id="raspuns"
        eticheta="Risposta"
        indiciu="Scrivi come parleresti allo sportello: frasi brevi, niente gergo."
        eroare={stare.campuri?.raspuns}
        obligatoriu
      >
        <Textarea name="raspuns" required rows={6} maxLength={5000} defaultValue={faq?.raspuns ?? ""} />
      </Camp>

      <Camp id="ordine-faq" eticheta="Ordine">
        <Input name="ordine" type="number" min={0} max={9999} defaultValue={faq?.ordine ?? 0} />
      </Camp>

      <label className="flex items-center gap-2.5 rounded-lg bg-surface-muted/50 p-4 text-sm">
        <input
          type="checkbox"
          name="activa"
          defaultChecked={faq?.activa ?? true}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Visibile sul sito
      </label>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}

      <Button type="submit" disabled={aster} className="w-full rounded-full">
        {aster ? "Salvataggio…" : "Salva"}
      </Button>
    </form>
  );
}
