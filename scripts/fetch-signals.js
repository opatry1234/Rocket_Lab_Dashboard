#!/usr/bin/env node
// Server-side signal fetcher for Space Terminal.
// Runs all signal APIs (news, jobs, HN, wiki, LL2 cache) for all companies,
// normalizes scores, and upserts a snapshot into Supabase signal_snapshots.
//
// Deploy note: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your
// Vercel project's environment variables in the Vercel dashboard before deploying.
// Run on a schedule (e.g. cron) to keep data fresh without hitting API limits
// from client browsers.

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

// ─── Company definitions (mirrors spaceTerminalData.js) ───────────────────────

const COMPANIES = [
  { id: 'spacex', name: 'SpaceX', greenhouse: 'spacex', lever: null, wikiTitle: 'SpaceX', hnQuery: 'SpaceX', ll2Rockets: ['Falcon 9', 'Falcon Heavy', 'Starship'] },
  { id: 'rocket-lab', name: 'Rocket Lab', greenhouse: 'rocketlab', lever: null, wikiTitle: 'Rocket_Lab', hnQuery: 'Rocket Lab', ll2Rockets: ['Electron'] },
  { id: 'blue-origin', name: 'Blue Origin', greenhouse: null, lever: 'blueorigin', wikiTitle: 'Blue_Origin', hnQuery: 'Blue Origin', ll2Rockets: ['New Glenn', 'New Shepard'] },
  { id: 'firefly', name: 'Firefly Aerospace', greenhouse: null, lever: null, smartrecruiters: 'FireflyAerospace', wikiTitle: 'Firefly_Aerospace', hnQuery: 'Firefly Aerospace', ll2Rockets: ['Alpha'] },
  { id: 'vast', name: 'Vast', greenhouse: 'vast', lever: null, wikiTitle: 'Vast_(company)', hnQuery: 'Vast Space', ll2Rockets: [] },
  { id: 'relativity', name: 'Relativity Space', greenhouse: 'relativity', lever: null, wikiTitle: 'Relativity_Space', hnQuery: 'Relativity Space', ll2Rockets: ['Terran R'] },
]

// ─── Signal source helpers ────────────────────────────────────────────────────

async function fetchSpaceNewsCount(companyName, sinceDate) {
  try {
    const url = `https://api.spaceflightnewsapi.net/v4/articles/?search=${encodeURIComponent(companyName)}&published_at_gte=${sinceDate}&limit=1`
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return json.count ?? 0
  } catch {
    return 0
  }
}

async function fetchGreenhouseCount(slug) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)
    if (!res.ok) return 0
    const json = await res.json()
    return (json.jobs ?? []).length
  } catch {
    return 0
  }
}

async function fetchLeverCount(slug) {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`)
    if (!res.ok) return 0
    const json = await res.json()
    return Array.isArray(json) ? json.length : 0
  } catch {
    return 0
  }
}

async function fetchSmartRecruitersCount(companyId) {
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings`)
    if (!res.ok) return 0
    const json = await res.json()
    return json.totalFound ?? 0
  } catch {
    return 0
  }
}

async function fetchHNCount(query, sinceTimestamp) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${sinceTimestamp}&hitsPerPage=1`
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return json.nbHits ?? 0
  } catch {
    return 0
  }
}

async function fetchWikiViews(title) {
  try {
    // Fix: use last full month, not the current (incomplete) month
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
    const items = json.items ?? []
    return items.reduce((sum, item) => sum + (item.views ?? 0), 0)
  } catch {
    return 0
  }
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

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalize(vals) {
  const max = Math.max(...vals.filter(v => v > 0), 1)
  return vals.map(v => Math.min(100, Math.round((v / max) * 100)))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Space Terminal — Signal Fetcher')
  console.log(`Fetching signals for ${COMPANIES.length} companies...\n`)

  const since30d = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const mediaRaw = []
  const hiringRaw = []
  const buzzRaw = []
  const investRaw = []
  const opsRaw = []
  const errors = []

  // Fetch each company individually so one failure doesn't block others
  for (const c of COMPANIES) {
    console.log(`  Fetching: ${c.name}`)

    let media = 0, hiring = 0, buzz = 0, invest = 0, ops = 0

    try {
      media = await fetchSpaceNewsCount(c.name, sinceDate)
    } catch (err) {
      errors.push(`${c.name}/media: ${err.message}`)
    }

    try {
      if (c.greenhouse)      hiring = await fetchGreenhouseCount(c.greenhouse)
      else if (c.lever)      hiring = await fetchLeverCount(c.lever)
      else if (c.smartrecruiters) hiring = await fetchSmartRecruitersCount(c.smartrecruiters)
    } catch (err) {
      errors.push(`${c.name}/hiring: ${err.message}`)
    }

    try {
      buzz = await fetchHNCount(c.hnQuery, since30d)
    } catch (err) {
      errors.push(`${c.name}/buzz: ${err.message}`)
    }

    try {
      invest = await fetchWikiViews(c.wikiTitle)
    } catch (err) {
      errors.push(`${c.name}/wiki: ${err.message}`)
    }

    try {
      ops = await fetchRecentLaunchCountFromSupabase(c.ll2Rockets)
    } catch (err) {
      errors.push(`${c.name}/ops: ${err.message}`)
    }

    mediaRaw.push(media)
    hiringRaw.push(hiring)
    buzzRaw.push(buzz)
    investRaw.push(invest)
    opsRaw.push(ops)

    console.log(`    media=${media} hiring=${hiring} buzz=${buzz} wiki=${invest} ops=${ops}`)
  }

  if (errors.length) {
    console.warn('\nPartial errors (continuing with available data):')
    errors.forEach(e => console.warn(`  ⚠ ${e}`))
  }

  // Normalize
  const mediaNorm  = normalize(mediaRaw)
  const hiringNorm = normalize(hiringRaw)
  const buzzNorm   = normalize(buzzRaw)
  const investNorm = normalize(investRaw)
  const opsNorm    = normalize(opsRaw)

  const signals = {}
  COMPANIES.forEach((c, i) => {
    signals[c.id] = {
      media:      mediaNorm[i],
      hiring:     hiringNorm[i],
      buzz:       buzzNorm[i],
      investment: investNorm[i],
      operations: opsNorm[i],
      _raw: {
        media:      mediaRaw[i],
        hiring:     hiringRaw[i],
        buzz:       buzzRaw[i],
        investment: investRaw[i],
        operations: opsRaw[i],
      },
      _partial: errors.length > 0,
      _errors: errors.filter(e => e.startsWith(c.id)),
    }
  })

  // Upsert into Supabase
  console.log('\nUpserting snapshot to Supabase...')
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
  if (errors.length) {
    console.log(`  Note: ${errors.length} partial error(s) stored with snapshot`)
  }
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
