import { CREATORS, DEFAULT_CREATOR, findCreator } from "./creators.js";
import {
  readCatalogFromStorage,
  readPreferredCreatorId,
  saveCatalogToStorage,
  savePreferredCreatorId,
} from "./map-cache.js";
import {
  displayMapName,
  getMapsForPickerGrid,
  mapArtUrl,
  resolveMapBySlug,
} from "./map-layout.js";
import { getSmokeZone, SITE_ZONES } from "./site-zones.js";

/** @typedef {import("./creators.js").Creator} Creator */

/**
 * @typedef {object} Smoke
 * @property {string} id
 * @property {string} name
 * @property {string} area
 * @property {number} seconds
 * @property {string} videoId
 */

/**
 * @typedef {object} MapData
 * @property {string} slug
 * @property {string} name
 * @property {string} nameTh
 * @property {string} videoId
 * @property {string} guideTitle
 * @property {Smoke[]} smokes
 */

/** @typedef {{ channel: object, maps: MapData[], version?: number }} Catalog */

/**
 * One fetch per creator, shared by every render that needs it.
 * @type {Map<string, Promise<{ data: Catalog, offline: boolean }>>}
 */
const catalogs = new Map();

/** Whose videos are showing. Follows the URL and is remembered for the next visit. */
let currentCreatorId =
  findCreator(readPreferredCreatorId())?.id ?? DEFAULT_CREATOR.id;

/** Bumped on every render so a slow fetch can't paint over a newer view. */
let renderSeq = 0;

const OFFLINE_STATUS = "ออฟไลน์ · ใช้ข้อมูลแมพจากแคช";

const app = document.getElementById("app");

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function youtubeEmbedUrl(videoId, startSeconds) {
  const params = new URLSearchParams({
    start: String(startSeconds),
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

function youtubeWatchUrl(videoId, startSeconds) {
  return `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`;
}

function parseRoute() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = hash.split("?");
  const creatorId = new URLSearchParams(query).get("by");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "map" && parts[1]) {
    return {
      view: "map",
      slug: decodeURIComponent(parts[1]),
      smokeId: parts[2] ? decodeURIComponent(parts[2]) : null,
      creatorId,
    };
  }
  return { view: "home", creatorId };
}

/** Left off for the default creator, so its links look exactly like before. */
function byQuery(creatorId) {
  return creatorId === DEFAULT_CREATOR.id
    ? ""
    : `?by=${encodeURIComponent(creatorId)}`;
}

function homePath(creatorId) {
  return `/${byQuery(creatorId)}`;
}

function mapPath(slug, smokeId, creatorId) {
  const smoke = smokeId ? `/${encodeURIComponent(smokeId)}` : "";
  return `/map/${encodeURIComponent(slug)}${smoke}${byQuery(creatorId)}`;
}

/** @returns {Creator} */
function routeCreator(route) {
  const fromUrl = findCreator(route.creatorId);
  if (fromUrl) return fromUrl;
  // Map links without ?by= were all made before there was a choice: CS Tactics.
  if (route.view === "map") return DEFAULT_CREATOR;
  return findCreator(currentCreatorId) ?? DEFAULT_CREATOR;
}

function setCurrentCreator(creatorId) {
  if (creatorId === currentCreatorId) return;
  currentCreatorId = creatorId;
  savePreferredCreatorId(creatorId);
}

function navigate(path) {
  location.hash = path;
}

function setCacheStatus(message) {
  const el = document.getElementById("cache-status");
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

/**
 * @param {Creator} creator
 * @returns {Promise<{ data: Catalog, offline: boolean }>}
 */
async function fetchCatalog(creator) {
  const stored = readCatalogFromStorage(creator.id);

  try {
    const res = await fetch(creator.dataUrl);
    if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
    const data = await res.json();
    saveCatalogToStorage(creator.id, data);
    return { data, offline: false };
  } catch (networkErr) {
    if (stored?.maps?.length) {
      return { data: stored, offline: true };
    }
    throw networkErr instanceof Error
      ? networkErr
      : new Error("โหลดข้อมูลไม่สำเร็จ — ลองรีเฟรชหรือเช็คการเชื่อมต่อ");
  }
}

/** @param {Creator} creator */
function loadCatalog(creator) {
  let pending = catalogs.get(creator.id);
  if (!pending) {
    pending = fetchCatalog(creator);
    catalogs.set(creator.id, pending);
    // Let the next render retry instead of replaying the failure.
    pending.catch(() => catalogs.delete(creator.id));
  }
  return pending;
}

/**
 * Other creators that have lineups for this map.
 * @param {string} slug
 * @param {string} exceptId
 * @returns {Promise<Creator[]>}
 */
async function creatorsWithMap(slug, exceptId) {
  const checks = CREATORS.filter((c) => c.id !== exceptId).map(async (c) => {
    try {
      const { data } = await loadCatalog(c);
      return data.maps.some((m) => m.slug === slug && m.smokes?.length)
        ? c
        : null;
    } catch {
      return null;
    }
  });
  return (await Promise.all(checks)).filter(Boolean);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("../sw.js", import.meta.url);
  navigator.serviceWorker.register(swUrl).catch(() => {
    /* localhost / unsupported */
  });
}

function initCreatorSwitch() {
  const options = document.getElementById("creator-options");
  if (!options) return;
  options.innerHTML = CREATORS.map(
    (c) => `
      <button type="button" class="creator-switch__opt" data-creator="${escapeAttr(c.id)}" aria-pressed="false">${escapeHtml(c.name)}</button>
    `,
  ).join("");
  options.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-creator]");
    if (btn) switchCreator(btn.getAttribute("data-creator"));
  });
}

