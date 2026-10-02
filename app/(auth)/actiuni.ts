"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientSesiune } from "@/lib/immy/supabase";
import { auditeaza } from "@/lib/immy/audit";
import { trimiteNotificare } from "@/lib/immy/notificari";
import { urlPublic } from "@/lib/immy/env";
import { paginaDeStart } from "@/lib/immy/rbac";
import {
  erori,
  schemaEmailSingur,
  schemaInregistrare,
  schemaLogin,
  schemaParolaNoua,
} from "@/lib/immy/validare";
import type { Rol } from "@/lib/immy/tipuri";

/**
 * Autentificarea (§50).
 *
 * Parolele sunt gestionate integral de Supabase Auth: hash-uite cu bcrypt,
 * niciodată vizibile aplicației. Codul de aici nu vede și nu stochează nicio
 * parolă în clar.
 *
 * Mesajele de eroare la login sunt DELIBERAT vagi. „Email inesistente" ar
 * spune unui străin care adrese au cont la noi — o listă utilă doar cuiva care
 * o caută cu rea intenție.
 */

export type StareAuth = {
  ok: boolean;
  eroare?: string;
  mesaj?: string;
  campuri?: Record<string, string>;
};

export async function autentifica(_stare: StareAuth, formular: FormData): Promise<StareAuth> {
  const verificat = schemaLogin.safeParse({
    email: formular.get("email"),
    parola: formular.get("parola"),
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Accesso non disponibile: integrazione non configurata." };

  const { data, error } = await sb.auth.signInWithPassword({
    email: verificat.data.email,
    password: verificat.data.parola,
  });

  if (error || !data.user) {
    await auditeaza({
      actorEmail: verificat.data.email,
      actiune: "LOGIN_FAILED",
      entitate: "auth",
      rezumat: "Credenziali non valide.",
    });
    return { ok: false, eroare: "Email o password non corretti." };
  }

  const { data: profil } = await sb
    .from("ie_profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  // Un cont dezactivat nu trebuie să primească sesiune (§36).
  if (profil?.status === "disabled") {
    await sb.auth.signOut();
    return {
      ok: false,
      eroare: "Questo account è disattivato. Contattaci per riattivarlo.",
    };
  }

  await sb
    .from("ie_profiles")
    .update({ last_sign_in_at: new Date().toISOString() })
    .eq("id", data.user.id);

  await auditeaza({
    actorId: data.user.id,
    actorEmail: data.user.email ?? null,
    actorRol: profil?.role ?? null,
    actiune: "LOGIN",
    entitate: "auth",
    entitateId: data.user.id,
  });

  revalidatePath("/", "layout");
  redirect(paginaDeStart((profil?.role ?? "CLIENT") as Rol));
}

export async function inregistreaza(_stare: StareAuth, formular: FormData): Promise<StareAuth> {
  const verificat = schemaInregistrare.safeParse({
    nume: formular.get("nume"),
    prenume: formular.get("prenume"),
    email: formular.get("email"),
    telefon: formular.get("telefon"),
    parola: formular.get("parola"),
    limba: formular.get("limba") || "it",
    gdpr: formular.get("gdpr") === "on",
  });

  if (!verificat.success) {
    return {
      ok: false,
      eroare: "Controlla i campi segnalati.",
      campuri: erori(verificat.error),
    };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Registrazione non disponibile: integrazione non configurata." };

  const d = verificat.data;
  const { data, error } = await sb.auth.signUp({
    email: d.email,
    password: d.parola,
    options: {
      emailRedirectTo: `${urlPublic()}/auth/callback`,
      // Rolul NU se pune aici: triggerul din 0011 îl forțează la CLIENT. Chiar
      // dacă cineva ar injecta `role` în metadate, baza îl ignoră.
      //
      // Consimțământul GDPR (§49) trece prin metadate ca să ajungă în
      // `ie_profiles.gdpr_accepted_at` în aceeași tranzacție cu profilul
      // (migrația 0018). Un `update` separat, făcut după, ar putea eșua tăcut —
      // și atunci am cere o bifă pe care nu am mai putea-o dovedi.
      data: {
        full_name: `${d.nume} ${d.prenume}`,
        phone: d.telefon,
        preferred_locale: d.limba,
        gdpr_accepted_at: new Date().toISOString(),
      },
    },
  });

  if (error) {
    /*
     * Nu confirmăm dacă adresa există deja.
     *
     * Un mesaj de tip „email già registrata" transformă formularul într-un
     * instrument de verificare a adreselor. Răspundem la fel în ambele cazuri;
     * cine chiar are cont primește instrucțiunile pe e-mail.
     */
    if (/already|registered|exists/i.test(error.message)) {
      return {
        ok: true,
        mesaj:
          "Se l'indirizzo è valido, ti abbiamo inviato un'email. Controlla la posta " +
          "(anche lo spam) per continuare.",
      };
    }
    return { ok: false, eroare: "Registrazione non riuscita. Riprova tra qualche istante." };
  }

  if (data.user) {
    /*
     * Programările făcute ca oaspete NU se leagă aici.
     *
     * `signUp` întoarce `data.user` și când confirmarea prin e-mail este
     * activă — lipsește doar `data.session`. Legarea în acest punct ar muta
     * programările cuiva în contul primului care se înregistrează cu adresa
     * lui, fără nicio dovadă că adresa îi aparține.
     *
     * Se face în `/auth/callback`, după schimbarea codului pe sesiune: acolo
     * deținerea cutiei poștale este dovedită prin faptul că linkul a fost
     * deschis (§12).
     */
    await Promise.all([
      trimiteNotificare({
        eveniment: "ACCOUNT_WELCOME",
        destinatarId: data.user.id,
        destinatarEmail: d.email,
        context: { nume: d.nume },
      }),
      auditeaza({
        actorId: data.user.id,
        actorEmail: d.email,
        actorRol: "CLIENT",
        actiune: "CREATE",
        entitate: "profile",
        entitateId: data.user.id,
        rezumat: "Registrazione dal sito.",
      }),
    ]);
  }

  // Cu confirmarea prin e-mail activă, `session` lipsește până la clic.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/area-cliente");
  }

  return {
    ok: true,
    mesaj:
      "Ci siamo quasi: ti abbiamo inviato un'email per confermare l'indirizzo. " +
      "Apri il link e il tuo account è pronto.",
  };
}

export async function cereResetare(_stare: StareAuth, formular: FormData): Promise<StareAuth> {
  const verificat = schemaEmailSingur.safeParse({ email: formular.get("email") });
  if (!verificat.success) {
    return { ok: false, eroare: "Indirizzo email non valido.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (sb) {
    await sb.auth.resetPasswordForEmail(verificat.data.email, {
      redirectTo: `${urlPublic()}/auth/callback?next=/reimposta`,
    });
  }

  // Același răspuns, indiferent dacă adresa există: altfel formularul devine
  // un detector de conturi.
  return {
    ok: true,
    mesaj:
      "Se l'indirizzo è registrato, ti abbiamo inviato il link per reimpostare la password. " +
      "Controlla la posta, anche nello spam.",
  };
}

export async function schimbaParola(_stare: StareAuth, formular: FormData): Promise<StareAuth> {
  const verificat = schemaParolaNoua.safeParse({
    parola: formular.get("parola"),
    confirmare: formular.get("confirmare"),
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  // Sesiunea temporară vine din linkul de recuperare. Fără ea, oricine ar putea
  // apela acțiunea direct și schimba o parolă.
  const { data: utilizator } = await sb.auth.getUser();
  if (!utilizator.user) {
    return {
      ok: false,
      eroare: "Il link è scaduto. Richiedi un nuovo link per reimpostare la password.",
    };
  }

  const { error } = await sb.auth.updateUser({ password: verificat.data.parola });
  if (error) return { ok: false, eroare: "Non è stato possibile aggiornare la password." };

  await auditeaza({
    actorId: utilizator.user.id,
    actorEmail: utilizator.user.email ?? null,
    actiune: "UPDATE",
    entitate: "auth",
    entitateId: utilizator.user.id,
    rezumat: "Password reimpostata.",
  });

  revalidatePath("/", "layout");
  redirect("/area-cliente");
}

export async function iesi() {
  const sb = await clientSesiune();
  if (sb) {
    const { data } = await sb.auth.getUser();
    if (data.user) {
      await auditeaza({
        actorId: data.user.id,
        actorEmail: data.user.email ?? null,
        actiune: "LOGOUT",
        entitate: "auth",
        entitateId: data.user.id,
      });
    }
    await sb.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
