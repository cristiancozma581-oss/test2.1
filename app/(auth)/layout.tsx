import Link from "next/link";
import { Marca } from "@/components/immy/marca";

/** Învelișul paginilor de autentificare: fără meniu, fără distrageri. */
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="IMMY &amp; EMY — home">
            <Marca />
          </Link>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary-deep">
            Torna al sito
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
