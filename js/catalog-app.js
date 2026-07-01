/**
 * TAURO TV — CATALOG APP
 * Busca posters en TMDB, renderiza el grid, filtros y búsqueda.
 * Fallback: logo de Tauro TV si no encuentra el título.
 */

(function () {
  'use strict';

  // ── TMDB Config ──
  const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhOGRhNDI0NWM3YTRhYzc3YWJhNWIxMjllNWM5YjkxMiIsInN1YiI6IjY1MTI0Njc2YTkxMTdmMDBlMTkzOWEwYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.v0A7A94gXqXaIc3xQsOsAozFXYC3cIILkSgi3rLRfZQ';
  const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
  const TMDB_IMG_BACKDROP = 'https://image.tmdb.org/t/p/w780';
  const CACHE_KEY = 'taurotv_tmdb_cache';
  const CACHE_VERSION = 2;

  // ── DOM Elements ──
  const grid = document.getElementById('catalog-grid');
  const loading = document.getElementById('catalog-loading');
  const empty = document.getElementById('catalog-empty');
  const countEl = document.getElementById('catalog-count');
  const searchInput = document.getElementById('catalog-search');
  const searchClear = document.getElementById('search-clear');
  const filterTags = document.querySelectorAll('.filter-tag[data-filter]');

  // ── State ──
  let allItems = [];       // enriched items with TMDB data
  let filteredItems = [];   // after filter + search
  let activeFilter = 'all';
  let searchTerm = '';
  let tmdbCache = loadCache();

  // ══════════════════════════════════════════════════════════
  // TMDB CACHE (localStorage)
  // ══════════════════════════════════════════════════════════
  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed._v !== CACHE_VERSION) return {};
      return parsed;
    } catch (e) { return {}; }
  }

  function saveCache() {
    try {
      tmdbCache._v = CACHE_VERSION;
      localStorage.setItem(CACHE_KEY, JSON.stringify(tmdbCache));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  // ══════════════════════════════════════════════════════════
  // TMDB SEARCH
  // ══════════════════════════════════════════════════════════
  async function searchTMDB(title, type) {
    const cacheKey = `${title}__${type}`;
    if (tmdbCache[cacheKey]) return tmdbCache[cacheKey];

    const searchType = type === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/search/${searchType}?query=${encodeURIComponent(title)}&language=es-MX&page=1`;

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${TMDB_TOKEN}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const result = data.results && data.results[0] ? data.results[0] : null;

      if (result) {
        const info = {
          poster: result.poster_path ? TMDB_IMG + result.poster_path : null,
          backdrop: result.backdrop_path ? TMDB_IMG_BACKDROP + result.backdrop_path : null,
          name: result.title || result.name || title,
          overview: result.overview || '',
          rating: result.vote_average ? result.vote_average.toFixed(1) : null,
          year: (result.release_date || result.first_air_date || '').substring(0, 4),
          tmdbType: searchType
        };
        tmdbCache[cacheKey] = info;
        return info;
      }
      // Cache "not found" too to avoid repeated calls
      tmdbCache[cacheKey] = { poster: null, name: title };
      return tmdbCache[cacheKey];
    } catch (e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  function renderGrid(items) {
    if (items.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      countEl.textContent = 'No se encontraron títulos';
      return;
    }

    empty.style.display = 'none';
    countEl.textContent = `${items.length} título${items.length !== 1 ? 's' : ''}`;

    grid.innerHTML = items.map((item, idx) => {
      const poster = item.tmdb && item.tmdb.poster;
      const typeLabel = item.type === 'tv' ? 'Serie' : 'Película';

      if (poster) {
        return `
          <div class="catalog-item" data-idx="${idx}" tabindex="0" role="button" aria-label="${item.title}">
            <img src="${poster}" alt="${item.title}" loading="lazy">
            <div class="catalog-item-info">
              <div class="catalog-item-title">${item.tmdb.name || item.title}</div>
              <div class="catalog-item-meta">
                ${item.tmdb.rating ? `<span class="catalog-item-rating">★ ${item.tmdb.rating}</span>` : ''}
                ${item.tmdb.year ? `<span class="catalog-item-year">${item.tmdb.year}</span>` : ''}
                <span class="catalog-item-type">${typeLabel}</span>
              </div>
            </div>
          </div>`;
      } else {
        return `
          <div class="catalog-item" data-idx="${idx}" tabindex="0" role="button" aria-label="${item.title}">
            <div class="catalog-item-fallback">
              <img src="images/logo/logo.svg" alt="Tauro TV">
              <span>${item.title}</span>
            </div>
            <div class="catalog-item-info">
              <div class="catalog-item-title">${item.title}</div>
              <div class="catalog-item-meta">
                <span class="catalog-item-type">${typeLabel}</span>
              </div>
            </div>
          </div>`;
      }
    }).join('');

    // Click handlers for modal
    grid.querySelectorAll('.catalog-item').forEach(el => {
      el.addEventListener('click', () => openModal(filteredItems[parseInt(el.dataset.idx)]));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openModal(filteredItems[parseInt(el.dataset.idx)]);
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // MODAL
  // ══════════════════════════════════════════════════════════
  function openModal(item) {
    if (!item) return;
    // Remove existing modal
    const existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();

    const tmdb = item.tmdb || {};
    const backdrop = tmdb.backdrop || tmdb.poster || '';
    const typeLabel = item.type === 'tv' ? 'Serie' : 'Película';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop open';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Cerrar">✕</button>
        ${backdrop ? `<img class="modal-poster" src="${backdrop}" alt="${item.title}">` : ''}
        <div class="modal-body">
          <h3 class="modal-title">${tmdb.name || item.title}</h3>
          <div class="modal-meta">
            ${tmdb.rating ? `<span class="modal-rating">★ ${tmdb.rating}</span>` : ''}
            ${tmdb.year ? `<span>${tmdb.year}</span>` : ''}
            <span>${typeLabel}</span>
            ${item.seasons ? `<span>${item.seasons} temporadas</span>` : ''}
          </div>
          ${tmdb.overview ? `<p class="modal-overview">${tmdb.overview}</p>` : ''}
          <a href="https://wa.me/50661719869?text=${encodeURIComponent('Hola! Me interesa ver ' + item.title + ' en Tauro TV 🐂')}" target="_blank" rel="noopener" class="modal-cta">
            Suscribirme para ver
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', handleEsc);
  }

  function closeModal() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
    }
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEsc);
  }

  function handleEsc(e) { if (e.key === 'Escape') closeModal(); }

  // ══════════════════════════════════════════════════════════
  // FILTER + SEARCH
  // ══════════════════════════════════════════════════════════
  function applyFilters() {
    filteredItems = allItems.filter(item => {
      // Category filter
      if (activeFilter !== 'all') {
        const cats = item.category.split(',').map(c => c.trim());
        if (!cats.includes(activeFilter)) return false;
      }
      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(s);
        const tmdbName = (item.tmdb && item.tmdb.name) ? item.tmdb.name.toLowerCase().includes(s) : false;
        if (!titleMatch && !tmdbName) return false;
      }
      return true;
    });
    renderGrid(filteredItems);
  }

  // ── Filter tag clicks ──
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      activeFilter = tag.dataset.filter;
      applyFilters();
    });
  });

  // ── Search input ──
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTerm = searchInput.value.trim();
    searchClear.style.display = searchTerm ? 'block' : 'none';
    searchTimeout = setTimeout(applyFilters, 200);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    searchClear.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });

  // ══════════════════════════════════════════════════════════
  // INIT — Load data + fetch TMDB in batches
  // ══════════════════════════════════════════════════════════
  async function init() {
    // Shuffle data slightly for visual variety (keep categories grouped loosely)
    allItems = CATALOG_DATA.map(item => ({ ...item, tmdb: null }));

    // Render immediately with empty posters
    filteredItems = allItems;
    renderGrid(filteredItems);
    loading.style.display = 'none';

    // Fetch TMDB data in batches (to not overwhelm the API)
    const BATCH_SIZE = 8;
    const DELAY = 100; // ms between batches

    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);
      const promises = batch.map(item => searchTMDB(item.title, item.type));
      const results = await Promise.all(promises);

      results.forEach((tmdbData, idx) => {
        allItems[i + idx].tmdb = tmdbData;
      });

      // Re-render periodically as posters load (every 3 batches)
      if (i % (BATCH_SIZE * 3) === 0 || i + BATCH_SIZE >= allItems.length) {
        applyFilters();
      }

      // Save cache periodically
      if (i % (BATCH_SIZE * 5) === 0) saveCache();

      // Small delay to respect rate limits
      if (i + BATCH_SIZE < allItems.length) {
        await new Promise(r => setTimeout(r, DELAY));
      }
    }

    // Final save
    saveCache();
    applyFilters();
  }

  init();
})();
