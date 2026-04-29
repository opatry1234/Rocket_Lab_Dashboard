import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  COMPANIES, DOMAINS,
  overallScore, rankColor, rankCompanies, scoreColor, velocityColor, velocityLabel,
} from './spaceTerminalData';
import {
  fetchSpaceTerminalSignals, readTwoSignalSnapshots,
  getStaleSignals, signalAgeMs, ST_MIN_REFRESH_MS,
} from './api';
import { C, tt, tickStyle, PageFooter } from './shared';
import DebugPanel from './DebugPanel';

// ─── Heat Map ──────────────────────────────────────────────────────────────────

function HeatMap({ snapshot, prevSnapshot, activeDomain, setActiveDomain, scanDomain }) {
  const ranked = rankCompanies(snapshot);

  // Rank each company within each domain column independently (1 = highest score).
  // hiringUnavailable companies are excluded from the Hiring column ranking.
  // Ties share the same rank.
  const columnRanks = {};
  DOMAINS.forEach(d => {
    const eligible = d.id === 'hiring'
      ? ranked.filter(c => !c.hiringUnavailable)
      : ranked;
    const sorted = [...eligible].sort((a, b) => (b.scores[d.id] ?? 0) - (a.scores[d.id] ?? 0));
    const rankMap = {};
    sorted.forEach((c, i) => {
      if (i > 0 && (c.scores[d.id] ?? 0) === (sorted[i - 1].scores[d.id] ?? 0)) {
        rankMap[c.id] = rankMap[sorted[i - 1].id];
      } else {
        rankMap[c.id] = i + 1;
      }
    });
    columnRanks[d.id] = rankMap;
  });

  return (
    <div className="os-heat-wrap">
      <div className="os-heat-scroll">
      <div className="os-heat-grid">
        {/* Corner */}
        <div className="os-heat-corner" />
        {DOMAINS.map(d => (
          <button
            key={d.id}
            className={[
              'os-heat-domain-header',
              activeDomain === d.id ? 'os-active-col' : '',
              scanDomain === d.id   ? 'os-scan-col'   : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setActiveDomain(id => id === d.id ? null : d.id)}
            title={d.desc}
          >
            {d.short}
          </button>
        ))}

        {/* Company rows */}
        {ranked.map(company => {
          const overallRankColor = rankColor(company.rank);
          return (
            <React.Fragment key={company.id}>
              <Link to={`/company/${company.id}`} className="os-heat-company-cell">
                <span className="os-heat-rank" style={{ color: overallRankColor }}>
                  #{company.rank}
                </span>
                <span className="os-heat-name">{company.name}</span>
                <span className="os-heat-overall" style={{ color: overallRankColor }}>
                  {company.overall}
                </span>
              </Link>
              {DOMAINS.map(d => {
                const isHiringNA = d.id === 'hiring' && company.hiringUnavailable;
                const score    = company.scores[d.id] ?? 0;
                const prev     = prevSnapshot?.[company.id]?.[d.id] ?? score;
                const rank     = isHiringNA ? null : (columnRanks[d.id]?.[company.id] ?? ranked.length);
                const color    = isHiringNA ? C.muted : rankColor(rank);
                const isActive = activeDomain === d.id;
                const isScan   = scanDomain === d.id;
                return (
                  <div
                    key={d.id}
                    className={[
                      'os-heat-cell',
                      isActive ? 'os-active-col' : '',
                      isScan   ? 'os-scan-col'   : '',
                    ].filter(Boolean).join(' ')}
                    style={isHiringNA ? {
                      background:  `${C.muted}0D`,
                      borderColor: `${C.muted}1A`,
                    } : {
                      background:  `${color}1A`,
                      borderColor: isActive ? `${color}CC` : `${color}33`,
                    }}
                  >
                    {isHiringNA ? (
                      <span className="os-cell-score" style={{ color: C.muted }}>—</span>
                    ) : (
                      <>
                        <span className="os-cell-score" style={{ color }}>{score}</span>
                        {score !== prev && (
                          <span
                            className="os-cell-delta"
                            style={{ color: score > prev ? C.green : C.red }}
                          >
                            {score > prev ? '↑' : '↓'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      </div>{/* /os-heat-scroll */}

      {/* Domain legend */}
      <div className="os-heat-legend">
        {DOMAINS.map(d => (
          <span key={d.id} className="os-heat-legend-item">
            <strong>{d.short}</strong> — {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard({ snapshot, prevSnapshot }) {
  const ranked     = rankCompanies(snapshot);
  const prevRanked = prevSnapshot ? rankCompanies(prevSnapshot) : null;

  return (
    <div className="os-leaderboard">
      <div className="os-lb-header">
        <span>#</span><span>Company</span><span>Score</span><span>Status</span>
      </div>
      {ranked.map(company => {
        const prevRank  = prevRanked?.find(c => c.id === company.id)?.rank;
        const prevOver  = prevSnapshot?.[company.id] ? overallScore(prevSnapshot[company.id]) : company.overall;
        const rankDelta = prevRank ? prevRank - company.rank : 0;
        const vel       = velocityLabel(company.overall, prevOver);
        const vCol      = velocityColor(vel);
        const col       = rankColor(company.rank);

        return (
          <Link key={company.id} to={`/company/${company.id}`} className="os-leader-row">
            <span className="os-lb-rank" style={{ color: col }}>
              {company.rank}
              {rankDelta !== 0 && (
                <span className="os-lb-rank-delta" style={{ color: rankDelta > 0 ? C.green : C.red }}>
                  {rankDelta > 0 ? `+${rankDelta}` : rankDelta}
                </span>
              )}
            </span>
            <span>
              <span className="os-lb-dot" style={{ background: company.color }} />
              <span className="os-lb-name">{company.name}</span>
              <span className="os-lb-tag">{company.tagline}</span>
            </span>
            <span className="os-lb-score" style={{ color: col }}>{company.overall}</span>
            <span className="os-lb-vel" style={{ color: vCol }}>{vel}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Refresh status bar ────────────────────────────────────────────────────────

function StatusBar({ status, step, total }) {
  if (!status) return null;
  const pct = total ? Math.round((step / total) * 100) : 0;
  return (
    <div className="st-status-bar">
      <span className="st-status-msg">{status}</span>
      {total > 0 && (
        <div className="st-status-progress">
          <div className="st-status-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldAnimate() {
  try {
    const t = localStorage.getItem('st_last_refresh_seen');
    return !t || Date.now() - parseInt(t, 10) > 6 * 60 * 60 * 1000;
  } catch { return false; }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpaceTerminalPage() {
  // animMode is computed once on mount: true if last animation was > 6h ago
  const [animMode]     = useState(shouldAnimate);

  const [snapshot,      setSnapshot]      = useState(null);          // latest data
  const [displaySnap,   setDisplaySnap]   = useState(               // what table renders
    () => animMode ? null : getStaleSignals()
  );
  const [kpiSnap,       setKpiSnap]       = useState(               // what KPI tiles render
    () => animMode ? null : getStaleSignals()
  );
  const [prevSnapshot,  setPrevSnapshot]  = useState(null);
  const [activeDomain,  setActiveDomain]  = useState(null);
  const [loading,       setLoading]       = useState(
    () => animMode || !getStaleSignals()
  );
  const [refreshing,    setRefreshing]    = useState(false);
  const [upToDate,      setUpToDate]      = useState(false);
  const [status,        setStatus]        = useState(null);
  const [statusStep,    setStatusStep]    = useState(0);
  const [statusTotal,   setStatusTotal]   = useState(0);
  const [fetchedAt,     setFetchedAt]     = useState(() => {
    try { return parseInt(localStorage.getItem('st_last_fetch') ?? '0', 10) || null; }
    catch { return null; }
  });

  // animCol: null=idle, 0-4=domain column index, 'kpi'=KPI tile phase, 'done'=finished
  const [animCol, setAnimCol] = useState(null);

  const onProgress = useCallback((msg, step, total) => {
    setStatus(msg); setStatusStep(step); setStatusTotal(total);
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (animMode) {
      // Fake-refresh path: load two snapshots from Supabase
      readTwoSignalSnapshots().then(({ current, previous }) => {
        if (current && previous) {
          setSnapshot(current);
          setDisplaySnap(previous);
          setKpiSnap(previous);
          setFetchedAt(Date.now());
          setLoading(false);
          setTimeout(() => setAnimCol(0), 500);
        } else if (current) {
          setSnapshot(current);
          setDisplaySnap(current);
          setKpiSnap(current);
          setFetchedAt(Date.now());
          setLoading(false);
        } else {
          // No Supabase data — fall through to live fetch
          fetchSpaceTerminalSignals(COMPANIES, onProgress)
            .then(s => { setSnapshot(s); setDisplaySnap(s); setKpiSnap(s); setFetchedAt(Date.now()); })
            .finally(() => { setLoading(false); setStatus(null); });
        }
      }).catch(() => {
        fetchSpaceTerminalSignals(COMPANIES, onProgress)
          .then(s => { setSnapshot(s); setDisplaySnap(s); setKpiSnap(s); setFetchedAt(Date.now()); })
          .finally(() => { setLoading(false); setStatus(null); });
      });
    } else {
      // Normal path: Supabase snapshot → localStorage → live APIs
      fetchSpaceTerminalSignals(COMPANIES, onProgress)
        .then(s => { setSnapshot(s); setDisplaySnap(s); setKpiSnap(s); setFetchedAt(Date.now()); })
        .catch(() => {})
        .finally(() => { setLoading(false); setStatus(null); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Animation ticker ────────────────────────────────────────────────────────
  // animCol: 0..(DOMAINS.length-1) = scan domain columns in the table
  //          DOMAINS.length..(DOMAINS.length+COMPANIES.length-1) = scan KPI tiles one by one
  //          'done' = finished
  useEffect(() => {
    if (animCol === null || animCol === 'done') return;

    const timer = setTimeout(() => {
      if (typeof animCol !== 'number') return;

      if (animCol < DOMAINS.length) {
        // Domain column phase — update the table's displaySnap for this column only
        const domainId = DOMAINS[animCol].id;
        setDisplaySnap(prev => {
          if (!prev || !snapshot) return prev;
          const next = {};
          for (const [cId, cScores] of Object.entries(prev)) {
            next[cId] = { ...cScores, [domainId]: snapshot[cId]?.[domainId] ?? cScores[domainId] };
          }
          return next;
        });
        setAnimCol(animCol + 1); // naturally steps into KPI phase when animCol reaches DOMAINS.length
      } else {
        // KPI tile phase — update one tile at a time; kpiSnap starts frozen at prev values
        const tileIdx = animCol - DOMAINS.length;
        const company = COMPANIES[tileIdx];
        if (company && snapshot) {
          setKpiSnap(prev => ({
            ...(prev ?? {}),
            [company.id]: snapshot[company.id],
          }));
        }
        const next = animCol + 1;
        if (next >= DOMAINS.length + COMPANIES.length) {
          setAnimCol('done');
          try { localStorage.setItem('st_last_refresh_seen', String(Date.now())); } catch {}
        } else {
          setAnimCol(next);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [animCol, snapshot]);

  // ── Manual refresh ──────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    // Cancel any in-progress animation
    setAnimCol(null);

    if (signalAgeMs() < ST_MIN_REFRESH_MS) {
      setUpToDate(true);
      setTimeout(() => setUpToDate(false), 4000);
      return;
    }
    setRefreshing(true);
    setUpToDate(false);
    setPrevSnapshot(displaySnap);

    fetchSpaceTerminalSignals(COMPANIES, onProgress)
      .then(signals => {
        setSnapshot(signals);
        setDisplaySnap(signals);
        setKpiSnap(signals);
        setFetchedAt(Date.now());
      })
      .catch(() => {})
      .finally(() => { setRefreshing(false); setStatus(null); });
  }, [displaySnap, onProgress]);

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const currentSnap = displaySnap ?? {};

  // Which domain header/cells to highlight during scan animation
  const scanDomain = typeof animCol === 'number' && animCol < DOMAINS.length
    ? DOMAINS[animCol].id
    : null;
  // Which KPI tile index is currently scanning (null if not in KPI phase)
  const kpiScanIdx = typeof animCol === 'number' && animCol >= DOMAINS.length
    ? animCol - DOMAINS.length
    : null;

  if (loading && !displaySnap) {
    return (
      <div className="app">
        <header className="hdr">
          <div className="hdr-inner">
            <div className="hdr-brand">
              <span className="hdr-icon st-icon" aria-hidden="true">ST</span>
              <div>
                <h1 className="hdr-title">Space Terminal</h1>
                <p className="hdr-sub">Industry intelligence · fetching signals…</p>
              </div>
            </div>
          </div>
        </header>
        <main className="main">
          {status && <StatusBar status={status} step={statusStep} total={statusTotal} />}
          <div className="st-loading-signals">
            <div className="st-loading-grid">
              {COMPANIES.map(c => (
                <div key={c.id} className="st-loading-card" style={{ borderTopColor: c.color }}>
                  <div className="st-loading-bar" />
                  <div className="st-loading-bar st-loading-bar-sm" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon st-icon" aria-hidden="true">ST</span>
            <div>
              <h1 className="hdr-title st-gradient-title">Space Terminal</h1>
              <p className="hdr-sub">Industry intelligence · {COMPANIES.length} companies · 5 signal domains</p>
            </div>
          </div>
          <div className="st-refresh-area">
            {upToDate && (
              <span className="st-up-to-date">Nothing new found — everything looks up to date</span>
            )}
            {fetchedLabel && !upToDate && (
              <span className="st-fetch-time">Signal: {fetchedLabel}</span>
            )}
            <button
              className="os-refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh signals"
            >
              {refreshing ? '⟳ Refreshing…' : '⟳ Refresh Signal'}
            </button>
          </div>
        </div>
      </header>

      {(refreshing || status) && (
        <StatusBar status={status} step={statusStep} total={statusTotal} />
      )}

      <main className="main">
        {/* Heat map — main feature */}
        <div className="grid">
          <div className="chart-card wide">
            <p className="chart-heading">Signal Heat Map — click a domain header to highlight</p>
            <HeatMap
              snapshot={currentSnap}
              prevSnapshot={animCol !== null && animCol !== 'done' ? null : prevSnapshot}
              activeDomain={activeDomain}
              setActiveDomain={setActiveDomain}
              scanDomain={scanDomain}
            />
          </div>
        </div>

        {/* KPI row — company cards; frozen during column animation, then scan tile by tile */}
        <section className="kpi-row comp-kpi-row">
          {COMPANIES.map((c, i) => {
            const scores  = (kpiSnap ?? {})[c.id] ?? {};
            const overall = overallScore(scores);
            const isScanning = kpiScanIdx === i;
            return (
              <Link
                key={c.id}
                to={`/company/${c.id}`}
                className={`kpi-card comp-kpi-card kpi-card-link${isScanning ? ' kpi-scanning' : ''}`}
                style={{ borderTopColor: c.color }}
              >
                <div className="comp-kpi-rocket" style={{ color: c.color }}>{c.name}</div>
                <div className="kpi-value" style={{ color: c.color }}>{overall || '—'}</div>
                <div className="kpi-label">Signal Score</div>
                <div className="comp-kpi-meta">{c.tagline}</div>
              </Link>
            );
          })}
        </section>

        <div className="grid">
          <div className="chart-card wide">
            <p className="chart-heading">Industry Leaderboard</p>
            <Leaderboard
              snapshot={currentSnap}
              prevSnapshot={animCol !== null && animCol !== 'done' ? null : prevSnapshot}
            />
          </div>
        </div>

        <div className="comp-note">
          <span className="comp-note-icon">i</span>
          <p>
            <strong style={{ color: C.text }}>About these scores</strong> — Each domain column
            distributes 100 points across all companies using market-share normalization. Hiring shows
            growth rate (open roles ÷ headcount). Ops combines government contracts (50%), launch cadence
            (30%), and hiring rate (20%). — data is sourced from Spaceflight News API, Greenhouse / Lever,
            HN Algolia, Reddit, Wikipedia, USASpending.gov, and Launch Library 2.
          </p>
        </div>
      </main>

      <PageFooter note={
        <>Data sourced from{' '}
          <a href="https://api.spaceflightnewsapi.net" target="_blank" rel="noopener noreferrer">Spaceflight News API</a>,{' '}
          <a href="https://boards.greenhouse.io" target="_blank" rel="noopener noreferrer">Greenhouse</a>,{' '}
          <a href="https://hn.algolia.com/api" target="_blank" rel="noopener noreferrer">HN Algolia</a>,{' '}
          <a href="https://wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia</a>,{' '}
          <a href="https://api.usaspending.gov" target="_blank" rel="noopener noreferrer">USASpending.gov</a>, and{' '}
          <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer">Launch Library 2</a>.
        </>
      } />
      <DebugPanel />
    </div>
  );
}
