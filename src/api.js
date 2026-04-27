import { supabase } from './supabaseClient'
import { debugLog } from './debugLog'

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
    debugLog('WARN', `LL2 rate limit hit, Retry-After=${retryAfter}s`);
    throw new RateLimitError(`Rate limited by LL2 API. Retry after ${retryAfter}s.`, retryAfter);
  }

  if (!res.ok) {
    debugLog('ERROR', `LL2 API error ${res.status}: ${res.statusText}`);
    throw new Error(`LL2 API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch all launches for any rocket by name.
 * First checks Supabase shared cache; falls back to LL2 API and writes results back.
 * Also caches in localStorage per rocket for CACHE_TTL_MS.
 *
 * @param {string} rocketName - LL2 rocket configuration name (e.g. 'Electron', 'Falcon 9')
 * @param {boolean} [forceRefresh=false] - Bypass cache and re-fetch live data.
 * @returns {Promise<Launch[]>}
 */
export async function fetchLaunchesByRocket(rocketName, forceRefresh = false) {
  const key = rocketCacheKey(rocketName);

  if (!forceRefresh) {
    // 1. Check localStorage (fast, avoids even a Supabase round-trip)
    const localCached = readCacheByKey(key);
    if (localCached) return localCached;

    // 2. Check Supabase shared cache
    const sbLaunches = await readLaunchesFromSupabase(rocketName);
    if (sbLaunches) {
      writeCacheByKey(key, sbLaunches);
      return sbLaunches;
    }
  }

  // 3. Fall back to LL2 API
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

  // Write to Supabase in the background (don't block the caller)
  writeLaunchesToSupabase(rocketName, launches).catch(() => {});

  return launches;
}

/** Read all launches for a rocket from the Supabase shared cache. Returns null if empty. */
async function readLaunchesFromSupabase(rocketName) {
  if (!supabase) return null;
  try {
    debugLog('SUPABASE', `Reading rocket_launches for ${rocketName}…`);
    const { data, error } = await supabase
      .from('rocket_launches')
      .select('data')
      .eq('rocket_name', rocketName);

    if (error || !data || data.length === 0) {
      debugLog('SUPABASE', `No cached launches for ${rocketName}`);
      return null;
    }
    debugLog('SUPABASE', `Got ${data.length} launches for ${rocketName} from Supabase`);
    return data.map(row => row.data);
  } catch {
    return null;
  }
}

/** Write launches for a rocket into the Supabase shared cache (upsert). */
async function writeLaunchesToSupabase(rocketName, launches) {
  if (!supabase) return;
  const rows = launches.map(l => ({
    rocket_name: rocketName,
    launch_id: l.id,
    data: l,
    fetched_at: new Date().toISOString(),
  }));

  await supabase
    .from('rocket_launches')
    .upsert(rows, { onConflict: 'rocket_name,launch_id' });
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

const ST_CACHE_KEY = 'st_signals_v2';
const ST_LAST_FETCH_KEY = 'st_last_fetch';
const ST_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (localStorage freshness)
const ST_SUPABASE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (shared cache window)
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
 * Read the freshest signal snapshot from Supabase.
 * Returns null if no snapshot exists or the most recent is older than maxAgeMs.
 */
async function readSignalsFromSupabase(maxAgeMs = ST_SUPABASE_TTL_MS) {
  if (!supabase) {
    debugLog('SUPABASE', 'Client is null — env vars missing from build');
    return null;
  }
  try {
    debugLog('SUPABASE', 'Reading signal_snapshots…');
    const { data, error } = await supabase
      .from('signal_snapshots')
      .select('id, signals, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      debugLog('ERROR', `Supabase query error: ${error.code} — ${error.message}`);
      debugLog('CACHE', 'Supabase stale/empty, checking localStorage…');
      return null;
    }
    if (!data) {
      debugLog('SUPABASE', 'No snapshot found (table empty or RLS blocking)');
      debugLog('CACHE', 'Supabase stale/empty, checking localStorage…');
      return null;
    }

    const ageMs = Date.now() - new Date(data.created_at).getTime();
    const ageMin = Math.round(ageMs / 60000);
    if (ageMs > maxAgeMs) {
      const ageH = (ageMs / 3600000).toFixed(1);
      debugLog('WARN', `Snapshot stale (${ageH}h old > ${maxAgeMs / 3600000}h TTL), falling back`);
      debugLog('CACHE', 'Supabase stale/empty, checking localStorage…');
      return null;
    }
    debugLog('SUPABASE', `Using Supabase snapshot id=${data.id} age=${ageMin}min`);
    return data.signals;
  } catch (e) {
    debugLog('ERROR', `Supabase threw: ${e?.message ?? String(e)}`);
    return null;
  }
}

/**
 * Fetch the two most-recent signal snapshots from Supabase.
 * Used by the fake-refresh animation: show [1] on initial render, animate to [0].
 * Returns { current, previous } — either may be null.
 */
export async function readTwoSignalSnapshots() {
  if (!supabase) return { current: null, previous: null };
  try {
    const { data, error } = await supabase
      .from('signal_snapshots')
      .select('id, signals, created_at')
      .order('created_at', { ascending: false })
      .limit(2);
    if (error || !data?.length) return { current: null, previous: null };
    return {
      current:  data[0]?.signals ?? null,
      previous: data[1]?.signals ?? null,
    };
  } catch {
    return { current: null, previous: null };
  }
}

/** Write a signal snapshot to Supabase. Fire-and-forget — errors are swallowed. */
async function writeSignalsToSupabase(signals) {
  if (!supabase) return;
  try {
    await supabase.from('signal_snapshots').insert({ signals });
  } catch {
    // Non-fatal — localStorage still has the data
  }
}

/**
 * Fetch fresh Space Terminal signals for all companies.
 * Cache hierarchy:
 *   1. Supabase snapshot (< 6h old) → use it, no API calls
 *   2. Existing fresh localStorage → use it
 *   3. Direct API fetch → write to both localStorage and Supabase
 *
 * Calls onProgress(message, step, total) as each source is queried.
 * Returns a signals map: { [companyId]: { media, hiring, buzz, investment, operations } }
 */
export async function fetchSpaceTerminalSignals(companies, onProgress) {
  const report = (msg, step, total) => onProgress?.(msg, step, total);

  // ── 0. Try Supabase shared cache first ────────────────────────────────────
  report('Checking shared cache…', 0, 5);
  const sbSignals = await readSignalsFromSupabase();
  if (sbSignals) {
    // Populate localStorage too so subsequent page loads are instant
    writeCacheByKey(ST_CACHE_KEY, sbSignals);
    try { localStorage.setItem(ST_LAST_FETCH_KEY, String(Date.now())); } catch {}
    debugLog('CACHE', 'Wrote Supabase snapshot to localStorage');
    report('Loaded from shared cache', 5, 5);
    return sbSignals;
  }

  // ── 1. Fall back to fresh localStorage ───────────────────────────────────
  try {
    const raw = localStorage.getItem(ST_CACHE_KEY);
    if (raw) {
      const { timestamp, data } = JSON.parse(raw);
      if (data && Date.now() - timestamp <= ST_CACHE_TTL_MS) {
        const ageMin = Math.round((Date.now() - timestamp) / 60000);
        debugLog('CACHE', `Using fresh localStorage snapshot age=${ageMin}min`);
        return data;
      }
    }
  } catch {}
  debugLog('CACHE', 'localStorage stale/empty — fetching live signals');

  // Compute 30-days-ago timestamp
  const since30d = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  // ── 1. Media — Spaceflight News API ──────────────────────────────────────
  report('Scanning news coverage…', 1, 7);
  debugLog('API', `Fetching Spaceflight News counts for ${companies.length} companies since ${sinceDate}`);
  const mediaRaw = await Promise.all(
    companies.map(c => fetchSpaceNewsCount(c.name, sinceDate))
  );
  debugLog('DATA', `Media raw: ${companies.map((c, i) => `${c.name}=${mediaRaw[i]}`).join(', ')}`);

  // ── 2. Hiring — job count / headcount = growth rate ──────────────────────
  report('Checking job boards…', 2, 7);
  debugLog('API', `Fetching job board counts for ${companies.length} companies`);
  const jobCounts = await Promise.all(
    companies.map(c => {
      if (c.greenhouse)      return fetchGreenhouseCount(c.greenhouse);
      if (c.lever)           return fetchLeverCount(c.lever);
      if (c.smartrecruiters) return fetchSmartRecruitersCount(c.smartrecruiters);
      return Promise.resolve(0);
    })
  );
  // Growth rate: open positions as a fraction of existing headcount
  const hiringRaw = companies.map((c, i) =>
    (c.headcount > 0) ? jobCounts[i] / c.headcount : 0
  );
  debugLog('DATA', `Hiring raw (growth rates): ${companies.map((c, i) => `${c.name}=${hiringRaw[i].toFixed(3)}`).join(', ')}`);

  // ── 3. Buzz — HN Algolia + Reddit (parallel) ─────────────────────────────
  report('Analyzing buzz…', 3, 7);
  debugLog('API', `Fetching HN + Reddit counts for ${companies.length} companies`);
  const [hnCounts, redditCounts] = await Promise.all([
    Promise.all(companies.map(c => fetchHNCount(c.hnQuery, since30d))),
    Promise.all(companies.map(c => fetchRedditCount(c.redditQuery ?? c.name))),
  ]);
  const buzzRaw = companies.map((_, i) => hnCounts[i] + redditCounts[i]);
  debugLog('DATA', `Buzz raw: ${companies.map((c, i) => `${c.name}=HN${hnCounts[i]}+R${redditCounts[i]}`).join(', ')}`);

  // ── 4. Interest — Wikipedia pageviews (last full month) ──────────────────
  report('Measuring web interest…', 4, 7);
  debugLog('API', `Fetching Wikipedia pageviews for ${companies.length} companies`);
  const investRaw = await Promise.all(
    companies.map(c => fetchWikiViews(c.wikiTitle))
  );
  debugLog('DATA', `Interest raw: ${companies.map((c, i) => `${c.name}=${investRaw[i]}`).join(', ')}`);

  // ── 5. Ops sub-signals ────────────────────────────────────────────────────
  // a) Launch count from Supabase cache
  report('Pulling launch cadence…', 5, 7);
  debugLog('SUPABASE', `Reading launch cadence for ${companies.length} companies from cache`);
  const launchCounts = await Promise.all(
    companies.map(c => fetchRecentLaunchCount(c.ll2Rockets))
  );
  debugLog('DATA', `Launches raw: ${companies.map((c, i) => `${c.name}=${launchCounts[i]}`).join(', ')}`);

  // b) Government contracts (USASpending) — total $ last 365 days
  report('Checking government contracts…', 6, 7);
  debugLog('API', `Fetching USASpending contracts for ${companies.length} companies`);
  const contractValues = await Promise.all(
    companies.map(c => fetchUSASpendingValue(c.usaSpendingQuery))
  );
  debugLog('DATA', `Contracts raw: ${companies.map((c, i) => `${c.name}=$${(contractValues[i]/1e6).toFixed(1)}M`).join(', ')}`);

  // ── Ops composite: market-share each sub-signal, then weight ─────────────
  // 50% contracts, 30% launches, 20% hiring rate (growth signal leaks in)
  const contractMs = marketShare(contractValues);
  const launchMs   = marketShare(launchCounts);
  const hiringForOpsMs = marketShare(hiringRaw);
  const opsRaw = companies.map((_, i) =>
    0.5 * contractMs[i] + 0.3 * launchMs[i] + 0.2 * hiringForOpsMs[i]
  );
  // opsRaw sums to 100 (0.5+0.3+0.2=1 × 100 each sub)

  // ── Market-share normalization: each domain column sums to 100 ───────────
  report('Building intelligence…', 7, 7);
  const mediaScore  = marketShare(mediaRaw);
  const hiringScore = marketShare(hiringRaw);
  const buzzScore   = marketShare(buzzRaw);
  const investScore = marketShare(investRaw);
  const opsScore    = marketShare(opsRaw); // re-rounds the weighted floats

  const signals = {};
  companies.forEach((c, i) => {
    signals[c.id] = {
      media:      mediaScore[i],
      hiring:     hiringScore[i],
      buzz:       buzzScore[i],
      investment: investScore[i],
      operations: opsScore[i],
      _raw: {
        media:       mediaRaw[i],
        hiring:      jobCounts[i],
        hiringRate:  hiringRaw[i],
        buzz:        buzzRaw[i],
        hn:          hnCounts[i],
        reddit:      redditCounts[i],
        investment:  investRaw[i],
        launches:    launchCounts[i],
        contracts:   contractValues[i],
      },
    };
    debugLog('DATA', `${c.name}: media=${mediaScore[i]}, hiring=${hiringScore[i]}, buzz=${buzzScore[i]}, interest=${investScore[i]}, ops=${opsScore[i]}`);
  });

  // Persist to localStorage
  writeCacheByKey(ST_CACHE_KEY, signals);
  try { localStorage.setItem(ST_LAST_FETCH_KEY, String(Date.now())); } catch {}
  debugLog('CACHE', 'Wrote signals to localStorage');

  // Write to Supabase in the background so next visitor skips the API calls
  writeSignalsToSupabase(signals)
    .then(() => debugLog('SUPABASE', 'Wrote signal snapshot to Supabase'))
    .catch(() => debugLog('ERROR', 'Failed to write signal snapshot to Supabase'));

  return signals;
}

// ── Signal source helpers ─────────────────────────────────────────────────────

async function fetchSpaceNewsCount(companyName, sinceDate) {
  try {
    const url = `https://api.spaceflightnewsapi.net/v4/articles/?search=${encodeURIComponent(companyName)}&published_at_gte=${sinceDate}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      debugLog('ERROR', `Spaceflight News ${res.status} for "${companyName}"`);
      return 0;
    }
    const json = await res.json();
    return json.count ?? 0;
  } catch (e) {
    debugLog('ERROR', `Spaceflight News fetch failed for "${companyName}": ${e.message}`);
    return 0;
  }
}

