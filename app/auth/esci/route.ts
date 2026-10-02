import { iesi } from "@/app/(auth)/actiuni";

/**
 * Deconectarea, doar prin POST.
 *
 * Un GET ar putea fi declanșat de o imagine sau de un link străin, deconectând
 * utilizatorul fără voia lui. Nu e o breșă gravă, dar e o supărare pe care o
 * evităm cu o singură decizie de proiectare.
 */
export async function POST() {
  await iesi();
}
