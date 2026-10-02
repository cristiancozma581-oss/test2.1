import type { Metadata } from "next";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description:
    "Come IMMY & EMY tratta i tuoi dati personali e i documenti che carichi: finalità, " +
    "base giuridica, conservazione e i tuoi diritti.",
  alternates: { canonical: "/privacy" },
};

/**
 * Informativa privind confidențialitatea (§49).
 *
 * Textul descrie ce face SISTEMUL ăsta, concret: ce câmpuri se stochează, cine
 * le vede, cât timp rămân. Este scris pentru a fi verificat de un consultant
 * juridic înainte de publicare — nu ține locul acelei verificări.
 */
export default async function PaginaPrivacy() {
  const s = await setari();
  const ani = Math.round(s.retentieLuni / 12);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-4xl font-semibold">Informativa sulla privacy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
      </p>

      <div className="mt-9 space-y-8 text-[15px] leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Chi tratta i tuoi dati</h2>
          <p className="mt-2">
            Il titolare del trattamento è {s.numeFirma}, {s.adresa}. Per qualsiasi domanda
            sui tuoi dati puoi scriverci a{" "}
            <a className="font-semibold text-primary-deep" href={`mailto:${s.email}`}>
              {s.email}
            </a>{" "}
            o chiamarci al {s.telefon}.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Quali dati raccogliamo</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-foreground">Per la prenotazione:</strong> nome, cognome,
              email, telefono, lingua preferita, servizio scelto e le note che scrivi tu.
            </li>
            <li>
              <strong className="text-foreground">Per l&apos;account:</strong> gli stessi dati,
              più una password che conserviamo solo in forma cifrata — non la vediamo mai in
              chiaro, nemmeno noi.
            </li>
            <li>
              <strong className="text-foreground">Per la pratica:</strong> i documenti che
              carichi e i messaggi che scambi con l&apos;operatore.
            </li>
            <li>
              <strong className="text-foreground">Per la sicurezza:</strong> un registro degli
              accessi e delle operazioni sui documenti, con data, ora e indirizzo IP.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Perché li trattiamo</h2>
          <p className="mt-2">
            Per gestire il tuo appuntamento e la tua pratica — cioè per eseguire il servizio che
            ci chiedi — e per adempiere agli obblighi di legge che riguardano l&apos;assistenza
            fiscale e le pratiche amministrative. Non usiamo i tuoi dati per profilazione e non
            li vendiamo a nessuno.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Chi può vedere i tuoi documenti</h2>
          <p className="mt-2">
            Solo tu e l&apos;operatore che segue la tua pratica. I documenti sono conservati in
            uno spazio protetto, non raggiungibile da un indirizzo pubblico: ogni apertura passa
            da un controllo e da un collegamento temporaneo, valido pochi minuti. Ogni accesso
            resta registrato.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Per quanto tempo</h2>
          <p className="mt-2">
            Conserviamo i dati della pratica per {s.retentieLuni} mesi
            {ani >= 1 ? ` (circa ${ani} ${ani === 1 ? "anno" : "anni"})` : ""} dalla chiusura,
            per il tempo richiesto dagli obblighi fiscali e amministrativi. Dopo questo periodo
            i dati vengono eliminati o resi anonimi.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">I tuoi diritti</h2>
          <p className="mt-2">
            Puoi chiedere in qualsiasi momento di accedere ai tuoi dati, di correggerli, di
            riceverne una copia o di cancellarli. La cancellazione è possibile per tutto ciò che
            non siamo tenuti a conservare per legge; ti diciamo sempre con chiarezza che cosa
            possiamo eliminare e che cosa no, e perché.
          </p>
          <p className="mt-2">
            Se ritieni che i tuoi dati non siano trattati correttamente, puoi rivolgerti al
            Garante per la protezione dei dati personali.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Cookie</h2>
          <p className="mt-2">
            Usiamo solo cookie tecnici, necessari a tenerti collegato alla tua area riservata e a
            proteggere i moduli. Non usiamo cookie pubblicitari e non ti tracciamo su altri siti,
            quindi non trovi qui nessun banner da chiudere.
          </p>
        </section>
      </div>
    </div>
  );
}