async function fetchGreenhouseCount(slug) {
  try {
    debugLog('API', `Fetching Greenhouse jobs for ${slug}`);
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (!res.ok) {
      debugLog('ERROR', `Greenhouse ${res.status} for ${slug}`);
      return 0;
    }
    const json = await res.json();
    return (json.jobs ?? []).length;
  } catch (e) {
    debugLog('ERROR', `Greenhouse fetch failed for ${slug}: ${e.message}`);
    return 0;
  }
}

async function fetchLeverCount(slug) {
  try {
    debugLog('API', `Fetching Lever jobs for ${slug}`);
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!res.ok) {
      debugLog('ERROR', `Lever ${res.status} for ${slug}`);
      return 0;
    }
    const json = await res.json();
    return Array.isArray(json) ? json.length : 0;
  } catch (e) {
    debugLog('ERROR', `Lever fetch failed for ${slug}: ${e.message}`);
    return 0;
  }
}

async function fetchSmartRecruitersCount(companyId) {
  try {
    debugLog('API', `Fetching SmartRecruiters jobs for ${companyId}`);
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings`);
    if (!res.ok) {
      debugLog('ERROR', `SmartRecruiters ${res.status} for ${companyId}`);
      return 0;
    }
    const json = await res.json();
    return json.totalFound ?? 0;
  } catch (e) {
    debugLog('ERROR', `SmartRecruiters fetch failed for ${companyId}: ${e.message}`);
    return 0;
  }
}

async function fetchRedditCount(query) {
  try {
    let total = 0;
    let after = null;
    const maxPages = 2; // up to 200 posts per company
    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://www.reddit.com/search.json');
      url.searchParams.set('q', `"${query}"`);
      url.searchParams.set('sort', 'new');
      url.searchParams.set('limit', '100');
      url.searchParams.set('t', 'month');
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'SpaceTerminal/1.0' } });
      if (!res.ok) break;
      const json = await res.json();
      const children = json?.data?.children ?? [];
      total += children.length;
      after = json?.data?.after;
      if (!after || children.length < 100) break;
    }
    debugLog('API', `Reddit "${query}": ${total} posts`);
    return total;
  } catch (e) {
    debugLog('ERROR', `Reddit fetch failed for "${query}": ${e.message}`);
    return 0;
  }
}

async function fetchUSASpendingValue(recipientQuery) {
  if (!recipientQuery) return 0;
  try {
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          recipient_search_text: [recipientQuery],
          time_period: [{ start_date: since, end_date: today }],
          award_type_codes: ['A', 'B', 'C', 'D'],
        },
        fields: ['Award Amount'],
        page: 1,
        limit: 100,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });
    if (!res.ok) {
      debugLog('ERROR', `USASpending ${res.status} for "${recipientQuery}"`);
      return 0;
    }
    const json = await res.json();
    const total = (json.results ?? []).reduce((sum, r) => sum + (r['Award Amount'] ?? 0), 0);
    debugLog('API', `USASpending "${recipientQuery}": $${(total / 1e6).toFixed(1)}M`);
    return total;
  } catch (e) {
    debugLog('ERROR', `USASpending fetch failed for "${recipientQuery}": ${e.message}`);
    return 0;
  }
}

// Proportional (largest-remainder) market share: each company gets a share
// such that all shares are integers and sum to exactly 100.
function marketShare(vals) {
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0) return vals.map(() => 0);
  const raw = vals.map(v => (v / total) * 100);
  const floors = raw.map(Math.floor);
  const remaining = 100 - floors.reduce((a, b) => a + b, 0);
  raw.map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remaining)
    .forEach(({ i }) => floors[i]++);
  return floors;
}

async function fetchHNCount(query, sinceTimestamp) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${sinceTimestamp}&hitsPerPage=1`;
    const res = await fetch(url);
    if (!res.ok) {
      debugLog('ERROR', `HN Algolia ${res.status} for "${query}"`);
      return 0;
    }
    const json = await res.json();
    return json.nbHits ?? 0;
  } catch (e) {
    debugLog('ERROR', `HN fetch failed for "${query}": ${e.message}`);
    return 0;
  }
}

