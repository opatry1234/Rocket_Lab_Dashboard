#!/usr/bin/env node
// Resumable LL2 launch fetcher for Space Terminal.
// Fetches launches page-by-page from Launch Library 2, storing results in
// the Supabase rocket_launches table. Resumable: checks fetch_log for the
// last offset so interrupted runs can continue where they left off.
// Handles 429 rate limits by reading Retry-After and sleeping.
//
// Deploy note: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel
// environment variables in the dashboard before deploying.

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

const BASE_URL = 'https://ll.thespacedevs.com/2.3.0'
const PAGE_SIZE = 100

// Rockets to fetch — matches ll2Rockets across all companies in spaceTerminalData.js
const ROCKETS = [
  'Electron',
  'Falcon 9',
  'Falcon Heavy',
  'Starship',
  'New Glenn',
  'New Shepard',
  'Alpha',
  'Terran R',
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchPage(rocketName, offset, attempt = 1) {
  const params = new URLSearchParams({
    rocket__configuration__name: rocketName,
    limit: PAGE_SIZE,
    offset,
    mode: 'detailed',
    ordering: 'net',
  })

  const res = await fetch(`${BASE_URL}/launches/?${params}`)

  if (res.status === 429) {
    if (attempt >= 3) {
      throw new Error(`Rate limited 3 times on offset=${offset} — quota exhausted, resume later`)
    }
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10)
    console.log(`  Rate limited (attempt ${attempt}/3) — waiting ${retryAfter}s...`)
    await sleep(retryAfter * 1000)
    return fetchPage(rocketName, offset, attempt + 1)
  }

  if (!res.ok) {
    throw new Error(`LL2 API error ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

async function getLogEntry(rocketName) {
  const { data, error } = await supabase
    .from('fetch_log')
    .select('*')
    .eq('rocket_name', rocketName)
    .maybeSingle()

  if (error) throw new Error(`fetch_log read error: ${error.message}`)
  return data // null if not found
}

async function upsertLogEntry(rocketName, lastOffset, total, status) {
  const { error } = await supabase
    .from('fetch_log')
    .upsert({
      rocket_name: rocketName,
      last_offset: lastOffset,
      total,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'rocket_name' })

  if (error) throw new Error(`fetch_log write error: ${error.message}`)
}

async function upsertLaunches(rocketName, launches) {
  const rows = launches.map(l => ({
    rocket_name: rocketName,
    launch_id: l.id,
    data: l,
    fetched_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('rocket_launches')
    .upsert(rows, { onConflict: 'rocket_name,launch_id' })

  if (error) throw new Error(`rocket_launches write error: ${error.message}`)
}

async function fetchRocket(rocketName) {
  console.log(`\n${rocketName}`)

  const log = await getLogEntry(rocketName)

  if (log?.status === 'complete') {
    console.log(`  Already complete (${log.total} launches). Skipping.`)
    return
  }

  let offset = log?.last_offset ?? 0
  let total = log?.total ?? null

  if (offset > 0) {
    console.log(`  Resuming from offset ${offset} (total: ${total ?? 'unknown'})`)
  }

  // Mark as in-progress
  await upsertLogEntry(rocketName, offset, total ?? 0, 'fetching')

  let fetchedCount = 0

  do {
    console.log(`  Fetching offset=${offset}...`)

    let page
    try {
      page = await fetchPage(rocketName, offset)
    } catch (err) {
      console.error(`  Error fetching offset=${offset}: ${err.message}`)
      await upsertLogEntry(rocketName, offset, total ?? 0, 'error')
      return
    }

    if (total === null) total = page.count
    const results = page.results ?? []

    console.log(`  Got ${results.length} launches (total: ${total})`)

    if (results.length > 0) {
      await upsertLaunches(rocketName, results)
      fetchedCount += results.length
    }

    offset += PAGE_SIZE
    await upsertLogEntry(rocketName, offset, total, 'fetching')

    // Small courtesy delay between pages to avoid hammering the free tier
    if (offset < total) {
      await sleep(1000)
    }
  } while (offset < total)

  await upsertLogEntry(rocketName, offset, total, 'complete')
  console.log(`  ✓ Complete — stored ${fetchedCount} launches`)
}

async function main() {
  console.log('Space Terminal — LL2 Launch Fetcher')
  console.log(`Rockets: ${ROCKETS.join(', ')}\n`)

  for (const rocket of ROCKETS) {
    try {
      await fetchRocket(rocket)
    } catch (err) {
      console.error(`Unexpected error for ${rocket}:`, err.message)
      // Continue with next rocket
    }
  }

  console.log('\nAll rockets processed.')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
