const BASE_URL = 'https://ll.thespacedevs.com/2.3.0';
const CACHE_KEY = 'electron_launches_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// LL2 free tier allows ~15 req/hr; page size 100 keeps Electron's ~86 launches to 1-2 calls
const PAGE_SIZE = 100;

/**
 * Fetch a single page from the LL2 launches endpoint.
 * Returns the raw { count, next, results } envelope.
 */
async function fetchPage(offset = 0) {
  const params = new URLSearchParams({
    rocket__configuration__name: 'Electron',
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
 * Fetch every Electron launch from LL2, paginating until exhausted.
 * Results are cached in localStorage for CACHE_TTL_MS.
 *
 * @param {boolean} [forceRefresh=false] - Bypass cache and re-fetch live data.
 * @returns {Promise<Launch[]>}
 */
export async function fetchAllElectronLaunches(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const launches = [];
  let offset = 0;
  let total = null;

  do {
    const page = await fetchPage(offset);
    if (total === null) total = page.count;
    launches.push(...page.results);
    offset += PAGE_SIZE;
  } while (offset < total);

  writeCache(launches);
  return launches;
}

/**
 * Return cached launches without a network call, or null if cache is stale/missing.
 * @returns {Launch[]|null}
 */
export function getCachedLaunches() {
  return readCache();
}

/**
 * Expire the localStorage cache so the next fetchAllElectronLaunches hits the network.
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * How old the current cache is, in milliseconds. Returns null if no cache exists.
 * @returns {number|null}
 */
export function cacheAgeMs() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp;
  } catch {
    return null;
  }
}

// ─── Cache helpers ───────────────────────────────────────────────────────────

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(launches) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: launches }));
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
