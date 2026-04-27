#!/usr/bin/env node
// Server-side signal fetcher for Space Terminal.
// Runs all signal APIs, applies market-share normalization, and upserts
// a snapshot into Supabase signal_snapshots.
//
// Scoring methodology:
//   Media     — SNAPI article count (last 30d), market-shared across companies
//   Hiring    — open_jobs / headcount growth rate, market-shared
//   Buzz      — HN Algolia + Reddit post count (last 30d), market-shared
//   Interest  — Wikipedia pageviews (last full month), market-shared
//   Ops       — composite: 50% contracts (USASpending $), 30% launches, 20% hiring rate
//
// Run on a schedule (e.g. cron) to keep data fresh without hitting client rate limits.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const paths = [join(__dirname, '../.env.local'), join(__dirname, '../.env')]
  for (const p of paths) {
    try {
      const content = readFileSync(p, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) process.env[key] = val
      }
      return
    } catch { /* try next */ }
  }
}

loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Company definitions ──────────────────────────────────────────────────────

const COMPANIES = [
  {
    id: 'spacex', name: 'SpaceX',
    greenhouse: 'spacex', lever: null,
    headcount: 13000,
    usaSpendingQuery: 'Space Exploration Technologies',
    redditQuery: 'SpaceX',
    wikiTitle: 'SpaceX', hnQuery: 'SpaceX',
    ll2Rockets: ['Falcon 9', 'Falcon Heavy', 'Starship'],
  },
  {
    id: 'rocket-lab', name: 'Rocket Lab',
    greenhouse: 'rocketlab', lever: null,
    headcount: 2000,
    usaSpendingQuery: 'Rocket Lab USA',
    redditQuery: 'Rocket Lab',
    wikiTitle: 'Rocket_Lab', hnQuery: 'Rocket Lab',
    ll2Rockets: ['Electron'],
  },
  {
    id: 'blue-origin', name: 'Blue Origin',
    greenhouse: null, lever: 'blueorigin',
    headcount: 11000,
    usaSpendingQuery: 'Blue Origin',
    redditQuery: 'Blue Origin',
    wikiTitle: 'Blue_Origin', hnQuery: 'Blue Origin',
    ll2Rockets: ['New Glenn', 'New Shepard'],
  },
  {
    id: 'firefly', name: 'Firefly Aerospace',
    greenhouse: null, lever: null, smartrecruiters: 'FireflyAerospace',
    headcount: 300,
    usaSpendingQuery: 'Firefly Aerospace',
    redditQuery: 'Firefly Aerospace',
    wikiTitle: 'Firefly_Aerospace', hnQuery: 'Firefly Aerospace',
    ll2Rockets: ['Alpha'],
  },
  {
    id: 'vast', name: 'Vast',
    greenhouse: 'vast', lever: null,
    headcount: 150,
    usaSpendingQuery: 'Vast, Inc.',
    redditQuery: 'Vast Space',
    wikiTitle: 'Vast_(company)', hnQuery: 'Vast Space',
    ll2Rockets: [],
  },
  {
    id: 'relativity', name: 'Relativity Space',
    greenhouse: 'relativity', lever: null,
    headcount: 500,
    usaSpendingQuery: 'Relativity Space',
    redditQuery: 'Relativity Space',
    wikiTitle: 'Relativity_Space', hnQuery: 'Relativity Space',
    ll2Rockets: ['Terran R'],
  },
]

// ─── Normalization ────────────────────────────────────────────────────────────

// Proportional (largest-remainder) market share: integers summing to exactly 100.
function marketShare(vals) {
  const total = vals.reduce((a, b) => a + b, 0)
  if (total === 0) return vals.map(() => 0)
  const raw = vals.map(v => (v / total) * 100)
  const floors = raw.map(Math.floor)
  const remaining = 100 - floors.reduce((a, b) => a + b, 0)
  raw.map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remaining)
    .forEach(({ i }) => floors[i]++)
  return floors
}

// ─── Signal source helpers ────────────────────────────────────────────────────

async function fetchSpaceNewsCount(companyName, sinceDate) {
  try {
    const url = `https://api.spaceflightnewsapi.net/v4/articles/?search=${encodeURIComponent(companyName)}&published_at_gte=${sinceDate}&limit=1`
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return json.count ?? 0
  } catch { return 0 }
}

async function fetchGreenhouseCount(slug) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)
    if (!res.ok) return 0
    const json = await res.json()
    return (json.jobs ?? []).length
  } catch { return 0 }
}

