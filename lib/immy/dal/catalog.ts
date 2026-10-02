import "server-only";

import { cache } from "react";
import { clientPublic, clientSesiune } from "../supabase";

/**
 * Catalogul public: categorii, servicii, căutare (§6-§10).
 *
 * Toate citirile trec prin clientul anonim, sub RLS — politica din 0016 lasă la
 * vedere doar serviciile ACTIVE. Așa, o ciornă nu poate fi scoasă la iveală
 * ghicind slug-ul, iar codul de aici nu trebuie să-și amintească să filtreze.
 */

export type Categorie = {
  id: string;
  slug: string;
  nume: string;
  descriere: string | null;
  culoare: string;
  ordine: number;
};

export type ServiciuLista = {
  id: string;
  slug: string;
  nume: string;
  descriereScurta: string | null;
  durataMinute: number;
  pretCenti: number | null;
  rezervabilOnline: boolean;
  categorieId: string;
  categorieSlug: string;
  categorieNume: string;
  cuvinteCheie: string[];
};

export type ServiciuComplet = ServiciuLista & {
  descriere: string | null;
  cereDocumente: boolean;
  documente: { id: string; eticheta: string; indiciu: string | null; obligatoriu: boolean }[];
  pasi: { id: string; titlu: string; descriere: string | null }[];
  operatori: { id: string; nume: string; titlu: string | null; culoare: string; slug: string }[];
  faq: { id: string; intrebare: string; raspuns: string }[];
};

export const categorii = cache(async (): Promise<Categorie[]> => {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_categories")
    .select("id, slug, name, description, color, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    nume: c.name,
    descriere: c.description,
    culoare: c.color,
    ordine: c.sort_order,
  }));
});

const SELECT_SERVICIU = `
  id, slug, name, short_description, duration_minutes, price_cents,
  bookable_online, keywords, category_id,
  ie_categories!inner ( slug, name )
`;

type RandServiciu = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  duration_minutes: number;
  price_cents: number | null;
  bookable_online: boolean;
  keywords: string[] | null;
  category_id: string;
  ie_categories: { slug: string; name: string } | { slug: string; name: string }[] | null;
};

function laServiciu(r: RandServiciu): ServiciuLista {
  // PostgREST întoarce relația ca obiect sau ca tablou, în funcție de cum
  // deduce cardinalitatea; normalizăm o singură dată, aici.
  const cat = Array.isArray(r.ie_categories) ? r.ie_categories[0] : r.ie_categories;
  return {
    id: r.id,
    slug: r.slug,
    nume: r.name,
    descriereScurta: r.short_description,
    durataMinute: r.duration_minutes,
    pretCenti: r.price_cents,
    rezervabilOnline: r.bookable_online,
    categorieId: r.category_id,
    categorieSlug: cat?.slug ?? "",
    categorieNume: cat?.name ?? "",
    cuvinteCheie: r.keywords ?? [],
  };
}

export const servicii = cache(async (): Promise<ServiciuLista[]> => {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_services")
    .select(SELECT_SERVICIU)
    .eq("status", "ACTIVE")
    .order("sort_order");

  return ((data ?? []) as unknown as RandServiciu[]).map(laServiciu);
});

/**
 * Căutarea din §6.
 *
 * Două straturi, în ordinea asta:
 *   1. căutare pe text integral, cu configurația italiană și `unaccent` — ea
 *      înțelege că „cittadinanze" și „cittadinanza" sunt același cuvânt;
 *   2. dacă nu iese nimic, potrivire parțială pe nume, ca omul care a tastat
 *      „sogg" să vadă totuși ceva.
 *
 * Al doilea strat contează: căutarea pe text integral nu potrivește prefixe, iar
 * un catalog care răspunde „niciun rezultat" la jumătate de cuvânt pare stricat.
 */
export async function cautaServicii(interogare: string): Promise<ServiciuLista[]> {
  const q = interogare.trim();
  if (!q) return servicii();

  const sb = clientPublic();
  if (!sb) return [];

  const cuvinte = q.split(/\s+/).filter(Boolean);
  const expresie = cuvinte.map((c) => `${c}:*`).join(" & ");

  const { data } = await sb
    .from("ie_services")
    .select(SELECT_SERVICIU)
    .eq("status", "ACTIVE")
    .textSearch("search_vector", expresie, { config: "public.ie_it" })
    .limit(50);

  if (data && data.length > 0) {
    return (data as unknown as RandServiciu[]).map(laServiciu);
  }

  // `%` și `_` din interogare ar fi tratate ca jokeri de `ilike`; le anulăm.
  const sigur = q.replace(/[%_\\]/g, "\\$&");
  const { data: partial } = await sb
    .from("ie_services")
    .select(SELECT_SERVICIU)
    .eq("status", "ACTIVE")
    .ilike("name", `%${sigur}%`)
    .limit(50);

  return ((partial ?? []) as unknown as RandServiciu[]).map(laServiciu);
}

