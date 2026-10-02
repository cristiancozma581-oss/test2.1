import { NextResponse, type NextRequest } from "next/server";
import { linkDocument } from "@/lib/immy/dal/documente";

/**
 * Emiterea unui link semnat către un document (§24, §62).
 *
 * Ruta NU servește fișierul: întoarce o adresă temporară către storage. Toată
 * verificarea de acces se face în `linkDocument`, care refuză și auditează
 * încercările de a deschide documentul altcuiva.
 *
 * Răspunsul la refuz este 404, nu 403: un 403 ar confirma că documentul există.
 */
export const dynamic = "force-dynamic";

export async function GET(
  cerere: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const versiune = cerere.nextUrl.searchParams.get("versione");

  const rezultat = await linkDocument(
    id,
    versiune ? Number(versiune) : undefined,
  );

  if (!rezultat.ok) {
    return NextResponse.json({ eroare: rezultat.eroare }, { status: 404 });
  }

  return NextResponse.json(rezultat.date, {
    // Un link semnat nu are ce căuta într-un cache intermediar.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