/** @param {Creator} creator */
function renderCreatorSwitch(creator) {
  document.querySelectorAll("#creator-options [data-creator]").forEach((btn) => {
    const isActive = btn.getAttribute("data-creator") === creator.id;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });

  const link = document.getElementById("channel-link");
  if (link) {
    const label = `เปิดช่อง ${creator.name} บน YouTube`;
    link.href = creator.url;
    link.title = label;
    link.setAttribute("aria-label", label);
  }
}

function switchCreator(creatorId) {
  if (!findCreator(creatorId) || creatorId === currentCreatorId) return;
  setCurrentCreator(creatorId);

  const route = parseRoute();
  // Smoke ids differ between creators, so open the map at its first lineup.
  const path =
    route.view === "map"
      ? mapPath(route.slug, null, creatorId)
      : homePath(creatorId);

  if (location.hash === `#${path}`) {
    render();
  } else {
    navigate(path);
  }
}

/**
 * @param {MapData} map
 * @param {Creator} creator
 */
function mapPickCardHtml(map, creator) {
  const label = displayMapName(map);
  const artSrc = mapArtUrl(map.slug);
  const count = map.smokes?.length ?? 0;
  const unit = count === 1 ? creator.units.one : creator.units.other;
  const countHtml =
    count > 0
      ? `<span class="map-pick__count">${count} ${escapeHtml(unit)}</span>`
      : `<span class="map-pick__count map-pick__count--muted">ยังไม่มีคลิป</span>`;

  return `
    <a
      class="map-pick map-pick--grid"
      href="#${escapeAttr(mapPath(map.slug, null, creator.id))}"
      data-link
      data-map="${escapeAttr(map.slug)}"
      role="listitem"
    >
      <div class="map-pick__frame">
        <div class="map-pick__art" data-map-art>
          <img
            class="map-pick__thumb"
            src="${escapeAttr(artSrc)}"
            alt=""
            width="320"
            height="200"
            decoding="async"
            loading="lazy"
          />
        </div>
        <span class="map-pick__label">${escapeHtml(label)}</span>
        <span class="map-pick__pick">Pick</span>
      </div>
      ${countHtml}
    </a>
  `;
}

function bindMapArtPlaceholders(root) {
  root.querySelectorAll("[data-map-art]").forEach((slot) => {
    const img = slot.querySelector(".map-pick__thumb");
    if (!img) return;
    const markMissing = () => slot.classList.add("map-pick__art--empty");
    img.addEventListener("error", markMissing, { once: true });
    if (img.complete && img.naturalWidth === 0) markMissing();
  });
}

function setPageMode(mode) {
  document.body.classList.toggle("is-map-picker", mode === "picker");
  document.body.classList.toggle("is-map-detail", mode === "detail");
}

