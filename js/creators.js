/**
 * Whose guide videos the viewer can pick. Each creator has its own data file
 * in the same shape as `data/smokes.json`: `{ version, channel, maps: [...] }`.
 *
 * The first entry is the default: map links without `?by=` open it, so links
 * shared before creators existed keep opening CS Tactics.
 */

/**
 * @typedef {object} Creator
 * @property {string} id       used in `?by=` and storage keys
 * @property {string} name     label on the header switch
 * @property {string} handle
 * @property {string} url      opened by the header's YouTube link
 * @property {string} dataUrl
 * @property {{ one: string, other: string }} units  word after the count on map cards
 */

/** @type {Creator[]} */
export const CREATORS = [
  {
    id: "cstactics",
    name: "CS Tactics",
    handle: "@CS2Tactics",
    url: "https://www.youtube.com/@CS2Tactics/videos",
    dataUrl: "data/smokes.json",
    // CS Tactics guides are smokes only.
    units: { one: "smoke", other: "smokes" },
  },
  {
    id: "nxz",
    name: "NXZ",
    handle: "@nxznxznxz",
    url: "https://www.youtube.com/playlist?list=PLX-fCrB2FJLqmFLQ0dvM_yl8wHRgsQPNG",
    dataUrl: "data/nxz.json",
    // NXZ guides mix smokes, molotovs and flashes.
    units: { one: "lineup", other: "lineups" },
  },
];

export const DEFAULT_CREATOR = CREATORS[0];

/**
 * @param {string | null | undefined} id
 */
export function findCreator(id) {
  return CREATORS.find((c) => c.id === id) ?? null;
}