async function fetchLeverCount(slug) {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`)
    if (!res.ok) return 0
    const json = await res.json()
    return Array.isArray(json) ? json.length : 0
  } catch { return 0 }
}

async function fetchSmartRecruitersCount(companyId) {
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings`)
    if (!res.ok) return 0
    const json = await res.json()
    return json.totalFound ?? 0
  } catch { return 0 }
}

async function fetchHNCount(query, sinceTimestamp) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${sinceTimestamp}&hitsPerPage=1`
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return json.nbHits ?? 0
  } catch { return 0 }
}

async function fetchRedditCount(query) {
  try {
    let total = 0
    let after = null
    const maxPages = 2
    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://www.reddit.com/search.json')
      url.searchParams.set('q', `"${query}"`)
      url.searchParams.set('sort', 'new')
      url.searchParams.set('limit', '100')
      url.searchParams.set('t', 'month')
      if (after) url.searchParams.set('after', after)
      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'SpaceTerminal/1.0' } })
      if (!res.ok) break
      const json = await res.json()
      const children = json?.data?.children ?? []
      total += children.length
      after = json?.data?.after
      if (!after || children.length < 100) break
    }
    return total
  } catch { return 0 }
}

async function fetchWikiViews(title) {
  try {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const y = lastMonth.getFullYear()
    const m = String(lastMonth.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, lastMonth.getMonth() + 1, 0).getDate()
    const start = `${y}${m}01`
    const end   = `${y}${m}${String(lastDay).padStart(2, '0')}`
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/monthly/${start}/${end}`
    const res = await fetch(url, { headers: { 'User-Agent': 'SpaceTerminal/1.0' } })
    if (!res.ok) return 0
    const json = await res.json()
    return (json.items ?? []).reduce((sum, item) => sum + (item.views ?? 0), 0)
  } catch { return 0 }
}

async function fetchUSASpendingValue(recipientQuery) {
  if (!recipientQuery) return 0
  try {
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
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
        page: 1, limit: 100, sort: 'Award Amount', order: 'desc',
      }),
    })
    if (!res.ok) return 0
    const json = await res.json()
    return (json.results ?? []).reduce((sum, r) => sum + (r['Award Amount'] ?? 0), 0)
  } catch { return 0 }
}

