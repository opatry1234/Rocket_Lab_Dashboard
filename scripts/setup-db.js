#!/usr/bin/env node
// Supabase table setup — run once to create required tables.
// The anon key cannot run DDL directly. This script checks which tables exist
// and prints the migration SQL if any are missing.
// Run that SQL in: Supabase dashboard → SQL Editor → New query.
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

async function checkTable(tableName) {
  const { error } = await supabase.from(tableName).select('*').limit(1)
  if (!error) return { exists: true }
  // PGRST205 = table not found in PostgREST schema cache
  // 42P01 = relation does not exist (direct Postgres error)
  if (error.code === 'PGRST205' || error.code === '42P01') return { exists: false }
  if (error.message?.includes('Invalid API key')) {
    throw new Error('Invalid API key — check VITE_SUPABASE_ANON_KEY in .env.local')
  }
  // Any other error (RLS, etc.) means table exists but we lack permission
  return { exists: true, note: error.message }
}

const MIGRATION_SQL = `
-- ─── Space Terminal: Supabase shared cache tables ──────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Snapshot of all company signals (full normalized scores)
CREATE TABLE IF NOT EXISTS signal_snapshots (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  signals jsonb not null
);

-- LL2 launch data per rocket, resumable
CREATE TABLE IF NOT EXISTS rocket_launches (
  rocket_name text not null,
  launch_id text not null,
  data jsonb not null,
  fetched_at timestamptz default now(),
  primary key (rocket_name, launch_id)
);

-- Fetch cursor for resumable LL2 pagination
CREATE TABLE IF NOT EXISTS fetch_log (
  rocket_name text primary key,
  last_offset integer default 0,
  total integer default 0,
  status text default 'pending',
  updated_at timestamptz default now()
);

-- Allow anon (browser) access — these tables hold only public cached data
ALTER TABLE signal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rocket_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON signal_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON rocket_launches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON fetch_log FOR ALL TO anon USING (true) WITH CHECK (true);
`

async function main() {
  console.log('Space Terminal — Supabase DB Setup')
  console.log(`Project: ${SUPABASE_URL}\n`)

  const tables = ['signal_snapshots', 'rocket_launches', 'fetch_log']
  const results = {}

  console.log('Checking tables...')
  for (const t of tables) {
    try {
      const r = await checkTable(t)
      results[t] = r
      if (r.exists) {
        console.log(`  ✓ ${t}${r.note ? ` (note: ${r.note})` : ''}`)
      } else {
        console.log(`  ✗ ${t} — missing`)
      }
    } catch (err) {
      console.error(`  ✗ Error checking ${t}: ${err.message}`)
      process.exit(1)
    }
  }

  const missing = tables.filter(t => !results[t].exists)
  if (missing.length === 0) {
    console.log('\nAll tables exist. Database is ready.')
    return
  }

  console.log(`\n⚠️  ${missing.length} table(s) missing: ${missing.join(', ')}`)
  console.log('\nThe anon key cannot run DDL directly.')
  console.log('Please run the following SQL in your Supabase dashboard:')
  console.log('  https://supabase.com/dashboard/project/ngptlumswjtpllqunuvh/sql/new\n')
  console.log('─'.repeat(60))
  console.log(MIGRATION_SQL)
  console.log('─'.repeat(60))
  console.log('\nAfter running the SQL, re-run this script to confirm.')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
