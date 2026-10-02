"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Anunt } from "./stari";
import { incarcaFisier, type StareActiune } from "@/app/(portale)/area-cliente/actiuni";
import { EXTENSII_ACCEPTATE, MIME_ACCEPTATE } from "@/lib/immy/tipuri";
import { validareFisier } from "@/lib/immy/validare";

const INITIALA: StareActiune = { ok: false };

/**
 * Încărcarea unui document (§22).
 *
 * Validarea din browser este pentru viteză — omul află pe loc că fișierul e
 * prea mare, fără să aștepte încărcarea. Decizia rămâne a serverului, care
 * rulează exact aceeași funcție `validareFisier`.
 */
export function IncarcaDocument({
  documentId,
  maxMb,
  eticheta = "Carica il documento",
}: {
  documentId: string;
  maxMb: number;
  eticheta?: string;
}) {
  const [stare, actiune, aster] = useActionState(incarcaFisier, INITIALA);
  const [local, setLocal] = useState<string | null>(null);
  const [numeFisier, setNumeFisier] = useState<string | null>(null);

  function verifica(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setNumeFisier(f?.name ?? null);

    if (!f) {
      setLocal(null);
      return;
    }
    const verdict = validareFisier(f.name, f.type, f.size, maxMb);
    setLocal(verdict.valid ? null : verdict.motiv);
  }

  if (stare.ok && stare.mesaj) return <Anunt ton="succes">{stare.mesaj}</Anunt>;

  return (
    <form action={actiune} className="space-y-3">
      <input type="hidden" name="documentId" value={documentId} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">{eticheta}</span>
        <input
          type="file"
          name="fisier"
          required
          accept={[...EXTENSII_ACCEPTATE.map((e) => `.${e}`), ...MIME_ACCEPTATE].join(",")}
          onChange={verifica}
          aria-invalid={local ? true : undefined}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:opacity-90"
        />
      </label>

      {numeFisier && !local ? (
        <p className="text-xs text-muted-foreground">Pronto: {numeFisier}</p>
      ) : null}
      {local ? <Anunt ton="eroare">{local}</Anunt> : null}
      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}

      <Button type="submit" size="sm" disabled={aster || Boolean(local)} className="rounded-full">
        {aster ? "Caricamento…" : "Carica"}
      </Button>
    </form>
  );
}

/**
 * Deschiderea unui document.
 *
 * Linkul semnat se cere la clic, nu la randare: un link emis la afișarea
 * paginii ar expira înainte ca omul să apese, iar unul cu viață lungă ar
 * rămâne valabil în istoricul browserului mult după ce ar trebui.
 */
export function DeschideDocument({
  documentId,
  versiune,
}: {
  documentId: string;
  versiune: number;
}) {
  const [asteapta, setAsteapta] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  async function deschide() {
    setAsteapta(true);
    setEroare(null);
    try {
      const r = await fetch(`/api/documenti/${documentId}?versione=${versiune}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { url: string };
      window.open(d.url, "_blank", "noopener,noreferrer");
    } catch {
      setEroare("Non riesco ad aprire il documento. Riprova.");
    } finally {
      setAsteapta(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {eroare ? <span className="text-xs text-destructive">{eroare}</span> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={asteapta}
        onClick={deschide}
      >
        {asteapta ? "Apro…" : "Apri"}
      </Button>
    </span>
  );
}
