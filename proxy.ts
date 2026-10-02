import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (în Next 16 acesta înlocuiește `middleware.ts`).
 *
 * Face DOUĂ lucruri, amândouă ieftine:
 *   1. reîmprospătează cookie-urile sesiunii Supabase, ca Server Components să
 *      vadă o sesiune validă;
 *   2. pune antetele de securitate (§60) pe fiecare răspuns.
 *
 * NU decide aici cine are voie la ce. Documentația Next avertizează că Server
 * Functions sunt POST-uri către ruta în care trăiesc, deci un `matcher` care
 * exclude o cale sare și peste ele; în plus proxy-ul poate fi executat separat
 * de codul de randare. Verificarea rolului și a proprietății se face în stratul
 * de acces la date (`lib/immy/dal/*`), pe fiecare cerere.
 */

/**
 * Antetele de securitate (§60).
 *
 * CSP-ul este singurul care cere atenție. `'unsafe-inline'` pentru stiluri este
 * necesar fonturilor `next/font` și atributelor `style` generate; pentru
 * scripturi este necesar hidratării Next fără nonce per cerere — o schimbare
 * care merită făcută separat, cu măsurători, nu strecurată aici.
 * `frame-ancestors 'none'` și `object-src 'none'` închid oricum vectorii care
 * contează cel mai mult pentru un sit ca acesta.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // Supabase (bază, auth, storage) și hărțile OpenStreetMap.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openstreetmap.org",
  "frame-src https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

function antete(raspuns: NextResponse): NextResponse {
  raspuns.headers.set("Content-Security-Policy", CSP);
  raspuns.headers.set("X-Frame-Options", "DENY");
  raspuns.headers.set("X-Content-Type-Options", "nosniff");
  raspuns.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  raspuns.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  raspuns.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  return raspuns;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  // Fără integrare configurată situl public trebuie să rămână în picioare.
  if (!url || !key) return antete(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // O eroare de rețea către Supabase nu trebuie să doboare pagina.
  }

  return antete(response);
}

export const config = {
  matcher: [
    /*
     * Tot, mai puțin fișierele statice și imaginile — acolo reîmprospătarea
     * sesiunii nu ajută cu nimic și doar adaugă latență.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