async function fetchWikiViews(title) {
  try {
    // Use last full month — current month data is incomplete and Wikimedia
    // returns 0 for months with no complete bucket yet
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = lastMonth.getFullYear();
    const m = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, lastMonth.getMonth() + 1, 0).getDate();
    const start = `${y}${m}01`;
    const end   = `${y}${m}${String(lastDay).padStart(2, '0')}`;
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/monthly/${start}/${end}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SpaceTerminal/1.0' } });
    if (!res.ok) {
      debugLog('ERROR', `Wikipedia ${res.status} for "${title}"`);
      return 0;
    }
    const json = await res.json();
    const items = json.items ?? [];
    return items.reduce((sum, item) => sum + (item.views ?? 0), 0);
  } catch (e) {
    debugLog('ERROR', `Wikipedia fetch failed for "${title}": ${e.message}`);
    return 0;
  }
}

async function fetchRecentLaunchCount(rocketNames) {
  // Check Supabase cache first, then fall back to localStorage.
  // Never makes live LL2 calls — preserves the 15 req/hr free-tier quota.
  if (!rocketNames?.length) return 0;
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  let total = 0;
  for (const name of rocketNames) {
    try {
      // Prefer Supabase shared cache
      const sbLaunches = await readLaunchesFromSupabase(name);
      const source = sbLaunches ?? readStaleCacheByKey(rocketCacheKey(name));
      if (source) {
        total += source.filter(
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
