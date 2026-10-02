"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientSesiune } from "@/lib/immy/supabase";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { auditeaza } from "@/lib/immy/audit";
import { erori, limba, telefon } from "@/lib/immy/validare";

export type StareActiune = {
  ok: boolean;
  eroare?: string;
  mesaj?: string;
  campuri?: Record<string, string>;
};

const schema = z.object({
  numeComplet: z.string().trim().min(2, "Inserisci nome e cognome.").max(160),
  telefon,
  limba,
});

/**
 * Editarea propriului profil (§36).
 *
 * Se scriu doar cele trei câmpuri de mai jos. Rolul și statusul nu apar aici,
 * iar politica RLS din 0016 le și blochează explicit: un `update` care le-ar
 * schimba este respins de bază, nu doar omis de cod.
 */
export async function salveazaProfilul(
  _stare: StareActiune,
  formular: FormData,
): Promise<StareActiune> {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return { ok: false, eroare: "Sessione scaduta. Accedi di nuovo." };

  const verificat = schema.safeParse({
    numeComplet: formular.get("numeComplet"),
    telefon: formular.get("telefon"),
    limba: formular.get("limba") || "it",
  });

  if (!verificat.success) {
    return { ok: false, eroare: "Controlla i campi.", campuri: erori(verificat.error) };
  }

  const sb = await clientSesiune();
  if (!sb) return { ok: false, eroare: "Integrazione non configurata." };

  const { error } = await sb
    .from("ie_profiles")
    .update({
      full_name: verificat.data.numeComplet,
      phone: verificat.data.telefon,
      preferred_locale: verificat.data.limba,
    })
    .eq("id", sesiune.id);

  if (error) return { ok: false, eroare: "Non è stato possibile salvare. Riprova." };

  await auditeaza({
    actorId: sesiune.id,
    actorEmail: sesiune.email,
    actorRol: sesiune.rol,
    actiune: "UPDATE",
    entitate: "profile",
    entitateId: sesiune.id,
    rezumat: "Profilo aggiornato dall'utente.",
  });

  revalidatePath("/area-cliente", "layout");
  return { ok: true, mesaj: "Profilo aggiornato." };
}
