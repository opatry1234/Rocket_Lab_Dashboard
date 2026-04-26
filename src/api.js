const BASE_URL = 'https://ll.thespacedevs.com/2.3.0';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// LL2 free tier allows ~15 req/hr; page size 100 keeps Electron's ~86 launches to 1-2 calls
const PAGE_SIZE = 100;

function rocketCacheKey(rocketName) {
  return `rl_dashboard_${rocketName.toLowerCase().replace(/\s+/g, '_')}_cache`;
}

// ─── Generic paginated fetch ──────────────────────────────────────────────────

async function fetchPageForRocket(rocketName, offset = 0) {
  const params = new URLSearchParams({
    rocket__configuration__name: rocketName,
    limit: PAGE_SIZE,
    offset,
    mode: 'detailed',
    ordering: 'net',
  });

  const res = await fetch(`${BASE_URL}/launches/?${params}`);

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    throw new RateLimitError(`Rate limited by LL2 API. Retry after ${retryAfter}s.`, retryAfter);
  }

  if (!res.ok) {
    throw new Error(`LL2 API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch all launches for any rocket by name from LL2, paginating until exhausted.
 * Results are cached in localStorage per rocket for CACHE_TTL_MS.
 *
 * @param {string} rocketName - LL2 rocket configuration name (e.g. 'Electron', 'Falcon 9')
 * @param {boolean} [forceRefresh=false] - Bypass cache and re-fetch live data.
 * @returns {Promise<Launch[]>}
 */
export async function fetchLaunchesByRocket(rocketName, forceRefresh = false) {
  const key = rocketCacheKey(rocketName);

  if (!forceRefresh) {
    const cached = readCacheByKey(key);
    if (cached) return cached;
  }

  const launches = [];
  let offset = 0;
  let total = null;

  do {
    const page = await fetchPageForRocket(rocketName, offset);
    if (total === null) total = page.count;
    launches.push(...page.results);
    offset += PAGE_SIZE;
  } while (offset < total);

  writeCacheByKey(key, launches);
  return launches;
}

export async function fetchAllElectronLaunches(forceRefresh = false) {
  return fetchLaunchesByRocket('Electron', forceRefresh);
}

/**
 * Return cached launches without a network call, or null if cache is stale/missing.
 * @returns {Launch[]|null}
 */
export function getCachedLaunches() {
  return readCacheByKey(rocketCacheKey('Electron'));
}

/**
 * Return any cached launches for a rocket, ignoring TTL.
 * Returns null only if no cache entry exists at all.
 * Used for stale-while-revalidate: show stale data instantly, refresh in background.
 * @param {string} rocketName
 * @returns {Launch[]|null}
 */
export function getStaleLaunchesByRocket(rocketName) {
  return readStaleCacheByKey(rocketCacheKey(rocketName));
}

export function getStaleElectronLaunches() {
  return getStaleLaunchesByRocket('Electron');
}

/**
 * Expire the localStorage cache so the next fetchAllElectronLaunches hits the network.
 */
export function clearCache() {
  localStorage.removeItem(rocketCacheKey('Electron'));
}

/**
 * How old the current cache is, in milliseconds. Returns null if no cache exists.
 * @returns {number|null}
 */
export function cacheAgeMs() {
  try {
    const raw = localStorage.getItem(rocketCacheKey('Electron'));
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp;
  } catch {
    return null;
  }
}

// ─── Cache helpers ───────────────────────────────────────────────────────────

function readCacheByKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

// Returns cached data regardless of age — used for stale-while-revalidate.
function readStaleCacheByKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).data ?? null;
  } catch {
    return null;
  }
}

function writeCacheByKey(key, launches) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: launches }));
  } catch {
    // localStorage quota exceeded — silently skip caching
  }
}

// ─── Custom errors ───────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─── Space Terminal Signal APIs ───────────────────────────────────────────────

const ST_CACHE_KEY = 'st_signals_v1';
const ST_LAST_FETCH_KEY = 'st_last_fetch';
const ST_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const ST_MIN_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/** Return cached Space Terminal signals regardless of age (stale-while-revalidate). */
export function getStaleSignals() {
  return readStaleCacheByKey(ST_CACHE_KEY);
}

/** Return cached signals only if still fresh (within TTL). */
export function getFreshSignals() {
  try {
    const raw = localStorage.getItem(ST_CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > ST_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

/** How many ms ago were signals last fetched. Returns Infinity if never. */
export function signalAgeMs() {
  try {
    const t = localStorage.getItem(ST_LAST_FETCH_KEY);
    return t ? Date.now() - parseInt(t, 10) : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Fetch fresh Space Terminal signals for all companies.
 * Calls onProgress(message, step, total) as each source is queried.
 * Returns a signals map: { [companyId]: { media, hiring, buzz, investment, operations } }
 */
export async function fetchSpaceTerminalSignals(companies, onProgress) {
  const report = (msg, step, total) => onProgress?.(msg, step, total);

  // Compute 30-days-ago timestamp
  const since30d = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  // ── 1. Media — Spaceflight News API ──────────────────────────────────────
  report('Scanning news coverage…', 1, 5);
  const mediaRaw = await Promise.all(
    companies.map(c => fetchSpaceNewsCount(c.name, sinceDate))
  );

  // ── 2. Hiring — Greenhouse / Lever ───────────────────────────────────────
  report('Checking job boards…', 2, 5);
  const hiringRaw = await Promise.all(
    companies.map(c => {
      if (c.greenhouse) return fetchGreenhouseCount(c.greenhouse);
      if (c.lever)      return fetchLeverCount(c.lever);
      return Promise.resolve(0);
    })
  );

  // ── 3. Buzz — HN Algolia ─────────────────────────────────────────────────
  report('Analyzing HN mentions…', 3, 5);
  const buzzRaw = await Promise.all(
    companies.map(c => fetchHNCount(c.hnQuery, since30d))
  );

  // ── 4. Investment proxy — Wikipedia pageviews ─────────────────────────────
  report('Measuring web interest…', 4, 5);
  const investRaw = await Promise.all(
    companies.map(c => fetchWikiViews(c.wikiTitle))
  );

  // ── 5. Operations — LL2 (12-month launch count) ───────────────────────────
  report('Pulling launch cadence…', 5, 5);
  const opsRaw = await Promise.all(
    companies.map(c => fetchRecentLaunchCount(c.ll2Rockets))
  );

  // ── Normalize each domain 0–100 relative to max ───────────────────────────
  report('Building intelligence…', 5, 5);
  const normalize = (vals) => {
    const max = Math.max(...vals.filter(v => v > 0), 1);
    return vals.map(v => Math.min(100, Math.round((v / max) * 100)));
  };

  const mediaNorm  = normalize(mediaRaw);
  const hiringNorm = normalize(hiringRaw);
  const buzzNorm   = normalize(buzzRaw);
  const investNorm = normalize(investRaw);
  const opsNorm    = normalize(opsRaw);

  const signals = {};
  companies.forEach((c, i) => {
    signals[c.id] = {
      media:      mediaNorm[i],
      hiring:     hiringNorm[i],
      buzz:       buzzNorm[i],
      investment: investNorm[i],
      operations: opsNorm[i],
      // Raw values stored for display/debugging
      _raw: {
        media:      mediaRaw[i],
        hiring:     hiringRaw[i],
        buzz:       buzzRaw[i],
        investment: investRaw[i],
        operations: opsRaw[i],
      },
    };
  });

  // Persist to localStorage
  writeCacheByKey(ST_CACHE_KEY, signals);
  try { localStorage.setItem(ST_LAST_FETCH_KEY, String(Date.now())); } catch {}

  return signals;
}

// ── Signal source helpers ─────────────────────────────────────────────────────

async function fetchSpaceNewsCount(companyName, sinceDate) {
  try {
    const url = `https://api.spaceflightnewsapi.net/v4/articles/?search=${encodeURIComponent(companyName)}&published_at_gte=${sinceDate}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const json = await res.json();
    return json.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchGreenhouseCount(slug) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (!res.ok) return 0;
    const json = await res.json();
    return (json.jobs ?? []).length;
  } catch {
    return 0;
  }
}

