/** Display order: row 4 + row 4 + row 2 */
export const PICKER_GRID_SLUGS = [
  "cache",
  "anubis",
  "inferno",
  "mirage",
  "dust2",
  "nuke",
  "ancient",
  "overpass",
  "train",
  "vertigo",
];

/** @type {{ slug: string, name: string, nameTh: string, smokes: [], empty: true }} */
export const CACHE_MAP = {
  slug: "cache",
  name: "Cache",
  nameTh: "Cache",
  smokes: [],
  empty: true,
};

/**
 * @param {Array<{ slug: string, name: string, nameTh?: string, smokes: unknown[] }>} maps
 */
export function getMapsForPickerGrid(maps) {
  const bySlug = new Map(maps.map((m) => [m.slug, m]));

  return PICKER_GRID_SLUGS.map((slug) => {
    if (slug === "cache") {
      return bySlug.get("cache") ?? CACHE_MAP;
    }
    return bySlug.get(slug);
  }).filter(Boolean);
}

/**
 * @param {Array<{ slug: string }>} maps
 * @param {string} slug
 */
export function resolveMapBySlug(maps, slug) {
  if (slug === "cache") {
    return maps.find((m) => m.slug === "cache") ?? CACHE_MAP;
  }
  return maps.find((m) => m.slug === slug);
}

export function displayMapName(map) {
  const raw = map.name || map.nameTh || map.slug;
  if (raw.toLowerCase() === "cache") return "CACHE";
  if (raw.toLowerCase().includes("dust")) return "DUST II";
  return raw.replace(/\s+/g, " ").toUpperCase();
}

/** Relative path for map thumbnail assets (add file later). */
export function mapArtUrl(slug) {
  return `assets/maps/${slug}.jpg`;
}
