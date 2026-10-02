import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cheiePublica, cheieService, urlSupabase } from "./env";

/**
 * Clientul legat de sesiunea utilizatorului.
 *
 * Respectă RLS: ce nu are voie să vadă utilizatorul nu vine nici aici. Este
 * clientul implicit pentru tot ce citește sau scrie în numele cuiva autentificat.
 *
 * În Next 16 `cookies()` este asincron.
 */
export async function clientSesiune() {
  const url = urlSupabase();
  const key = cheiePublica();
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Apelat dintr-un Server Component, unde cookie-urile sunt read-only.
          // Reîmprospătarea sesiunii se face în proxy.ts, deci e sigur de ignorat.
        }
      },
    },
  });
}

/**
 * Client care ocolește RLS.
 *
 * Se folosește DOAR acolo unde RLS nu poate ajunge, iar apelantul își face
 * singur verificarea de autorizare ÎNAINTE:
 *   * rezervarea făcută de un oaspete, care nu are `auth.uid()`;
 *   * emiterea linkurilor semnate, după ce s-a stabilit că omul are dreptul;
 *   * scrierea în jurnalul de audit și în coada de notificări, unde nici măcar
 *     un administrator nu are voie să insereze din browser.
 *
 * `server-only` face ca importul dintr-un client component să fie eroare de
 * build, nu o scurgere tăcută de cheie.
 */
export function clientServiciu() {
  const url = urlSupabase();
  const key = cheieService();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client anonim, fără cookie-uri, pentru citirile publice din pagini statice.
 *
 * Nu atinge `cookies()`, deci nu forțează randarea dinamică a catalogului.
 */
export function clientPublic() {
  const url = urlSupabase();
  const key = cheiePublica();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
