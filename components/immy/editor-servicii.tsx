"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select, Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import { salveazaServiciul, type StareAdmin } from "@/app/(portale)/admin/actiuni";
import type { Categorie } from "@/lib/immy/dal/catalog";

const INITIALA: StareAdmin = { ok: false };

export type ServiciuAdmin = {
  id: string;
  slug: string;
  nume: string;
  descriereScurta: string;
  descriere: string;
  cuvinteCheie: string;
  durataMinute: number;
  pretCenti: number | null;
  status: string;
  rezervabilOnline: boolean;
  cereDocumente: boolean;
  ordine: number;
  categoryId: string;
  operatori: string[];
};

type Operator = { id: string; nume: string };

const ETICHETE_STATUS: Record<string, string> = {
  ACTIVE: "Attivo",
  INACTIVE: "Non attivo",
  DRAFT: "Bozza",
  ARCHIVED: "Archiviato",
};

/**
 * Editorul catalogului (§8).
 *
 * Un singur formular, refolosit pentru creare și pentru editare: `key` îl
 * remontează la schimbarea serviciului selectat, ca valorile implicite să se
 * reîncarce. Fără `key`, React ar păstra ce era în câmpuri și administratorul
 * ar edita un serviciu cu datele altuia sub ochi.
 */
export function EditorServicii({
  servicii,
  categorii,
  operatori,
}: {
  servicii: ServiciuAdmin[];
  categorii: Categorie[];
  operatori: Operator[];
}) {
  const [selectat, setSelectat] = useState<ServiciuAdmin | null>(null);
  const [nou, setNou] = useState(false);

  const editez = nou || selectat !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Catalogo ({servicii.length})</h2>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              setSelectat(null);
              setNou(true);
            }}
          >
            Nuovo servizio
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {servicii.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setNou(false);
                  setSelectat(s);
                }}
                aria-pressed={selectat?.id === s.id}
                className={
                  selectat?.id === s.id
                    ? "w-full rounded-xl border-2 border-primary bg-tint p-4 text-left"
                    : "w-full rounded-xl border border-border bg-surface p-4 text-left hover:border-primary"
                }
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{s.nume}</span>
                  <span className="text-xs text-muted-foreground">
                    {ETICHETE_STATUS[s.status] ?? s.status} · {s.durataMinute} min
                  </span>
                </span>
                <span className="mt-1 block font-mono text-xs text-muted-foreground">{s.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {editez ? (
          <FormularServiciu
            key={selectat?.id ?? "nou"}
            serviciu={selectat}
            categorii={categorii}
            operatori={operatori}
            onInchide={() => {
              setSelectat(null);
              setNou(false);
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Scegli un servizio dalla lista per modificarlo, oppure creane uno nuovo.
          </p>
        )}
      </div>
    </div>
  );
}

function FormularServiciu({
  serviciu,
  categorii,
  operatori,
  onInchide,
}: {
  serviciu: ServiciuAdmin | null;
  categorii: Categorie[];
  operatori: Operator[];
  onInchide: () => void;
}) {
  const [stare, actiune, aster] = useActionState(salveazaServiciul, INITIALA);

  return (
    <form action={actiune} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      {serviciu ? <input type="hidden" name="id" value={serviciu.id} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">
          {serviciu ? "Modifica servizio" : "Nuovo servizio"}
        </h2>
        <button
          type="button"
          onClick={onInchide}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Chiudi
        </button>
      </div>

      <Camp id="nume" eticheta="Nome" eroare={stare.campuri?.nume} obligatoriu>
        <Input name="nume" required defaultValue={serviciu?.nume ?? ""} maxLength={160} />
      </Camp>

      <Camp
        id="slug"
        eticheta="Slug"
        indiciu="Compare nell'indirizzo: /servizi/questo-slug. Solo minuscole, numeri e trattini."
        eroare={stare.campuri?.slug}
        obligatoriu
      >
        <Input name="slug" required defaultValue={serviciu?.slug ?? ""} maxLength={80} />
      </Camp>

      <Camp id="categoryId" eticheta="Categoria" eroare={stare.campuri?.categoryId} obligatoriu>
        <Select name="categoryId" required defaultValue={serviciu?.categoryId ?? categorii[0]?.id}>
          {categorii.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nume}
            </option>
          ))}
        </Select>
      </Camp>

      <Camp id="descriereScurta" eticheta="Descrizione breve" eroare={stare.campuri?.descriereScurta}>
        <Textarea name="descriereScurta" rows={2} maxLength={300} defaultValue={serviciu?.descriereScurta ?? ""} />
      </Camp>

      <Camp id="descriere" eticheta="Descrizione completa" eroare={stare.campuri?.descriere}>
        <Textarea name="descriere" rows={4} maxLength={5000} defaultValue={serviciu?.descriere ?? ""} />
      </Camp>

      <Camp
        id="cuvinteCheie"
        eticheta="Parole chiave"
        indiciu="Separate da virgola. Servono alla ricerca: aggiungi i modi in cui i clienti chiamano davvero questo servizio."
      >
        <Input name="cuvinteCheie" defaultValue={serviciu?.cuvinteCheie ?? ""} maxLength={500} />
      </Camp>

      <div className="grid gap-4 sm:grid-cols-3">
        <Camp id="durataMinute" eticheta="Durata (min)" eroare={stare.campuri?.durataMinute} obligatoriu>
          <Input
            name="durataMinute"
            type="number"
            min={5}
            max={480}
            step={5}
            required
            defaultValue={serviciu?.durataMinute ?? 30}
          />
        </Camp>

        <Camp
          id="pretEuro"
          eticheta="Prezzo (€)"
          indiciu="Vuoto = da valutare"
          eroare={stare.campuri?.pretEuro}
        >
          <Input
            name="pretEuro"
            inputMode="decimal"
            defaultValue={serviciu?.pretCenti !== null && serviciu?.pretCenti !== undefined ? (serviciu.pretCenti / 100).toFixed(2) : ""}
          />
        </Camp>

        <Camp id="ordine" eticheta="Ordine">
          <Input name="ordine" type="number" min={0} max={9999} defaultValue={serviciu?.ordine ?? 0} />
        </Camp>
      </div>

      <Camp id="status" eticheta="Stato" obligatoriu>
        <Select name="status" defaultValue={serviciu?.status ?? "DRAFT"}>
          {Object.entries(ETICHETE_STATUS).map(([v, e]) => (
            <option key={v} value={v}>
              {e}
            </option>
          ))}
        </Select>
      </Camp>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Operatori che offrono il servizio</legend>
        <div className="space-y-2">
          {operatori.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="operatori"
                value={o.id}
                defaultChecked={serviciu?.operatori.includes(o.id) ?? false}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {o.nume}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Senza almeno un operatore il servizio non è prenotabile: nel calendario non
          comparirebbe nessun orario.
        </p>
      </fieldset>

      <div className="space-y-2 rounded-lg bg-surface-muted/50 p-4">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="rezervabilOnline"
            defaultChecked={serviciu?.rezervabilOnline ?? true}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Prenotabile online
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="cereDocumente"
            defaultChecked={serviciu?.cereDocumente ?? false}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Richiede documenti
        </label>
      </div>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}

      <Button type="submit" disabled={aster} className="w-full rounded-full">
        {aster ? "Salvataggio…" : "Salva il servizio"}
      </Button>
    </form>
  );
}
