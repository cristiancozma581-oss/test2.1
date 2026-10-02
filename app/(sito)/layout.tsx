import { Antet } from "@/components/immy/antet";
import { BaraMobila } from "@/components/immy/bara-mobila";
import { Subsol } from "@/components/immy/subsol";
import { setari } from "@/lib/immy/dal/setari";
import { sesiuneCurenta } from "@/lib/immy/dal/sesiune";

/** Învelișul sitului public (§3, §56). */
export default async function LayoutSit({ children }: { children: React.ReactNode }) {
  const [s, sesiune] = await Promise.all([setari(), sesiuneCurenta()]);

  return (
    <>
      {/* §57: prima oprire a tastaturii sare peste meniu, direct la conținut. */}
      <a
        href="#continut"
        className="doar-cititor-ecran focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Vai al contenuto
      </a>

      <Antet autentificat={Boolean(sesiune)} />
      {/* Spațiul de jos ține conținutul deasupra barei de acțiuni de pe mobil. */}
      <main id="continut" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <Subsol setari={s} />
      <BaraMobila telefon={s.telefon} whatsapp={s.whatsapp} />
    </>
  );
}
