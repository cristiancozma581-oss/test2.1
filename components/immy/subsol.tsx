import Link from "next/link";
import { Marca } from "./marca";
import type { Setari } from "@/lib/immy/dal/setari";

export function Subsol({ setari }: { setari: Setari }) {
  const an = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface-muted/50">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Marca />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {setari.slogan} a Torino. Assistenza su appuntamento, dal lunedì al venerdì.
            </p>
            <address className="mt-4 space-y-1 text-sm not-italic text-muted-foreground">
              <p>{setari.adresa}</p>
              <p>
                <a className="hover:text-primary-deep" href={`tel:${setari.telefon.replace(/[^\d+]/g, "")}`}>
                  {setari.telefon}
                </a>
                {setari.telefonSecundar ? (
                  <>
                    {" · "}
                    <a
                      className="hover:text-primary-deep"
                      href={`tel:${setari.telefonSecundar.replace(/[^\d+]/g, "")}`}
                    >
                      {setari.telefonSecundar}
                    </a>
                  </>
                ) : null}
              </p>
              <p>
                <a className="hover:text-primary-deep" href={`mailto:${setari.email}`}>
                  {setari.email}
                </a>
              </p>
            </address>
          </div>

          <nav aria-label="Servizi">
            <h2 className="font-serif text-sm font-semibold">Servizi</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-primary-deep" href="/servizi">Tutti i servizi</Link></li>
              <li><Link className="hover:text-primary-deep" href="/prenota">Prenota un appuntamento</Link></li>
              <li><Link className="hover:text-primary-deep" href="/come-funziona">Come funziona</Link></li>
              <li><Link className="hover:text-primary-deep" href="/faq">Domande frequenti</Link></li>
            </ul>
          </nav>

          <nav aria-label="Informazioni">
            <h2 className="font-serif text-sm font-semibold">Informazioni</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-primary-deep" href="/contatti">Contatti e sede</Link></li>
              <li><Link className="hover:text-primary-deep" href="/area-cliente">Area riservata</Link></li>
              <li><Link className="hover:text-primary-deep" href="/privacy">Privacy e cookie</Link></li>
              <li><Link className="hover:text-primary-deep" href="/termini">Termini di servizio</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            © {an} {setari.numeFirma} — {setari.adresa}
          </p>
          <p>
            Orario: lunedì–venerdì 9:30–13:00 · 15:00–18:00
          </p>
        </div>
      </div>
    </footer>
  );
}
