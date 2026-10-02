import Link from "next/link";

/**
 * Bara de acțiuni de pe mobil (§56).
 *
 * Cele trei lucruri pe care le vrea cineva care deschide situl de pe telefon,
 * la îndemâna degetului mare: rezervă, sună, WhatsApp. `pb-[env(safe-area-...)]`
 * o ține deasupra barei de gesturi pe iPhone.
 */
export function BaraMobila({
  telefon,
  whatsapp,
}: {
  telefon: string;
  whatsapp: string | null;
}) {
  const telCurat = telefon.replace(/[^\d+]/g, "");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/97 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        <Link
          href="/prenota"
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-primary-deep"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" />
          </svg>
          Prenota
        </Link>
        <a
          href={`tel:${telCurat}`}
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"
              strokeLinejoin="round"
            />
          </svg>
          Chiama
        </a>
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 12a9 9 0 01-13.4 7.8L3 21l1.3-4.4A9 9 0 1121 12z" strokeLinejoin="round" />
            </svg>
            WhatsApp
          </a>
        ) : (
          <Link
            href="/contatti"
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-5.2-7-10a7 7 0 1114 0c0 4.8-7 10-7 10z" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            Dove siamo
          </Link>
        )}
      </div>
    </div>
  );
}
