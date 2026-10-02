import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FormularInregistrare } from "@/components/immy/formular-auth";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { paginaDeStart } from "@/lib/immy/rbac";

export const metadata: Metadata = {
  title: "Crea il tuo account",
  robots: { index: false, follow: false },
};

export default async function PaginaInregistrare() {
  const sesiune = await sesiuneCurenta();
  if (sesiune) redirect(paginaDeStart(sesiune.rol));

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Crea il tuo account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Con un account segui lo stato della pratica, carichi i documenti che ti chiediamo e
        parli direttamente con l&apos;operatore. Se hai già prenotato con questa email,
        ritrovi qui le tue prenotazioni.
      </p>

      <div className="mt-8">
        <FormularInregistrare />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Hai già un account?{" "}
        <Link href="/accedi" className="font-semibold text-primary-deep hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
