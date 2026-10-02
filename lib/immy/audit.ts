import "server-only";

import { headers } from "next/headers";
import { clientServiciu } from "./supabase";
import type { ActiuneAudit } from "./tipuri";

/**
 * Jurnalul de audit (§48).
 *
 * Se scrie EXCLUSIV cu cheia de service, pentru că în 0016 nu există nicio
 * politică de insert pe `ie_audit_logs` — nici pentru administratori. Un jurnal
 * pe care actorii îl pot rescrie nu este un jurnal.
 *
 * Scrierea nu are voie să doboare operațiunea pe care o descrie: dacă jurnalul
 * cade, programarea clientului rămâne făcută. Eșecul se raportează în consola
 * serverului, unde ajunge în logurile platformei.
 */

export type IntrareAudit = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRol?: string | null;
  actiune: ActiuneAudit;
  entitate: string;
  entitateId?: string | null;
  rezumat?: string;
  detalii?: Record<string, unknown>;
};

export async function auditeaza(intrare: IntrareAudit): Promise<void> {
  const sb = clientServiciu();
  if (!sb) return;

  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    // `x-forwarded-for` poate conține un lanț de proxy-uri; primul este clientul.
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    userAgent = h.get("user-agent");
  } catch {
    // Apelat în afara unei cereri (script, cron intern): fără antete, dar
    // intrarea în jurnal rămâne utilă.
  }

  try {
    await sb.from("ie_audit_logs").insert({
      actor_id: intrare.actorId ?? null,
      actor_email: intrare.actorEmail ?? null,
      actor_role: intrare.actorRol ?? null,
      action: intrare.actiune,
      entity_type: intrare.entitate,
      entity_id: intrare.entitateId ?? null,
      summary: intrare.rezumat ?? null,
      metadata: intrare.detalii ?? {},
      // Un `x-forwarded-for` fabricat ar rupe inserarea în coloana `inet`.
      ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
      user_agent: userAgent?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.error("[audit] scrierea în jurnal a eșuat:", e);
  }
}
