import type { MetadataRoute } from "next";
import { urlPublic } from "@/lib/immy/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zonele private și API-urile nu au ce căuta într-un index public.
      disallow: ["/area-cliente", "/operatore", "/admin", "/api/", "/prenota/conferma"],
    },
    sitemap: `${urlPublic()}/sitemap.xml`,
  };
}
