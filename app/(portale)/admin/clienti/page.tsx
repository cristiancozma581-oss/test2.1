import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";

export const metadata: Metadata = {
  title: "Clienti",
  robots: { index: false, follow: false },
};

type Proprietati = { searchParams: Promise<{ q?: string }> };

export default async function PaginaClienti(props: Proprietati) {
  await cerutAdmin();
  const { q } = await props.searchParams;

  const sb = await clientSesiune();
  const s = await setari();

  let clienti: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }[] = [];

  if (sb) {
    let interogare = sb
      .from("ie_profiles")
      .select("id, full_name, email, phone, created_at, last_sign_in_at")
      .eq("role", "CLIENT")
      .order("created_at", { ascending: false })
      .limit(200);

    const cautare = q?.trim();
    if (cautare) {
      // `%` și `_` ar fi jokeri în `ilike`; le anulăm ca să caute literal.
      const sigur = cautare.replace(/[%_\\]/g, "\\$&");
      interogare = interogare.or(
        `full_name.ilike.%${sigur}%,email.ilike.%${sigur}%,phone.ilike.%${sigur}%`,
      );
    }

    const { data } = await interogare;
    clienti = data ?? [];
  }

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <AntetPagina titlu="Clienti" descriere={`${clienti.length} account cliente`} />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <form className="flex gap-2" role="search">
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cerca per nome, email o telefono…"
            aria-label="Cerca un cliente"
          />
          <Button type="submit" className="rounded-full px-6">
            Cerca
          </Button>
        </form>

        {clienti.length === 0 ? (
          <StareGoala
            titlu={q ? "Nessun risultato" : "Nessun cliente registrato"}
            descriere={
              q
                ? "Prova con una parte del nome o del numero."
                : "Gli account creati dai clienti compaiono qui."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Telefono</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Registrato</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ultimo accesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {clienti.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <a className="hover:text-primary-deep" href={`mailto:${c.email}`}>
                        {c.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <a className="hover:text-primary-deep" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format.format(new Date(c.created_at))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.last_sign_in_at ? format.format(new Date(c.last_sign_in_at)) : "mai"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
