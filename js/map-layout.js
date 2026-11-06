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

/** Names for picker slots a creator has no video for yet. */
const SLOT_NAMES = {
  cache: "Cache",
  anubis: "Anubis",
  inferno: "Inferno",
  mirage: "Mirage",
  dust2: "Dust II",
  nuke: "Nuke",
  ancient: "Ancient",
  overpass: "Overpass",
  train: "Train",
  vertigo: "Vertigo",
};

/**
 * Empty stand-in so every creator shows the same 10 slots.
 * @param {string} slug
 * @returns {{ slug: string, name: string, nameTh: string, smokes: [], empty: true }}
 */
function emptyMap(slug) {
  const name = SLOT_NAMES[slug];
  return { slug, name, nameTh: name, smokes: [], empty: true };
}

/**
 * @param {Array<{ slug: string, name: string, nameTh?: string, smokes: unknown[] }>} maps
 */
export function getMapsForPickerGrid(maps) {
  const bySlug = new Map(maps.map((m) => [m.slug, m]));
  return PICKER_GRID_SLUGS.map((slug) => bySlug.get(slug) ?? emptyMap(slug));
}

/**
 * @param {Array<{ slug: string }>} maps
 * @param {string} slug
 */
export function resolveMapBySlug(maps, slug) {
  const found = maps.find((m) => m.slug === slug);
  if (found) return found;
  return PICKER_GRID_SLUGS.includes(slug) ? emptyMap(slug) : undefined;
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
