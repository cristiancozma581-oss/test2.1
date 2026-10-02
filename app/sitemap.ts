import type { MetadataRoute } from "next";
import { servicii } from "@/lib/immy/dal/catalog";
import { urlPublic } from "@/lib/immy/env";

/**
 * Harta sitului (§58).
 *
 * Paginile de serviciu vin din bază: un serviciu adăugat din admin apare în
 * sitemap fără nicio schimbare de cod. Zonele private (`/area-cliente`,
 * `/operatore`, `/admin`) lipsesc intenționat.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baza = urlPublic();
  const acum = new Date();

  const statice: MetadataRoute.Sitemap = [
    { url: baza, lastModified: acum, changeFrequency: "weekly", priority: 1 },
    { url: `${baza}/servizi`, lastModified: acum, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baza}/prenota`, lastModified: acum, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baza}/come-funziona`, lastModified: acum, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baza}/faq`, lastModified: acum, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baza}/contatti`, lastModified: acum, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baza}/privacy`, lastModified: acum, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baza}/termini`, lastModified: acum, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dacă baza nu răspunde, sitemap-ul rămâne cu paginile statice în loc să
  // arunce și să lase ruta întreagă în eroare.
  let dinamice: MetadataRoute.Sitemap = [];
  try {
    dinamice = (await servicii()).map((s) => ({
      url: `${baza}/servizi/${s.slug}`,
      lastModified: acum,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    dinamice = [];
  }

  return [...statice, ...dinamice];
}
