"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Camp, Input } from "@/components/ui/input";
import { Anunt } from "./stari";
import { salveazaSetarile, type StareAdmin } from "@/app/(portale)/admin/actiuni";
import type { Setari } from "@/lib/immy/dal/setari";

const INITIALA: StareAdmin = { ok: false };

export function FormularSetari({ setari }: { setari: Setari }) {
  const [stare, actiune, aster] = useActionState(salveazaSetarile, INITIALA);

  return (
    <form action={actiune} className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-semibold">Dati dell&apos;ufficio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compaiono sul sito pubblico, nelle email e nei dati strutturati per Google.
        </p>

        <div className="mt-4 space-y-4">
          <Camp id="numeFirma" eticheta="Nome" eroare={stare.campuri?.numeFirma} obligatoriu>
            <Input name="numeFirma" required defaultValue={setari.numeFirma} maxLength={120} />
          </Camp>

          <Camp id="slogan" eticheta="Slogan">
            <Input name="slogan" defaultValue={setari.slogan} maxLength={200} />
          </Camp>

          <div className="grid gap-4 sm:grid-cols-2">
            <Camp id="telefon-setari" eticheta="Telefono" eroare={stare.campuri?.telefon} obligatoriu>
              <Input name="telefon" required defaultValue={setari.telefon} />
            </Camp>
            <Camp id="telefonSecundar" eticheta="Tel / Fax">
              <Input name="telefonSecundar" defaultValue={setari.telefonSecundar ?? ""} />
            </Camp>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Camp
              id="whatsapp"
              eticheta="WhatsApp"
              indiciu="Solo cifre, con il prefisso internazionale: 393347759704."
            >
              <Input name="whatsapp" defaultValue={setari.whatsapp ?? ""} />
            </Camp>
            <Camp id="email-setari" eticheta="Email" eroare={stare.campuri?.email} obligatoriu>
              <Input name="email" type="email" required defaultValue={setari.email} />
            </Camp>
          </div>

          <Camp id="adresa" eticheta="Indirizzo" eroare={stare.campuri?.adresa} obligatoriu>
            <Input name="adresa" required defaultValue={setari.adresa} maxLength={300} />
          </Camp>

          <Camp
            id="fusOrar"
            eticheta="Fuso orario"
            indiciu="Cambiarlo sposta TUTTO il calendario. Modificalo solo se l'ufficio si trasferisce davvero."
            eroare={stare.campuri?.fusOrar}
            obligatoriu
          >
            <Input name="fusOrar" required defaultValue={setari.fusOrar} />
          </Camp>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-semibold">Regole di prenotazione</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Camp
            id="preavizMinute"
            eticheta="Preavviso minimo (minuti)"
            indiciu="Gli orari più vicini di così non compaiono."
            eroare={stare.campuri?.preavizMinute}
            obligatoriu
          >
            <Input
              name="preavizMinute"
              type="number"
              min={0}
              max={20160}
              required
              defaultValue={setari.preavizMinute}
            />
          </Camp>

          <Camp
            id="orizontZile"
            eticheta="Orizzonte (giorni)"
            indiciu="Quanto avanti si può prenotare."
            obligatoriu
          >
            <Input
              name="orizontZile"
              type="number"
              min={1}
              max={365}
              required
              defaultValue={setari.orizontZile}
            />
          </Camp>

          <Camp
            id="pasMinute"
            eticheta="Passo degli orari (minuti)"
            indiciu="15 dà 9:30, 9:45, 10:00…"
            obligatoriu
          >
            <Input
              name="pasMinute"
              type="number"
              min={5}
              max={120}
              step={5}
              required
              defaultValue={setari.pasMinute}
            />
          </Camp>

          <Camp
            id="pragAnulareOre"
            eticheta="Annullamento libero fino a (ore prima)"
            obligatoriu
          >
            <Input
              name="pragAnulareOre"
              type="number"
              min={0}
              max={168}
              required
              defaultValue={setari.pragAnulareOre}
            />
          </Camp>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-semibold">Documenti e conservazione</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Camp id="maxUploadMb" eticheta="Dimensione massima file (MB)" obligatoriu>
            <Input
              name="maxUploadMb"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={setari.maxUploadMb}
            />
          </Camp>

          <Camp
            id="retentieLuni"
            eticheta="Conservazione (mesi)"
            indiciu="Dichiarato nell'informativa privacy: tienilo allineato agli obblighi reali."
            obligatoriu
          >
            <Input
              name="retentieLuni"
              type="number"
              min={1}
              max={240}
              required
              defaultValue={setari.retentieLuni}
            />
          </Camp>
        </div>

        <div className="mt-4 space-y-2 rounded-lg bg-surface-muted/50 p-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="asistentActiv"
              defaultChecked={setari.asistentActiv}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Assistente attivo sul sito
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="platiOnline"
              defaultChecked={setari.platiOnline}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Pagamenti online abilitati
          </label>
          <p className="text-xs text-muted-foreground">
            I pagamenti online richiedono anche le chiavi del fornitore: senza quelle,
            l&apos;interruttore non ha effetto.
          </p>
        </div>
      </section>

      {stare.eroare ? <Anunt ton="eroare">{stare.eroare}</Anunt> : null}
      {stare.ok && stare.mesaj ? <Anunt ton="succes">{stare.mesaj}</Anunt> : null}

      <Button type="submit" size="lg" disabled={aster} className="rounded-full">
        {aster ? "Salvataggio…" : "Salva le impostazioni"}
      </Button>
    </form>
  );
}