/**
 * @param {MapData[]} maps
 * @param {Creator} creator
 */
function renderHome(maps, creator) {
  setPageMode("picker");
  const gridMaps = getMapsForPickerGrid(maps);

  app.innerHTML = `
    <div class="map-picker">
      <header class="map-picker__header">
        <p class="map-picker__eyebrow">เลือกแมพ · CS2 Smoke Guide</p>
      </header>

      <div class="map-picker__grid" role="list" aria-label="เลือกแมพ">
        ${gridMaps.map((m) => mapPickCardHtml(m, creator)).join("")}
      </div>
    </div>
  `;
  document.title = "CS2 Quick Smoke Guide — เลือกแมพ";
  bindMapArtPlaceholders(app);
}

/**
 * @param {MapData} mapData
 * @param {Creator} creator
 * @param {Creator[]} alternatives creators that do have this map
 */
function renderEmptyMap(mapData, creator, alternatives) {
  setPageMode("detail");
  const altLinks = alternatives
    .map(
      (c) =>
        `<a href="#${escapeAttr(mapPath(mapData.slug, null, c.id))}">${escapeHtml(c.name)}</a>`,
    )
    .join(" หรือ ");

  app.innerHTML = `
    <div class="map-header">
      <button type="button" class="back-link" data-back>← กลับเลือกแมพ</button>
      <h1>${escapeHtml(displayMapName(mapData))}</h1>
    </div>
    <section class="panel map-empty">
      <div class="map-empty__slot map-pick__art" data-map-art>
        <img
          class="map-pick__thumb"
          src="${escapeAttr(mapArtUrl(mapData.slug))}"
          alt=""
          decoding="async"
        />
      </div>
      <h2>ยังไม่มี smoke lineup</h2>
      <p>ยังไม่มีคลิปสอนแมพนี้จาก ${escapeHtml(creator.name)}</p>
      ${altLinks ? `<p class="map-empty__alt">ดูของ ${altLinks} แทน</p>` : ""}
    </section>
  `;
  document.title = `CS2 Smoke — ${mapData.name || mapData.slug}`;
  bindMapArtPlaceholders(app);
  app.querySelector("[data-back]")?.addEventListener("click", () => navigate("/"));
}

/** First lineup in the active zone filter, so switching creators keeps the zone. */
function firstSmokeId(smokes) {
  const area = app.dataset.filterArea;
  const inZone =
    area && area !== "all"
      ? smokes.find((s) => getSmokeZone(s) === area)
      : null;
  return (inZone ?? smokes[0])?.id;
}

/**
 * @param {MapData} mapData
 * @param {string | undefined} selectedId
 * @param {Creator} creator
 */