async function fetchLeverCount(slug) {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!res.ok) return 0;
    const json = await res.json();
    return Array.isArray(json) ? json.length : 0;
  } catch {
    return 0;
  }
}

async function fetchHNCount(query, sinceTimestamp) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${sinceTimestamp}&hitsPerPage=1`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const json = await res.json();
    return json.nbHits ?? 0;
  } catch {
    return 0;
  }
}

async function fetchWikiViews(title) {
  try {
    // Get the last full month's pageviews
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0'); // current month
    const start = `${y}${m}01`;
    const end   = `${y}${m}01`;
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/monthly/${start}/${end}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SpaceTerminal/1.0' } });
    if (!res.ok) return 0;
    const json = await res.json();
    const items = json.items ?? [];
    return items.reduce((sum, item) => sum + (item.views ?? 0), 0);
  } catch {
    return 0;
  }
}

async function fetchRecentLaunchCount(rocketNames) {
  // ONLY use already-cached LL2 data — never make fresh LL2 calls here.
  // This prevents the Space Terminal signal fetch from burning the 15 req/hr
  // LL2 free-tier quota that the Electron/vehicle pages need.
  // Ops scores populate naturally as users visit vehicle pages and LL2 data gets cached.
  if (!rocketNames?.length) return 0;
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  let total = 0;
  for (const name of rocketNames) {
    try {
      const cached = readStaleCacheByKey(rocketCacheKey(name));
      if (cached) {
        total += cached.filter(
          l => l.net && l.net >= since &&
               l.status?.abbrev !== 'TBD' &&
               l.status?.abbrev !== 'Go' &&
               l.status?.abbrev !== 'TBC'
        ).length;
      }
    } catch {
      // skip
    }
  }
  return total;
}
