"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Categorie, ServiciuLista } from "@/lib/immy/dal/catalog";

/**
 * Căutarea și catalogul de pe pagina principală (§6, §7).
 *
 * Catalogul întreg vine deja randat de pe server, iar filtrarea se face în
 * browser. La ~20 de servicii asta este imediat și funcționează fără rețea;
 * căutarea pe text integral din bază rămâne pentru pagina /servizi, unde
 * catalogul poate crește.
 *
 * Fără JavaScript lista rămâne vizibilă, doar nefiltrată — nu dispare.
 */

function normalizeaza(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    // Scoate diacriticele, ca „però" și „pero" să se potrivească.
    .replace(/\p{Diacritic}/gu, "");
}

export function CautareServicii({
  servicii,
  categorii,
  placeholder,
}: {
  servicii: ServiciuLista[];
  categorii: Categorie[];
  placeholder: string;
}) {
  const [interogare, setInterogare] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);

  const gasite = useMemo(() => {
    const q = normalizeaza(interogare.trim());
    return servicii.filter((s) => {
      if (categorie && s.categorieId !== categorie) return false;
      if (!q) return true;
      const fan = normalizeaza(
        [s.nume, s.descriereScurta ?? "", s.categorieNume, ...s.cuvinteCheie].join(" "),
      );
      // Fiecare cuvânt tastat trebuie să apară: „spid torino" nu trebuie să
      // întoarcă tot ce conține doar „torino".
      return q.split(/\s+/).every((c) => fan.includes(c));
    });
  }, [servicii, interogare, categorie]);

  const peCategorii = useMemo(() => {
    const harta = new Map<string, ServiciuLista[]>();
    for (const s of gasite) {
      const lista = harta.get(s.categorieId) ?? [];
      lista.push(s);
      harta.set(s.categorieId, lista);
    }
    return harta;
  }, [gasite]);

  return (
    <div>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
        <Input
          type="search"
          value={interogare}
          onChange={(e) => setInterogare(e.target.value)}
          placeholder={placeholder}
          aria-label="Cerca un servizio"
          className="h-13 rounded-full pl-12 pr-4 text-base"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtra per categoria">
        <button
          type="button"
          onClick={() => setCategorie(null)}
          aria-pressed={categorie === null}
          className={cn(
            "rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors",
            categorie === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary-deep",
          )}
        >
          Tutti
        </button>
        {categorii.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategorie(categorie === c.id ? null : c.id)}
            aria-pressed={categorie === c.id}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors",
              categorie === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary-deep",
            )}
          >
            {c.nume}
          </button>
        ))}
      </div>

      <p className="doar-cititor-ecran" role="status">
        {gasite.length} servizi trovati
      </p>

      {gasite.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-serif text-lg">Nessun servizio trovato</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prova con un&apos;altra parola, oppure chiamaci: troviamo insieme la pratica giusta.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/contatti">Contattaci</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 space-y-11">
          {categorii
            .filter((c) => (peCategorii.get(c.id)?.length ?? 0) > 0)
            .map((c) => (
              <section key={c.id} aria-labelledby={`cat-${c.slug}`}>
                <h3
                  id={`cat-${c.slug}`}
                  className="flex items-center gap-3 font-serif text-lg font-semibold text-primary-deep"
                >
                  {c.nume}
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </h3>

                <ul className="mt-4 space-y-2.5">
                  {(peCategorii.get(c.id) ?? []).map((s) => (
                    <li key={s.id}>
                      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary hover:bg-tint sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                        <div className="min-w-0">
                          <Link
                            href={`/servizi/${s.slug}`}
                            className="font-semibold hover:text-primary-deep"
                          >
                            {s.nume}
                          </Link>
                          {s.descriereScurta ? (
                            <p className="mt-1 text-sm text-muted-foreground">{s.descriereScurta}</p>
                          ) : null}
                          <p className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-tint px-2.5 py-1 font-semibold text-primary-deep">
                              ⏱ {s.durataMinute} min
                            </span>
                            {s.pretCenti !== null ? (
                              <span className="rounded-full bg-surface-muted px-2.5 py-1 font-semibold text-muted-foreground">
                                {(s.pretCenti / 100).toLocaleString("it-IT", {
                                  style: "currency",
                                  currency: "EUR",
                                })}
                              </span>
                            ) : null}
                          </p>
                        </div>

                        {s.rezervabilOnline ? (
                          <Button asChild size="sm" className="shrink-0 rounded-full px-5">
                            <Link href={`/prenota?servizio=${s.slug}`}>Prenota</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full px-5">
                            <Link href={`/servizi/${s.slug}`}>Informazioni</Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
