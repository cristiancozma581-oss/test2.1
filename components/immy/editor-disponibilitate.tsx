"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select } from "@/components/ui/input";
import { Anunt } from "./stari";
import {
  adaugaExceptie,
  adaugaRegulaProgram,
  stergeExceptie,
  stergeRegulaProgram,
  type StareAdmin,
} from "@/app/(portale)/admin/actiuni";

const INITIALA: StareAdmin = { ok: false };

/** 0 = duminică, ca în `Date.getDay()` și în `extract(dow)` din Postgres. */
const ZILE = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

const TIPURI_EXCEPTIE: Record<string, string> = {
  closed: "Chiusura",
  holiday: "Festività",
  leave: "Ferie",
  extra: "Apertura straordinaria",
};

type Operator = { id: string; nume: string };
type Regula = {
  id: string;
  ziuaSaptamanii: number;
  deLa: string;
  panaLa: string;
  tip: "work" | "break";
};
type Exceptie = {
  id: string;
  operatorId: string | null;
  deLa: string;
  panaLa: string;
  tip: string;
  oraDeLa: string | null;
  oraPanaLa: string | null;
  motiv: string | null;
};

export function EditorDisponibilitate({
  programe,
  exceptii,
  operatori,
}: {
  programe: { operator: Operator; reguli: Regula[] }[];
  exceptii: Exceptie[];
  operatori: Operator[];
}) {
  const [stareRegula, actiuneRegula, asterRegula] = useActionState(adaugaRegulaProgram, INITIALA);
  const [stareExceptie, actiuneExceptie, asterExceptie] = useActionState(adaugaExceptie, INITIALA);

  const format = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-9">
      {/* --- Programul săptămânal --- */}
      <section>
        <h2 className="font-serif text-lg font-semibold">Orario settimanale</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le pause si tolgono dagli orari di lavoro: nel calendario pubblico non compaiono.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {programe.map(({ operator, reguli }) => (
            <div key={operator.id} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold">{operator.nume}</h3>

              {reguli.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nessun orario impostato: questo operatore non è prenotabile.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {reguli.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{ZILE[r.ziuaSaptamanii]}</span>{" "}
                        {r.deLa}–{r.panaLa}
                        {r.tip === "break" ? (
                          <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                            pausa
                          </span>
                        ) : null}
                      </span>
                      <form action={stergeRegulaProgram}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-destructive hover:underline"
                          aria-label={`Elimina ${ZILE[r.ziuaSaptamanii]} ${r.deLa}–${r.panaLa}`}
                        >
                          Elimina
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <form
          action={actiuneRegula}
          className="mt-5 grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
        >
          <Camp id="operatorId-regula" eticheta="Operatore" obligatoriu>
            <Select name="operatorId" required>
              {operatori.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nume}
                </option>
              ))}
            </Select>
          </Camp>

          <Camp id="ziuaSaptamanii" eticheta="Giorno" obligatoriu>
            <Select name="ziuaSaptamanii" defaultValue="1">
              {ZILE.map((z, i) => (
                <option key={z} value={i}>
                  {z}
                </option>
              ))}
            </Select>
          </Camp>

          <Camp id="deLa" eticheta="Dalle" eroare={stareRegula.campuri?.deLa} obligatoriu>
            <Input name="deLa" type="time" required defaultValue="09:30" />
          </Camp>

          <Camp id="panaLa" eticheta="Alle" eroare={stareRegula.campuri?.panaLa} obligatoriu>
            <Input name="panaLa" type="time" required defaultValue="13:00" />
          </Camp>

          <Camp id="tip-regula" eticheta="Tipo">
            <Select name="tip" defaultValue="work">
              <option value="work">Lavoro</option>
              <option value="break">Pausa</option>
            </Select>
          </Camp>

          <Button type="submit" disabled={asterRegula} className="rounded-full">
            {asterRegula ? "Aggiungo…" : "Aggiungi"}
          </Button>

          {stareRegula.eroare ? (
            <div className="sm:col-span-2 lg:col-span-6">
              <Anunt ton="eroare">{stareRegula.eroare}</Anunt>
            </div>
          ) : null}
          {stareRegula.ok && stareRegula.mesaj ? (
            <div className="sm:col-span-2 lg:col-span-6">
              <Anunt ton="succes">{stareRegula.mesaj}</Anunt>
            </div>
          ) : null}
        </form>
      </section>

      {/* --- Excepții --- */}
      <section>
        <h2 className="font-serif text-lg font-semibold">Chiusure e aperture straordinarie</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lascia vuoto l&apos;operatore per chiudere tutto l&apos;ufficio.
        </p>

        {exceptii.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {exceptii.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{TIPURI_EXCEPTIE[e.tip] ?? e.tip}</span>
                  {" · "}
                  {format.format(new Date(`${e.deLa}T12:00:00Z`))}
                  {e.panaLa !== e.deLa ? ` → ${format.format(new Date(`${e.panaLa}T12:00:00Z`))}` : null}
                  {e.oraDeLa ? ` · ${e.oraDeLa.slice(0, 5)}–${e.oraPanaLa?.slice(0, 5)}` : null}
                  <span className="ml-2 text-muted-foreground">
                    {e.operatorId
                      ? (operatori.find((o) => o.id === e.operatorId)?.nume ?? "—")
                      : "tutto l'ufficio"}
                  </span>
                  {e.motiv ? <span className="ml-2 text-muted-foreground">— {e.motiv}</span> : null}
                </span>
                <form action={stergeExceptie}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                    Elimina
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            Nessuna chiusura in programma.
          </p>
        )}

        <form
          action={actiuneExceptie}
          className="mt-5 grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Camp id="operatorId-exceptie" eticheta="Operatore">
            <Select name="operatorId" defaultValue="">
              <option value="">Tutto l&apos;ufficio</option>
              {operatori.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nume}
                </option>
              ))}
            </Select>
          </Camp>

          <Camp id="tip-exceptie" eticheta="Tipo" obligatoriu>
            <Select name="tip" defaultValue="closed">
              {Object.entries(TIPURI_EXCEPTIE).map(([v, e]) => (
                <option key={v} value={v}>
                  {e}
                </option>
              ))}
            </Select>
          </Camp>

          <Camp id="deLa-exceptie" eticheta="Dal" eroare={stareExceptie.campuri?.deLa} obligatoriu>
            <Input name="deLa" type="date" required />
          </Camp>

          <Camp id="panaLa-exceptie" eticheta="Al" eroare={stareExceptie.campuri?.panaLa} obligatoriu>
            <Input name="panaLa" type="date" required />
          </Camp>

          <Camp
            id="oraDeLa"
            eticheta="Dalle (facoltativo)"
            indiciu="Obbligatorio per un'apertura straordinaria."
            eroare={stareExceptie.campuri?.oraDeLa}
          >
            <Input name="oraDeLa" type="time" />
          </Camp>

          <Camp id="oraPanaLa" eticheta="Alle (facoltativo)" eroare={stareExceptie.campuri?.oraPanaLa}>
            <Input name="oraPanaLa" type="time" />
          </Camp>

          <Camp id="motiv" eticheta="Motivo">
            <Input name="motiv" maxLength={300} placeholder="Es. Ferie estive" />
          </Camp>

          <div className="flex items-end">
            <Button type="submit" disabled={asterExceptie} className="w-full rounded-full">
              {asterExceptie ? "Salvo…" : "Registra"}
            </Button>
          </div>

          {stareExceptie.eroare ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Anunt ton="eroare">{stareExceptie.eroare}</Anunt>
            </div>
          ) : null}
          {stareExceptie.ok && stareExceptie.mesaj ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Anunt ton="succes">{stareExceptie.mesaj}</Anunt>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
