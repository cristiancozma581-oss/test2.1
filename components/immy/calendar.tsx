import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Programare } from "@/lib/immy/dal/programari";

/**
 * Calendarul săptămânal (§15).
 *
 * Componentă de server, fără stare: primește programările deja filtrate după
 * rol de stratul de acces la date și le așază pe zile. Un operator primește
 * aici doar propriile ore, pentru că filtrarea s-a făcut înainte — nu ascunde
 * componenta nimic ce ar fi ajuns în pagină.
 */
export function CalendarSaptamanal({
  programari,
  zile,
  fus,
  bazaLegatura,
}: {
  programari: Programare[];
  zile: string[];
  fus: string;
  bazaLegatura: string;
}) {
  const ora = new Intl.DateTimeFormat("it-IT", {
    timeZone: fus,
    hour: "2-digit",
    minute: "2-digit",
  });
  const capZi = new Intl.DateTimeFormat("it-IT", {
    timeZone: fus,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const peZi = new Map<string, Programare[]>();
  for (const zi of zile) peZi.set(zi, []);

  for (const p of programari) {
    // Ziua se ia din ora locală a biroului, nu din UTC: altfel o programare de
    // la 00:30 ar apărea în ziua precedentă.
    const zi = new Intl.DateTimeFormat("en-CA", { timeZone: fus }).format(new Date(p.inceput));
    peZi.get(zi)?.push(p);
  }

  const azi = new Intl.DateTimeFormat("en-CA", { timeZone: fus }).format(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[52rem] grid-cols-7 gap-2">
        {zile.map((zi) => {
          const lista = (peZi.get(zi) ?? []).sort((a, b) => a.inceput.localeCompare(b.inceput));
          return (
            <div
              key={zi}
              className={cn(
                "rounded-xl border p-2",
                zi === azi ? "border-primary bg-tint" : "border-border bg-surface",
              )}
            >
              <p
                className={cn(
                  "px-1 pb-2 text-xs font-semibold capitalize",
                  zi === azi ? "text-primary-deep" : "text-muted-foreground",
                )}
              >
                {capZi.format(new Date(`${zi}T12:00:00Z`))}
              </p>

              {lista.length === 0 ? (
                <p className="px-1 py-3 text-xs text-muted-foreground/60">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {lista.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`${bazaLegatura}/${p.id}`}
                        className={cn(
                          "block rounded-lg border-l-4 bg-surface-muted px-2 py-1.5 text-xs transition-colors hover:bg-tint",
                          p.status === "CANCELLED" || p.status === "NO_SHOW"
                            ? "opacity-50 line-through"
                            : undefined,
                        )}
                        style={{ borderLeftColor: p.operator?.culoare ?? "var(--primary)" }}
                      >
                        <span className="block font-semibold">{ora.format(new Date(p.inceput))}</span>
                        <span className="block truncate">{p.client.nume}</span>
                        <span className="block truncate text-muted-foreground">
                          {p.serviciu?.nume}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
