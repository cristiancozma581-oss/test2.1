import type { Metadata } from "next";
import { FormularParolaNoua } from "@/components/immy/formular-auth";

export const metadata: Metadata = {
  title: "Nuova password",
  robots: { index: false, follow: false },
};

export default function PaginaParolaNoua() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Scegli una nuova password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Questa pagina funziona solo con il link che ti abbiamo inviato per email. Se il link è
        scaduto, richiedine uno nuovo.
      </p>

      <div className="mt-8">
        <FormularParolaNoua />
      </div>
    </div>
  );
}
