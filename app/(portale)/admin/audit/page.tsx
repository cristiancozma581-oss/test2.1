import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";
import { ACTIUNI_AUDIT } from "@/lib/immy/tipuri";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ azione?: string }> };

/**
 * Jurnalul de audit (§48).
 *
 * Doar citire: în 0016 nu există politică de insert, update sau delete pe
 * `ie_audit_logs` pentru nimeni. Scrierile vin exclusiv prin cheia de service,
 * din `lib/immy/audit.ts`, deci nici administratorul care se uită la această
 * pagină nu poate modifica ce vede.
 */
export default async function PaginaAudit(props: Proprietati) {
  await cerutAdmin();
  const { azione } = await props.searchParams;

  const sb = await clientSesiune();
  const s = await setari();

  let intrari: {
    id: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    summary: string | null;
    ip: string | null;
    created_at: string;
  }[] = [];

  if (sb) {
    let q = sb
      .from("ie_audit_logs")
      .select("id, actor_email, actor_role, action, entity_type, entity_id, summary, ip, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (azione && (ACTIUNI_AUDIT as readonly string[]).includes(azione)) {
      q = q.eq("action", azione);
    }

    const { data } = await q;
    intrari = data ?? [];
  }

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const evidentiat = (a: string) =>
    a === "ACCESS_DENIED" || a === "LOGIN_FAILED" || a === "DELETE" || a === "ROLE_CHANGE";

  return (
    <>
      <AntetPagina
        titlu="Audit log"
        descriere="Le ultime 300 operazioni. Il registro è di sola lettura: nemmeno un amministratore può modificarlo."
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per azione">
          <Link
            href="/admin/audit"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              !azione
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary",
            )}
          >
            Tutte
          </Link>
          {ACTIUNI_AUDIT.map((a) => (
            <Link
              key={a}
              href={`/admin/audit?azione=${a}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                azione === a
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {a}
            </Link>
          ))}
        </div>

        {intrari.length === 0 ? (
          <StareGoala
            titlu="Nessuna voce"
            descriere="Il registro si riempie man mano che vengono usate le funzioni della piattaforma."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quando</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Chi</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Azione</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Oggetto</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Dettaglio</th>
                  <th scope="col" className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {intrari.map((i) => (
                  <tr key={i.id} className={evidentiat(i.action) ? "bg-destructive/5" : undefined}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format.format(new Date(i.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{i.actor_email ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">{i.actor_role ?? ""}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          evidentiat(i.action)
                            ? "bg-destructive/15 text-destructive"
                            : "bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {i.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{i.entity_type}</td>
                    <td className="px-4 py-3">{i.summary ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {i.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
