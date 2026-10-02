"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LegaturaPortal } from "./invelis-portal";

/**
 * Lista de legături a portalului.
 *
 * Este client component doar ca să știe pagina curentă. Comparația se face pe
 * segment, nu cu `startsWith` brut: altfel `/admin` ar apărea activ pe fiecare
 * pagină din admin, iar `/admin/servizi` n-ar mai putea fi deosebit.
 */
export function MeniuPortal({
  legaturi,
  orizontal,
}: {
  legaturi: LegaturaPortal[];
  orizontal?: boolean;
}) {
  const cale = usePathname();

  const activ = (href: string) =>
    cale === href || (href !== "/" && cale.startsWith(`${href}/`));

  return (
    <ul className={cn(orizontal ? "flex gap-1" : "space-y-0.5")}>
      {legaturi.map((l) => (
        <li key={l.href} className={orizontal ? "shrink-0" : undefined}>
          <Link
            href={l.href}
            aria-current={activ(l.href) ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              orizontal
                ? activ(l.href)
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground"
                : activ(l.href)
                  ? "bg-white/12 text-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white",
              orizontal ? "whitespace-nowrap" : undefined,
            )}
          >
            {l.eticheta}
            {l.insigna && l.insigna > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  orizontal ? "bg-destructive text-white" : "bg-primary text-primary-foreground",
                )}
              >
                {l.insigna > 99 ? "99+" : l.insigna}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