export const serviciu = cache(async (slug: string): Promise<ServiciuComplet | null> => {
  const sb = clientPublic();
  if (!sb) return null;

  const { data } = await sb
    .from("ie_services")
    .select(
      `${SELECT_SERVICIU}, description, requires_documents,
       ie_service_documents ( id, label, hint, is_required, sort_order ),
       ie_service_steps ( id, title, description, sort_order ),
       ie_operator_services ( ie_operators ( id, display_name, title, color, slug, is_active ) ),
       ie_faq ( id, question, answer, is_active, sort_order )`,
    )
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!data) return null;

  const r = data as unknown as RandServiciu & {
    description: string | null;
    requires_documents: boolean;
    ie_service_documents: {
      id: string; label: string; hint: string | null;
      is_required: boolean; sort_order: number;
    }[];
    ie_service_steps: {
      id: string; title: string; description: string | null; sort_order: number;
    }[];
    ie_operator_services: {
      ie_operators: {
        id: string; display_name: string; title: string | null;
        color: string; slug: string; is_active: boolean;
      } | null;
    }[];
    ie_faq: {
      id: string; question: string; answer: string;
      is_active: boolean; sort_order: number;
    }[];
  };

  return {
    ...laServiciu(r),
    descriere: r.description,
    cereDocumente: r.requires_documents,
    documente: (r.ie_service_documents ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => ({
        id: d.id,
        eticheta: d.label,
        indiciu: d.hint,
        obligatoriu: d.is_required,
      })),
    pasi: (r.ie_service_steps ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ id: p.id, titlu: p.title, descriere: p.description })),
    operatori: (r.ie_operator_services ?? [])
      .map((x) => x.ie_operators)
      .filter((o): o is NonNullable<typeof o> => Boolean(o?.is_active))
      .map((o) => ({
        id: o.id,
        nume: o.display_name,
        titlu: o.title,
        culoare: o.color,
        slug: o.slug,
      })),
    faq: (r.ie_faq ?? [])
      .filter((f) => f.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({ id: f.id, intrebare: f.question, raspuns: f.answer })),
  };
});

/** Serviciul după id — pentru fluxul de rezervare, care lucrează cu id-uri. */
export async function serviciuDupaId(id: string) {
  const sb = clientPublic();
  if (!sb) return null;

  const { data } = await sb
    .from("ie_services")
    .select("id, slug, name, duration_minutes, price_cents, status, bookable_online, requires_documents")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export const operatori = cache(async () => {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_operators")
    .select("id, slug, display_name, title, color, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((o) => ({
    id: o.id,
    slug: o.slug,
    nume: o.display_name,
    titlu: o.title,
    culoare: o.color,
  }));
});

/** Operatorii care pot presta un serviciu anume (§11). */
export async function operatoriPentruServiciu(serviceId: string) {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_operator_services")
    .select("ie_operators ( id, slug, display_name, title, color, sort_order, is_active )")
    .eq("service_id", serviceId);

  type Rand = {
    ie_operators: {
      id: string; slug: string; display_name: string; title: string | null;
      color: string; sort_order: number; is_active: boolean;
    } | null;
  };

  return ((data ?? []) as unknown as Rand[])
    .map((r) => r.ie_operators)
    .filter((o): o is NonNullable<typeof o> => Boolean(o?.is_active))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({
      id: o.id,
      slug: o.slug,
      nume: o.display_name,
      titlu: o.title,
      culoare: o.color,
    }));
}

export const intrebariFrecvente = cache(async () => {
  const sb = clientPublic();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_faq")
    .select("id, question, answer")
    .eq("is_active", true)
    .is("service_id", null)
    .order("sort_order");

  return (data ?? []).map((f) => ({ id: f.id, intrebare: f.question, raspuns: f.answer }));
});

/** Catalogul complet pentru administrare — include ciornele și arhivele. */
export async function catalogAdmin() {
  const sb = await clientSesiune();
  if (!sb) return [];

  const { data } = await sb
    .from("ie_services")
    .select(
      `id, slug, name, short_description, description, duration_minutes, price_cents,
       status, bookable_online, requires_documents, sort_order, keywords, category_id,
       ie_categories ( id, name, slug )`,
    )
    .order("sort_order");

  return data ?? [];
}
