import { DEFAULT_CREATOR } from "./creators.js";

const STORAGE_KEY = "cs2-quick-smoke-catalog";
const CREATOR_KEY = "cs2-quick-smoke-creator";

/**
 * The default creator keeps the original key, so copies saved before there
 * was a creator choice still work offline.
 * @param {string} creatorId
 */
function catalogKey(creatorId) {
  return creatorId === DEFAULT_CREATOR.id
    ? STORAGE_KEY
    : `${STORAGE_KEY}:${creatorId}`;
}

/**
 * @param {string} creatorId
 * @param {unknown} data
 */
export function saveCatalogToStorage(creatorId, data) {
  try {
    localStorage.setItem(catalogKey(creatorId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} creatorId
 * @returns {object | null}
 */
export function readCatalogFromStorage(creatorId) {
  try {
    const raw = localStorage.getItem(catalogKey(creatorId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @returns {string | null} */
export function readPreferredCreatorId() {
  try {
    return localStorage.getItem(CREATOR_KEY);
  } catch {
    return null;
  }
}

/**
 * @param {string} creatorId
 */
export function savePreferredCreatorId(creatorId) {
  try {
    localStorage.setItem(CREATOR_KEY, creatorId);
  } catch {
    /* quota / private mode */
  }
}
