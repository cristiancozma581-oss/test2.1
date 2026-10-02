import type { Metadata } from "next";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description:
    "Le condizioni del servizio di prenotazione online e dell'area riservata di IMMY & EMY.",
  alternates: { canonical: "/termini" },
};

export default async function PaginaTermeni() {
  const s = await setari();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-4xl font-semibold">Termini di servizio</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
      </p>

      <div className="mt-9 space-y-8 text-[15px] leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Che cos&apos;è questo servizio</h2>
          <p className="mt-2">
            Questo sito permette di prenotare un appuntamento presso {s.numeFirma} e di seguire
            la propria pratica. La prenotazione è gratuita. Il costo delle pratiche, quando
            previsto, ti viene comunicato prima di iniziare.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Prenotazioni</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Ogni prenotazione riceve un codice univoco che la identifica.</li>
            <li>
              La prenotazione è confermata quando ricevi la notifica di conferma. Fino a quel
              momento resta in attesa.
            </li>
            <li>
              Puoi annullare fino a {s.pragAnulareOre} ore prima dell&apos;appuntamento. Sotto
              questa soglia chiamaci: lo annulliamo insieme.
            </li>
            <li>
              Se non ti presenti senza avvisare, l&apos;appuntamento viene registrato come
              mancata presenza.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Il tuo account</h2>
          <p className="mt-2">
            Sei responsabile della tua password e delle operazioni fatte dal tuo account. Se
            sospetti che qualcuno vi abbia avuto accesso, cambiala e avvisaci subito.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Documenti che carichi</h2>
          <p className="mt-2">
            Carica solo documenti tuoi o per i quali hai il diritto di agire. Accettiamo PDF,
            JPG, PNG, DOC e DOCX fino a {s.maxUploadMb} MB per file. I documenti sono usati
            esclusivamente per la pratica a cui appartengono.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Limiti del servizio</h2>
          <p className="mt-2">
            Le informazioni pubblicate sul sito e le risposte dell&apos;assistente automatico
            sono un primo orientamento, non una consulenza legale definitiva: ogni situazione ha
            i suoi dettagli. Le decisioni sulle pratiche restano di competenza degli enti
            pubblici a cui vengono presentate, e i tempi dipendono da loro.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-foreground">Contatti</h2>
          <p className="mt-2">
            {s.numeFirma} — {s.adresa} · {s.telefon} ·{" "}
            <a className="font-semibold text-primary-deep" href={`mailto:${s.email}`}>
              {s.email}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
