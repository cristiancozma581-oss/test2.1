"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { comutaStatusUtilizator, schimbaRolul, type StareAdmin } from "@/app/(portale)/admin/actiuni";
import { ETICHETE_ROL, ROLURI, type Rol } from "@/lib/immy/tipuri";
import { poate } from "@/lib/immy/rbac";

const INITIALA: StareAdmin = { ok: false };

export function RandUtilizator({
  utilizator,
  rolulMeu,
  eEuInsumi,
}: {
  utilizator: {
    id: string;
    nume: string | null;
    email: string;
    rol: Rol;
    status: string;
    ultimulAcces: string;
  };
  rolulMeu: Rol;
  eEuInsumi: boolean;
}) {
  const [stareRol, actiuneRol, asterRol] = useActionState(schimbaRolul, INITIALA);
  const [stareStatus, actiuneStatus, asterStatus] = useActionState(comutaStatusUtilizator, INITIALA);

  const potSchimbaRolul = poate(rolulMeu, "roluri.schimba") && !eEuInsumi;
  const potDezactiva = poate(rolulMeu, "utilizatori.administreaza") && !eEuInsumi;
  const eroare = stareRol.eroare ?? stareStatus.eroare;

  return (
    <tr>
      <td className="px-4 py-3 font-medium">
        {utilizator.nume ?? "—"}
        {eEuInsumi ? <span className="ml-2 text-xs text-muted-foreground">(tu)</span> : null}
        {eroare ? (
          <span role="alert" className="mt-1 block text-xs font-medium text-destructive">
            {eroare}
          </span>
        ) : null}
      </td>

      <td className="px-4 py-3">{utilizator.email}</td>

      <td className="px-4 py-3">
        {potSchimbaRolul ? (
          <form action={actiuneRol} className="flex items-center gap-2">
            <input type="hidden" name="profileId" value={utilizator.id} />
            <Select name="rol" defaultValue={utilizator.rol} className="h-9 w-40 text-sm">
              {ROLURI.map((r) => (
                <option key={r} value={r}>
                  {ETICHETE_ROL[r]}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline" disabled={asterRol}>
              {asterRol ? "…" : "Salva"}
            </Button>
          </form>
        ) : (
          <span>{ETICHETE_ROL[utilizator.rol]}</span>
        )}
      </td>

      <td className="px-4 py-3 text-muted-foreground">{utilizator.ultimulAcces}</td>

      <td className="px-4 py-3">
        {potDezactiva ? (
          <form action={actiuneStatus}>
            <input type="hidden" name="profileId" value={utilizator.id} />
            <input
              type="hidden"
              name="status"
              value={utilizator.status === "active" ? "disabled" : "active"}
            />
            <Button
              type="submit"
              size="sm"
              variant={utilizator.status === "active" ? "outline" : "default"}
              disabled={asterStatus}
            >
              {asterStatus ? "…" : utilizator.status === "active" ? "Disattiva" : "Riattiva"}
            </Button>
          </form>
        ) : (
          <span
            className={
              utilizator.status === "active"
                ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
            }
          >
            {utilizator.status === "active" ? "Attivo" : "Disattivato"}
          </span>
        )}
      </td>
    </tr>
  );
}