function renderMap(mapData, selectedId, creator) {
  setPageMode("detail");
  const smokes = mapData.smokes;
  const selected =
    smokes.find((s) => s.id === selectedId) ?? smokes[0] ?? null;
  const activeArea = app.dataset.filterArea || "all";

  const filtered =
    activeArea === "all"
      ? smokes
      : smokes.filter((s) => getSmokeZone(s) === activeArea);

  app.innerHTML = `
    <div class="map-header">
      <button type="button" class="back-link" data-back>← กลับเลือกแมพ</button>
      <h1>${escapeHtml(mapData.nameTh || mapData.name)}</h1>
    </div>
    <div class="map-layout">
      <aside class="panel">
        <div class="panel__toolbar" role="group" aria-label="กรองโซน">
          <button type="button" class="filter-chip ${activeArea === "all" ? "is-active" : ""}" data-area="all" aria-pressed="${activeArea === "all"}">ทั้งหมด</button>
          ${SITE_ZONES.map(
            (z) => `
            <button type="button" class="filter-chip ${activeArea === z ? "is-active" : ""}" data-area="${escapeAttr(z)}" aria-pressed="${activeArea === z}">${escapeHtml(z)}</button>
          `,
          ).join("")}
        </div>
        <ul class="smoke-list" role="listbox" aria-label="รายการ smoke">
          ${
            filtered.length
              ? filtered
                  .map((s) => {
                    const isSel = selected && s.id === selected.id;
                    return `
              <li>
                <button
                  type="button"
                  class="smoke-item ${isSel ? "is-selected" : ""}"
                  data-smoke-id="${escapeAttr(s.id)}"
                  role="option"
                  aria-selected="${isSel}"
                >
                  <div class="smoke-item__area">${escapeHtml(getSmokeZone(s))}</div>
                  <div class="smoke-item__name">${escapeHtml(s.name)}</div>
                  <div class="smoke-item__time">${formatTime(s.seconds)}</div>
                </button>
              </li>
            `;
                  })
                  .join("")
              : `<li class="empty-state">ไม่มีรายการในโซนนี้</li>`
          }
        </ul>
      </aside>
      <section class="panel player-panel" aria-live="polite">
        ${
          selected
            ? `
          <h2>${escapeHtml(selected.name)}</h2>
          <div class="video-wrap">
            <iframe
              title="CS2 smoke: ${escapeAttr(selected.name)}"
              src="${youtubeEmbedUrl(selected.videoId, selected.seconds)}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
          <div class="player-actions">
            <a class="btn btn--primary" href="${youtubeWatchUrl(selected.videoId, selected.seconds)}" target="_blank" rel="noopener noreferrer">
              เปิดใน YouTube
            </a>
            <button type="button" class="btn" data-copy-link>คัดลอกลิงก์พร้อมเวลา</button>
          </div>
        `
            : `<div class="empty-state">ยังไม่มีข้อมูล smoke สำหรับแมพนี้</div>`
        }
      </section>
    </div>
  `;

  document.title = `CS2 Smoke — ${mapData.name}`;

  app.querySelector("[data-back]")?.addEventListener("click", () => navigate("/"));

  app.querySelectorAll("[data-area]").forEach((btn) => {
    btn.addEventListener("click", () => {
      app.dataset.filterArea = btn.getAttribute("data-area");
      const stillVisible = filtered.some((s) => s.id === selected?.id);
      const nextId = stillVisible ? selected?.id : filtered[0]?.id;
      renderMap(mapData, nextId, creator);
    });
  });

  app.querySelectorAll("[data-smoke-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-smoke-id");
      navigate(mapPath(mapData.slug, id, creator.id));
    });
  });

  const copyBtn = app.querySelector("[data-copy-link]");
  if (copyBtn && selected) {
    copyBtn.addEventListener("click", async () => {
      const url = youtubeWatchUrl(selected.videoId, selected.seconds);
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "คัดลอกแล้ว!";
        setTimeout(() => {
          copyBtn.textContent = "คัดลอกลิงก์พร้อมเวลา";
        }, 2000);
      } catch {
        window.prompt("คัดลอกลิงก์:", url);
      }
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

async function render() {
  const seq = ++renderSeq;
  const route = parseRoute();
  const creator = routeCreator(route);
  setCurrentCreator(creator.id);
  renderCreatorSwitch(creator);

  app.innerHTML = `<div class="loading">กำลังโหลด…</div>`;

  try {
    const { data, offline } = await loadCatalog(creator);
    if (seq !== renderSeq) return;
    setCacheStatus(offline ? OFFLINE_STATUS : null);

    const maps = data.maps.sort((a, b) =>
      (a.nameTh || a.name).localeCompare(b.nameTh || b.name, "th"),
    );

    if (route.view === "home") {
      delete app.dataset.filterArea;
      renderHome(maps, creator);
      return;
    }

    const mapData = resolveMapBySlug(maps, route.slug);
    if (!mapData) {
      setPageMode("detail");
      app.innerHTML = `
        <div class="error-box">ไม่พบแมพ "${escapeHtml(route.slug)}"</div>
        <p><a href="#/" data-link>กลับหน้าแรก</a></p>
      `;
      return;
    }

    if (!mapData.smokes?.length) {
      const alternatives = await creatorsWithMap(mapData.slug, creator.id);
      if (seq !== renderSeq) return;
      renderEmptyMap(mapData, creator, alternatives);
      return;
    }

    renderMap(mapData, route.smokeId || firstSmokeId(mapData.smokes), creator);
  } catch (err) {
    if (seq !== renderSeq) return;
    setPageMode("detail");
    app.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  initCreatorSwitch();
  render();
});
