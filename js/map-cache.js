const STORAGE_KEY = "cs2-quick-smoke-catalog";

/**
 * @param {unknown} data
 */
export function saveCatalogToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @returns {object | null}
 */
export function readCatalogFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
