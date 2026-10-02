import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FormularLogin } from "@/components/immy/formular-auth";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";
import { paginaDeStart } from "@/lib/immy/rbac";

export const metadata: Metadata = {
  title: "Accedi",
  robots: { index: false, follow: false },
};

export default async function PaginaLogin() {
  const sesiune = await sesiuneCurenta();
  if (sesiune) redirect(paginaDeStart(sesiune.rol));

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Accedi</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entra nella tua area riservata per seguire le pratiche, caricare documenti e scrivere
        al tuo operatore.
      </p>

      <div className="mt-8">
        <FormularLogin />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Non hai ancora un account?{" "}
        <Link href="/registrati" className="font-semibold text-primary-deep hover:underline">
          Creane uno
        </Link>
      </p>
    </div>
  );
}
