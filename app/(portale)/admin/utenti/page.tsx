import type { Metadata } from "next";
import { AntetPagina } from "@/components/immy/invelis-portal";
import { StareGoala } from "@/components/immy/stari";
import { RandUtilizator } from "@/components/immy/administrare-utilizatori";
import { clientSesiune } from "@/lib/immy/supabase";
import { cerutAdmin } from "@/lib/immy/dal/sesiune";
import { setari } from "@/lib/immy/dal/setari";
import type { Rol } from "@/lib/immy/tipuri";

export const metadata: Metadata = {
  title: "Utenti",
  robots: { index: false, follow: false },
};

/**
 * Administrarea utilizatorilor (§36).
 *
 * Conturile se creează prin înregistrare, nu de aici: crearea directă ar cere
 * o parolă aleasă de altcineva, adică exact ce nu vrem. Aici se schimbă rolul
 * (numai SUPER_ADMIN) și se activează sau dezactivează contul.
 */
export default async function PaginaUtilizatori() {
  const sesiune = await cerutAdmin();

  const sb = await clientSesiune();
  const s = await setari();

  const { data } = sb
    ? await sb
        .from("ie_profiles")
        .select("id, full_name, email, role, status, created_at, last_sign_in_at")
        .neq("role", "CLIENT")
        .order("role")
    : { data: [] };

  const utilizatori = (data ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
    role: Rol;
    status: string;
    created_at: string;
    last_sign_in_at: string | null;
  }[];

  const format = new Intl.DateTimeFormat("it-IT", {
    timeZone: s.fusOrar,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <AntetPagina
        titlu="Utenti dello staff"
        descriere="Ruoli e stato degli account interni. I clienti si trovano nella sezione Clienti."
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <p className="rounded-xl border border-info/25 bg-info/8 px-4 py-3 text-sm">
          Gli account si creano dalla registrazione pubblica, con la password scelta dalla
          persona. Da qui si assegna il ruolo: un nuovo collega si registra, poi lo promuovi.
          {sesiune.rol !== "SUPER_ADMIN" ? (
            <>
              {" "}
              Il cambio di ruolo è riservato al super amministratore.
            </>
          ) : null}
        </p>

        {utilizatori.length === 0 ? (
          <StareGoala
            titlu="Nessun account interno"
            descriere="Registra il primo account dal sito e poi assegnagli il ruolo di amministratore."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ruolo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ultimo accesso</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {utilizatori.map((u) => (
                  <RandUtilizator
                    key={u.id}
                    utilizator={{
                      id: u.id,
                      nume: u.full_name,
                      email: u.email,
                      rol: u.role,
                      status: u.status,
                      ultimulAcces: u.last_sign_in_at ? format.format(new Date(u.last_sign_in_at)) : "mai",
                    }}
                    rolulMeu={sesiune.rol}
                    eEuInsumi={u.id === sesiune.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