async function fetchRecentLaunchCountFromSupabase(rocketNames) {
  if (!rocketNames?.length) return 0
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  let total = 0
  for (const name of rocketNames) {
    try {
      const { data, error } = await supabase
        .from('rocket_launches')
        .select('data')
        .eq('rocket_name', name)
      if (error || !data) continue
      total += data.filter(row => {
        const l = row.data
        return l.net && l.net >= since &&
               l.status?.abbrev !== 'TBD' &&
               l.status?.abbrev !== 'Go' &&
               l.status?.abbrev !== 'TBC'
      }).length
    } catch { /* skip */ }
  }
  return total
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Space Terminal — Signal Fetcher (market-share scoring)')
  console.log(`Fetching signals for ${COMPANIES.length} companies…\n`)

  const since30d  = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // ── 1. Media ────────────────────────────────────────────────────────────────
  console.log('1/5  Media (Spaceflight News API)…')
  const mediaRaw = []
  for (const c of COMPANIES) {
    const v = await fetchSpaceNewsCount(c.name, sinceDate)
    mediaRaw.push(v)
    console.log(`     ${c.name}: ${v} articles`)
  }

  // ── 2. Hiring ───────────────────────────────────────────────────────────────
  console.log('\n2/5  Hiring (job boards → growth rate = open_jobs / headcount)…')
  const jobCounts = []
  for (const c of COMPANIES) {
    let v = 0
    if (c.greenhouse)      v = await fetchGreenhouseCount(c.greenhouse)
    else if (c.lever)      v = await fetchLeverCount(c.lever)
    else if (c.smartrecruiters) v = await fetchSmartRecruitersCount(c.smartrecruiters)
    jobCounts.push(v)
    const rate = c.headcount > 0 ? (v / c.headcount).toFixed(4) : '0'
    console.log(`     ${c.name}: ${v} jobs / ${c.headcount} headcount = ${rate}`)
  }
  // Growth rate: open positions as a fraction of existing headcount
  const hiringRaw = COMPANIES.map((c, i) =>
    c.headcount > 0 ? jobCounts[i] / c.headcount : 0
  )

  // ── 3. Buzz ─────────────────────────────────────────────────────────────────
  console.log('\n3/5  Buzz (HN Algolia + Reddit)…')
  const hnCounts = []
  const redditCounts = []
  for (const c of COMPANIES) {
    const hn = await fetchHNCount(c.hnQuery, since30d)
    const reddit = await fetchRedditCount(c.redditQuery)
    hnCounts.push(hn)
    redditCounts.push(reddit)
    console.log(`     ${c.name}: HN=${hn} Reddit=${reddit} total=${hn + reddit}`)
  }
  const buzzRaw = COMPANIES.map((_, i) => hnCounts[i] + redditCounts[i])

  // ── 4. Interest ─────────────────────────────────────────────────────────────
  console.log('\n4/5  Interest (Wikipedia pageviews, last full month)…')
  const investRaw = []
  for (const c of COMPANIES) {
    const v = await fetchWikiViews(c.wikiTitle)
    investRaw.push(v)
    console.log(`     ${c.name}: ${v.toLocaleString()} views`)
  }

  // ── 5. Ops sub-signals ──────────────────────────────────────────────────────
  console.log('\n5/5  Ops (contracts + launches + hiring rate)…')

  // a) USASpending government contracts
  const contractValues = []
  for (const c of COMPANIES) {
    const v = await fetchUSASpendingValue(c.usaSpendingQuery)
    contractValues.push(v)
    console.log(`     ${c.name} contracts: $${(v / 1e6).toFixed(1)}M`)
  }

  // b) Recent launches from Supabase cache
  const launchCounts = []
  for (const c of COMPANIES) {
    const v = await fetchRecentLaunchCountFromSupabase(c.ll2Rockets)
    launchCounts.push(v)
    console.log(`     ${c.name} launches: ${v}`)
  }

  // ── Compute scores ───────────────────────────────────────────────────────────

  // Ops composite: market-share each sub-signal, then weight
  const contractMs     = marketShare(contractValues)
  const launchMs       = marketShare(launchCounts)
  const hiringForOpsMs = marketShare(hiringRaw)
  const opsRaw = COMPANIES.map((_, i) =>
    0.5 * contractMs[i] + 0.3 * launchMs[i] + 0.2 * hiringForOpsMs[i]
  )

  // Final market-share normalization: each column sums to 100
  const mediaScore  = marketShare(mediaRaw)
  const hiringScore = marketShare(hiringRaw)
  const buzzScore   = marketShare(buzzRaw)
  const investScore = marketShare(investRaw)
  const opsScore    = marketShare(opsRaw)

  // ── Build signals object ─────────────────────────────────────────────────────
  const signals = {}
  COMPANIES.forEach((c, i) => {
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
    }
  })

  // ── Print results table ──────────────────────────────────────────────────────
  console.log('\n─── Results (market-share, each column sums to 100) ────────────────────────')
  const pad = (s, n) => String(s).padStart(n)
  const col = (s, n) => String(s).padEnd(n)
  console.log(`${col('Company', 20)} ${pad('Media', 6)} ${pad('Hiring', 6)} ${pad('Buzz', 6)} ${pad('Interest', 8)} ${pad('Ops', 6)}`)
  console.log('─'.repeat(60))
  COMPANIES.forEach((c, i) => {
    console.log(
      `${col(c.name, 20)} ${pad(mediaScore[i], 6)} ${pad(hiringScore[i], 6)} ${pad(buzzScore[i], 6)} ${pad(investScore[i], 8)} ${pad(opsScore[i], 6)}`
    )
  })
  const sumMedia  = mediaScore.reduce((a, b) => a + b, 0)
  const sumHiring = hiringScore.reduce((a, b) => a + b, 0)
  const sumBuzz   = buzzScore.reduce((a, b) => a + b, 0)
  const sumInvest = investScore.reduce((a, b) => a + b, 0)
  const sumOps    = opsScore.reduce((a, b) => a + b, 0)
  console.log('─'.repeat(60))
  console.log(`${col('TOTAL', 20)} ${pad(sumMedia, 6)} ${pad(sumHiring, 6)} ${pad(sumBuzz, 6)} ${pad(sumInvest, 8)} ${pad(sumOps, 6)}`)

  // ── Upsert to Supabase ───────────────────────────────────────────────────────
  console.log('\nUpserting snapshot to Supabase…')
  const { data, error } = await supabase
    .from('signal_snapshots')
    .insert({ signals })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('Supabase insert failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ Snapshot saved — id=${data.id} at ${data.created_at}`)
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
