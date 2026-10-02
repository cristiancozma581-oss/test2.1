"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input, Select, Textarea } from "@/components/ui/input";
import { Anunt } from "./stari";
import { rezerva, type StareRezervare } from "@/app/(sito)/prenota/actiuni";
import type { Categorie, ServiciuLista } from "@/lib/immy/dal/catalog";

/**
 * Fluxul de rezervare (§11, §71).
 *
 *   SERVICIU → OPERATOR → ZI → ORĂ → DATE CLIENT → CONFIRMARE
 *
 * Sloturile NU se calculează aici. Se cer de la `/api/slot`, care le obține din
 * motorul de pe server. Un calcul de disponibilitate în browser ar putea fi
 * păcălit schimbând ceasul calculatorului, iar diferența dintre ce vede omul și
 * ce acceptă serverul se plătește exact la „Conferma".
 */

type Operator = { id: string; nume: string; titlu: string | null; culoare: string };
type Slot = { inceput: string; ora: string };
type Zi = { zi: string; eticheta: string; libere: number };

const STARE_INITIALA: StareRezervare = { ok: false };

export function FluxRezervare({
  servicii,
  categorii,
  slugInitial,
  client,
}: {
  servicii: ServiciuLista[];
  categorii: Categorie[];
  slugInitial?: string;
  client: { email: string; numeComplet: string | null; telefon: string | null } | null;
}) {
  const [serviciuId, setServiciuId] = useState<string | null>(
    servicii.find((s) => s.slug === slugInitial)?.id ?? null,
  );
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [zi, setZi] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [operatori, setOperatori] = useState<Operator[]>([]);
  const [zile, setZile] = useState<Zi[]>([]);
  const [sloturi, setSloturi] = useState<Slot[]>([]);
  const [eroareRetea, setEroareRetea] = useState<string | null>(null);

  /*
   * Starea de încărcare este DEDUSĂ, nu setată.
   *
   * Fiecare cerere are o cheie (ce anume s-a cerut); când răspunsul ajunge,
   * cheia lui se notează ca „încărcată". Cât timp cheia cerută diferă de cea
   * încărcată, suntem în așteptare. Așa nu mai există niciun `setState` în
   * corpul unui efect — care ar declanșa o a doua randare imediată — și nici
   * indicator rămas aprins după un răspuns care s-a pierdut pe drum.
   */
  const cheieOperatori = serviciuId;
  const cheieZile = serviciuId && operatorId ? `${serviciuId}|${operatorId}` : null;
  const cheieSloturi =
    serviciuId && operatorId && zi ? `${serviciuId}|${operatorId}|${zi}` : null;

  const [gataOperatori, setGataOperatori] = useState<string | null>(null);
  const [gataZile, setGataZile] = useState<string | null>(null);
  const [gataSloturi, setGataSloturi] = useState<string | null>(null);

  const incarca =
    (cheieOperatori !== null && gataOperatori !== cheieOperatori) ||
    (cheieZile !== null && gataZile !== cheieZile) ||
    (cheieSloturi !== null && gataSloturi !== cheieSloturi);

  const [stare, actiune, aster] = useActionState(rezerva, STARE_INITIALA);

  const serviciu = useMemo(
    () => servicii.find((s) => s.id === serviciuId) ?? null,
    [servicii, serviciuId],
  );

  /*
   * Golirea listelor NU se face aici.
   *
   * Un `setState` sincron în corpul unui efect declanșează o a doua randare
   * imediat după prima. Ștergerea aparține momentului în care se schimbă
   * alegerea — adică handlerelor de mai jos — iar efectul rămâne ce trebuie să
   * fie: o sincronizare cu serverul.
   */

  // --- Operatorii serviciului ales ------------------------------------------
  useEffect(() => {
    if (!serviciuId) return;
    const cheie = serviciuId;
    let anulat = false;

    fetch(`/api/slot?servizio=${serviciuId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { operatori: Operator[] }) => {
        if (anulat) return;
        setEroareRetea(null);
        setOperatori(d.operatori);
        // Cu un singur operator nu are rost o alegere: o facem noi.
        if (d.operatori.length === 1) setOperatorId(d.operatori[0].id);
      })
      .catch(() => {
        if (!anulat) setEroareRetea("Non riesco a caricare gli operatori. Riprova.");
      })
      .finally(() => {
        if (!anulat) setGataOperatori(cheie);
      });

    // `anulat` evită ca un răspuns întârziat pentru un serviciu abandonat să
    // suprascrie lista serviciului ales între timp.
    return () => {
      anulat = true;
    };
  }, [serviciuId]);

  // --- Zilele cu locuri libere ----------------------------------------------
  useEffect(() => {
    if (!serviciuId || !operatorId) return;
    const cheie = `${serviciuId}|${operatorId}`;
    let anulat = false;

    fetch(`/api/slot?servizio=${serviciuId}&operatore=${operatorId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { zile: Zi[] }) => {
        if (anulat) return;
        setEroareRetea(null);
        setZile(d.zile);
        setZi(d.zile.find((z) => z.libere > 0)?.zi ?? null);
        setSlot(null);
      })
      .catch(() => {
        if (!anulat) setEroareRetea("Non riesco a caricare il calendario. Riprova.");
      })
      .finally(() => {
        if (!anulat) setGataZile(cheie);
      });

    return () => {
      anulat = true;
    };
  }, [serviciuId, operatorId]);

  // --- Orele libere din ziua aleasă -----------------------------------------
  useEffect(() => {
    if (!serviciuId || !operatorId || !zi) return;
    const cheie = `${serviciuId}|${operatorId}|${zi}`;
    let anulat = false;

    fetch(`/api/slot?servizio=${serviciuId}&operatore=${operatorId}&giorno=${zi}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { sloturi: Slot[] }) => {
        if (anulat) return;
        setEroareRetea(null);
        setSloturi(d.sloturi);
      })
      .catch(() => {
        if (!anulat) setEroareRetea("Non riesco a caricare gli orari. Riprova.");
      })
      .finally(() => {
        if (!anulat) setGataSloturi(cheie);
      });

    return () => {
      anulat = true;
    };
  }, [serviciuId, operatorId, zi]);

  const pePasi = [
    { numar: 1, titlu: "Servizio", gata: Boolean(serviciuId) },
    { numar: 2, titlu: "Operatore", gata: Boolean(operatorId) },
    { numar: 3, titlu: "Data e ora", gata: Boolean(slot) },
    { numar: 4, titlu: "I tuoi dati", gata: false },
  ];

  return (
    <div className="space-y-9">
      {/* Indicatorul de pași */}
      <ol className="flex flex-wrap gap-2" aria-label="Passaggi della prenotazione">
        {pePasi.map((p) => (
          <li
            key={p.numar}
            aria-current={
              !p.gata && pePasi.slice(0, p.numar - 1).every((x) => x.gata) ? "step" : undefined
            }
            className={
              p.gata
                ? "flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                : "flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
            }
          >
            <span aria-hidden="true">{p.gata ? "✓" : p.numar}</span>
            {p.titlu}
          </li>
        ))}
      </ol>

      {eroareRetea ? <Anunt ton="eroare">{eroareRetea}</Anunt> : null}

      {/* --- 1. SERVICIU --- */}
      <section aria-labelledby="pas-serviciu">
        <h2 id="pas-serviciu" className="font-serif text-xl font-semibold">
          1. Quale servizio ti serve?
        </h2>
        <div className="mt-4">
          <Camp id="serviciu" eticheta="Servizio" obligatoriu>
            <Select
              value={serviciuId ?? ""}
              onChange={(e) => {
                setServiciuId(e.target.value || null);
                setOperatori([]);
                setOperatorId(null);
                setZile([]);
                setZi(null);
                setSloturi([]);
                setSlot(null);
              }}
            >
              <option value="">— Scegli un servizio —</option>
              {categorii.map((c) => {
                const ale = servicii.filter((s) => s.categorieId === c.id);
                if (ale.length === 0) return null;
                return (
                  <optgroup key={c.id} label={c.nume}>
                    {ale.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nume} ({s.durataMinute} min)
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          </Camp>
        </div>
      </section>

      {/* --- 2. OPERATOR --- */}
      {serviciuId ? (
        <section aria-labelledby="pas-operator">
          <h2 id="pas-operator" className="font-serif text-xl font-semibold">
            2. Con chi vuoi parlare?
          </h2>
          {operatori.length === 0 && !incarca ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Per questo servizio non ci sono operatori disponibili online. Chiamaci al
              333 47 59 704 e fissiamo insieme l&apos;appuntamento.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {operatori.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={operatorId === o.id}
                  onClick={() => {
                    setOperatorId(o.id);
                    setZile([]);
                    setZi(null);
                    setSloturi([]);
                    setSlot(null);
                  }}
                  className={
                    operatorId === o.id
                      ? "flex items-center gap-4 rounded-xl border-2 border-primary bg-tint p-4 text-left"
                      : "flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary"
                  }
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-lg font-semibold text-white"
                    style={{ backgroundColor: o.culoare }}
                  >
                    {o.nume.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{o.nume}</span>
                    {o.titlu ? (
                      <span className="block truncate text-sm text-muted-foreground">{o.titlu}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* --- 3. ZI ȘI ORĂ --- */}
      {operatorId ? (
        <section aria-labelledby="pas-data">
          <h2 id="pas-data" className="font-serif text-xl font-semibold">
            3. Quando ti va bene?
          </h2>

          {zile.length === 0 && !incarca ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nelle prossime settimane non ci sono posti liberi con questo operatore. Prova con
              un altro operatore o chiamaci.
            </p>
          ) : (
            <>
              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-2"
                role="group"
                aria-label="Scegli il giorno"
              >
                {zile.map((z) => (
                  <button
                    key={z.zi}
                    type="button"
                    disabled={z.libere === 0}
                    aria-pressed={zi === z.zi}
                    onClick={() => {
                      setZi(z.zi);
                      setSloturi([]);
                      setSlot(null);
                    }}
                    className={
                      zi === z.zi
                        ? "min-w-[6.5rem] shrink-0 rounded-xl border-2 border-primary bg-tint px-3 py-2.5 text-center"
                        : z.libere === 0
                          ? "min-w-[6.5rem] shrink-0 cursor-not-allowed rounded-xl border border-border px-3 py-2.5 text-center opacity-40"
                          : "min-w-[6.5rem] shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-center hover:border-primary"
                    }
                  >
                    <span className="block text-xs font-semibold capitalize">{z.eticheta}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {z.libere > 0 ? `${z.libere} posti` : "pieno"}
                    </span>
                  </button>
                ))}
              </div>

              {zi ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold">Orari liberi</p>
                  {incarca ? (
                    <p className="mt-3 text-sm text-muted-foreground" role="status">
                      Carico gli orari…
                    </p>
                  ) : sloturi.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Nessun orario libero in questo giorno. Scegline un altro.
                    </p>
                  ) : (
                    <div
                      className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5"
                      role="group"
                      aria-label="Scegli l'orario"
                    >
                      {sloturi.map((s) => (
                        <button
                          key={s.inceput}
                          type="button"
                          aria-pressed={slot?.inceput === s.inceput}
                          onClick={() => setSlot(s)}
                          className={
                            slot?.inceput === s.inceput
                              ? "rounded-lg border-2 border-primary bg-primary px-2 py-2.5 text-sm font-semibold text-primary-foreground"
                              : "rounded-lg border border-border bg-surface px-2 py-2.5 text-sm font-semibold hover:border-primary hover:bg-tint"
                          }
                        >
                          {s.ora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {/* --- 4. DATELE CLIENTULUI --- */}
      {slot && serviciu ? (
        <section aria-labelledby="pas-date">
          <h2 id="pas-date" className="font-serif text-xl font-semibold">
            4. I tuoi dati
          </h2>

          <div className="mt-4 rounded-xl bg-tint px-5 py-4 text-sm">
            <p className="font-semibold text-primary-deep">Riepilogo</p>
            <p className="mt-1 text-muted-foreground">
              {serviciu.nume} · {operatori.find((o) => o.id === operatorId)?.nume} ·{" "}
              {zile.find((z) => z.zi === zi)?.eticheta} alle {slot.ora} · {serviciu.durataMinute} min
            </p>
          </div>

          <form action={actiune} className="mt-5 space-y-4">
            <input type="hidden" name="serviceId" value={serviciu.id} />
            <input type="hidden" name="operatorId" value={operatorId ?? ""} />
            <input type="hidden" name="inceput" value={slot.inceput} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Camp id="nume" eticheta="Nome" eroare={stare.campuri?.nume} obligatoriu>
                <Input
                  name="nume"
                  required
                  autoComplete="given-name"
                  defaultValue={client?.numeComplet?.split(" ")[0] ?? ""}
                />
              </Camp>
              <Camp id="prenume" eticheta="Cognome" eroare={stare.campuri?.prenume} obligatoriu>
                <Input
                  name="prenume"
                  required
                  autoComplete="family-name"
                  defaultValue={client?.numeComplet?.split(" ").slice(1).join(" ") ?? ""}
                />
              </Camp>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Camp id="email" eticheta="Email" eroare={stare.campuri?.email} obligatoriu>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={client?.email ?? ""}
                />
              </Camp>
              <Camp
                id="telefon"
                eticheta="Telefono"
                indiciu="Ti chiamiamo solo per questa pratica."
                eroare={stare.campuri?.telefon}
                obligatoriu
              >
                <Input
                  name="telefon"
                  type="tel"
                  required
                  autoComplete="tel"
                  defaultValue={client?.telefon ?? ""}
                />
              </Camp>
            </div>

            <Camp id="limba" eticheta="Lingua preferita">
              <Select name="limba" defaultValue="it">
                <option value="it">Italiano</option>
                <option value="ro">Română</option>
                <option value="en">English</option>
              </Select>
            </Camp>

            <Camp
              id="note"
              eticheta="Note per l'operatore"
              indiciu="Facoltativo — scrivi qui quello che ci aiuta a prepararci."
              eroare={stare.campuri?.note}
            >
              <Textarea name="note" rows={3} maxLength={1000} />
            </Camp>

            <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="gdpr"
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  aria-describedby="gdpr-eroare"
                />
                <span>
                  Ho letto l&apos;
                  <a href="/privacy" target="_blank" className="font-semibold text-primary-deep underline">
                    informativa sulla privacy
                  </a>{" "}
                  e acconsento al trattamento dei miei dati per gestire questa prenotazione.
                </span>
              </label>
              {stare.campuri?.gdpr ? (
                <p id="gdpr-eroare" role="alert" className="mt-2 text-xs font-medium text-destructive">
                  {stare.campuri.gdpr}
                </p>
              ) : null}
            </div>

            {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

            <Button type="submit" size="lg" disabled={aster} className="w-full rounded-full">
              {aster ? "Invio in corso…" : "Conferma la prenotazione"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              La prenotazione è gratuita. Riceverai il codice via email.
            </p>
          </form>
        </section>
      ) : null}
    </div>
  );
}
