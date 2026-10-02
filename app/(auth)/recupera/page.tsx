import Link from "next/link";
import type { Metadata } from "next";
import { FormularRecuperare } from "@/components/immy/formular-auth";

export const metadata: Metadata = {
  title: "Password dimenticata",
  robots: { index: false, follow: false },
};

export default function PaginaRecuperare() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Password dimenticata</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Scrivi il tuo indirizzo email: ti mandiamo un link per impostarne una nuova.
      </p>

      <div className="mt-8">
        <FormularRecuperare />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/accedi" className="font-semibold text-primary-deep hover:underline">
          Torna all&apos;accesso
        </Link>
      </p>
    </div>
  );
}
