import {
  readCatalogFromStorage,
  saveCatalogToStorage,
} from "./map-cache.js";
import {
  displayMapName,
  getMapsForPickerGrid,
  mapArtUrl,
  resolveMapBySlug,
} from "./map-layout.js";
import { getSmokeZone, SITE_ZONES } from "./site-zones.js";

const DATA_URL = "data/smokes.json";

/** @type {{ channel: object, maps: MapData[], version?: number } | null} */
let catalog = null;

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
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "home" };
  if (parts[0] === "map" && parts[1]) {
    return {
      view: "map",
      slug: decodeURIComponent(parts[1]),
      smokeId: parts[2] ? decodeURIComponent(parts[2]) : null,
    };
  }
  return { view: "home" };
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

async function loadCatalog() {
  if (catalog) return catalog;

  const stored = readCatalogFromStorage();

  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
    catalog = await res.json();
    saveCatalogToStorage(catalog);
    setCacheStatus(null);
    return catalog;
  } catch (networkErr) {
    if (stored?.maps?.length) {
      catalog = stored;
      setCacheStatus("ออฟไลน์ · ใช้ข้อมูลแมพจากแคช");
      return catalog;
    }
    throw networkErr instanceof Error
      ? networkErr
      : new Error("โหลดข้อมูลไม่สำเร็จ — ลองรีเฟรชหรือเช็คการเชื่อมต่อ");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("../sw.js", import.meta.url);
  navigator.serviceWorker.register(swUrl).catch(() => {
    /* localhost / unsupported */
  });
}

function mapPickCardHtml(map) {
  const label = displayMapName(map);
  const artSrc = mapArtUrl(map.slug);
  const countHtml =
    map.smokes?.length > 0
      ? `<span class="map-pick__count">${map.smokes.length} smokes</span>`
      : `<span class="map-pick__count map-pick__count--muted">เร็วๆ นี้</span>`;

  return `
    <a
      class="map-pick map-pick--grid"
      href="#/map/${escapeAttr(map.slug)}"
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

function renderHome(maps) {
  setPageMode("picker");
  const gridMaps = getMapsForPickerGrid(maps);

  app.innerHTML = `
    <div class="map-picker">
      <header class="map-picker__header">
        <p class="map-picker__eyebrow">เลือกแมพ · CS2 Smoke Guide</p>
      </header>

      <div class="map-picker__grid" role="list" aria-label="เลือกแมพ">
        ${gridMaps.map((m) => mapPickCardHtml(m)).join("")}
      </div>
    </div>
  `;
  document.title = "CS2 Quick Smoke Guide — เลือกแมพ";
  bindMapArtPlaceholders(app);
}

function renderEmptyMap(mapData) {
  setPageMode("detail");
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
      <p>แมพนี้เตรียมไว้เป็นช่องว่าง — จะเพิ่มวิดีโอและจุด smoke จาก CS Tactics ภายหลัง</p>
    </section>
  `;
  document.title = `CS2 Smoke — ${mapData.name || mapData.slug}`;
  bindMapArtPlaceholders(app);
  app.querySelector("[data-back]")?.addEventListener("click", () => navigate("/"));
}

function renderMap(mapData, selectedId) {
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
      renderMap(mapData, nextId);
    });
  });

  app.querySelectorAll("[data-smoke-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-smoke-id");
      navigate(`/map/${mapData.slug}/${id}`);
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
  const route = parseRoute();

  app.innerHTML = `<div class="loading">กำลังโหลด…</div>`;

  try {
    const data = await loadCatalog();
    const maps = data.maps.sort((a, b) =>
      (a.nameTh || a.name).localeCompare(b.nameTh || b.name, "th"),
    );

    if (route.view === "home") {
      delete app.dataset.filterArea;
      renderHome(maps);
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
      renderEmptyMap(mapData);
      return;
    }

    renderMap(mapData, route.smokeId || mapData.smokes[0]?.id);
  } catch (err) {
    setPageMode("detail");
    app.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  render();
});
