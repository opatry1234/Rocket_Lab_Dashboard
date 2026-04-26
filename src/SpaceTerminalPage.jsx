import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  COMPANIES, DOMAINS, NARRATIVES,
  overallScore, rankCompanies, scoreColor, velocityColor, velocityLabel,
} from './spaceTerminalData';
import {
  fetchSpaceTerminalSignals,
  getStaleSignals, signalAgeMs, ST_MIN_REFRESH_MS,
} from './api';
import { debugLog } from './debugLog';
import { C, tt, tickStyle, PageFooter } from './shared';
import DebugPanel from './DebugPanel';

// ─── Heat Map ──────────────────────────────────────────────────────────────────

function HeatMap({ snapshot, prevSnapshot, activeDomain, setActiveDomain }) {
  const ranked = rankCompanies(snapshot);

  return (
    <div className="os-heat-wrap">
      <div className="os-heat-grid">
        {/* Corner */}
        <div className="os-heat-corner" />
        {DOMAINS.map(d => (
          <button
            key={d.id}
            className={`os-heat-domain-header${activeDomain === d.id ? ' os-active-col' : ''}`}
            onClick={() => setActiveDomain(id => id === d.id ? null : d.id)}
            title={d.desc}
          >
            {d.short}
          </button>
        ))}

        {/* Company rows */}
        {ranked.map(company => (
          <React.Fragment key={company.id}>
            <Link
              to={`/company/${company.id}`}
              className="os-heat-company-cell"
            >
              <span className="os-heat-rank">#{company.rank}</span>
              <span className="os-heat-name">{company.name}</span>
              <span className="os-heat-overall" style={{ color: scoreColor(company.overall) }}>
                {company.overall}
              </span>
            </Link>
            {DOMAINS.map(d => {
              const score    = company.scores[d.id] ?? 0;
              const prev     = prevSnapshot?.[company.id]?.[d.id] ?? score;
              const color    = scoreColor(score);
              const isActive = activeDomain === d.id;
              return (
                <div
                  key={d.id}
                  className={`os-heat-cell${isActive ? ' os-active-col' : ''}`}
                  style={{
                    background: `${color}1A`,
                    borderColor: isActive ? `${color}CC` : `${color}33`,
                  }}
                >
                  <span className="os-cell-score" style={{ color }}>{score}</span>
                  {score !== prev && (
                    <span
                      className="os-cell-delta"
                      style={{ color: score > prev ? C.green : C.red }}
                    >
                      {score > prev ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

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

// ─── Comparison bar chart ──────────────────────────────────────────────────────

function ComparisonChart({ snapshot, activeDomain }) {
  const domainId = activeDomain ?? 'media';
  const domain   = DOMAINS.find(d => d.id === domainId) ?? DOMAINS[0];
  const ranked   = rankCompanies(snapshot);

  const data = ranked.map(c => ({
    name:  c.shortName,
    score: c.scores[domainId] ?? 0,
    color: c.color,
  }));

  return (
    <div className="chart-card">
      <p className="chart-heading">
        Domain Breakdown — <span style={{ color: C.blue }}>{domain.label}</span>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="name" tick={tickStyle} />
          <YAxis domain={[0, 100]} tick={tickStyle} />
          <Tooltip
            contentStyle={tt}
            formatter={(v) => [`${v} / 100`, domain.short]}
          />
          {data.map((d) => (
            <Line
              key={d.name}
              dataKey="score"
              data={[d]}
              stroke={d.color}
              strokeWidth={0}
              dot={{ r: 7, fill: d.color, strokeWidth: 0 }}
              name={d.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="os-domain-desc">{domain.desc}</p>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard({ snapshot, prevSnapshot }) {
  const ranked   = rankCompanies(snapshot);
  const prevRanked = prevSnapshot ? rankCompanies(prevSnapshot) : null;

  return (
    <div className="os-leaderboard">
      <div className="os-lb-header">
        <span>#</span><span>Company</span><span>Score</span><span>Status</span>
      </div>
      {ranked.map(company => {
        const prevRank = prevRanked?.find(c => c.id === company.id)?.rank;
        const prevOver = prevSnapshot?.[company.id] ? overallScore(prevSnapshot[company.id]) : company.overall;
        const rankDelta = prevRank ? prevRank - company.rank : 0;
        const vel  = velocityLabel(company.overall, prevOver);
        const vCol = velocityColor(vel);

        return (
          <Link key={company.id} to={`/company/${company.id}`} className="os-leader-row">
            <span className="os-lb-rank" style={{ color: scoreColor(company.overall) }}>
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
            <span className="os-lb-score" style={{ color: scoreColor(company.overall) }}>
              {company.overall}
            </span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpaceTerminalPage() {
  const [snapshot,     setSnapshot]     = useState(() => getStaleSignals());
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const [activeDomain, setActiveDomain] = useState(null);
  const [loading,      setLoading]      = useState(!getStaleSignals());
  const [refreshing,   setRefreshing]   = useState(false);
  const [upToDate,     setUpToDate]     = useState(false);
  const [status,       setStatus]       = useState(null);
  const [statusStep,   setStatusStep]   = useState(0);
  const [statusTotal,  setStatusTotal]  = useState(0);
  const [fetchedAt,    setFetchedAt]    = useState(() => {
    try { return parseInt(localStorage.getItem('st_last_fetch') ?? '0', 10) || null; }
    catch { return null; }
  });

  const onProgress = useCallback((msg, step, total) => {
    setStatus(msg);
    setStatusStep(step);
    setStatusTotal(total);
  }, []);

  // On mount: always run through fetchSpaceTerminalSignals which checks
  // Supabase first, then localStorage, then live APIs.
  useEffect(() => {
    setLoading(true);
    fetchSpaceTerminalSignals(COMPANIES, onProgress)
      .then(signals => {
        setSnapshot(signals);
        setFetchedAt(Date.now());
      })
      .catch(() => {/* stale data already shown if available */})
      .finally(() => {
        setLoading(false);
        setStatus(null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    // Rate-limit
    if (signalAgeMs() < ST_MIN_REFRESH_MS) {
      setUpToDate(true);
      setTimeout(() => setUpToDate(false), 4000);
      return;
    }
    setRefreshing(true);
    setUpToDate(false);
    setPrevSnapshot(snapshot);

    fetchSpaceTerminalSignals(COMPANIES, onProgress)
      .then(signals => {
        setSnapshot(signals);
        setFetchedAt(Date.now());
      })
      .catch(() => {})
      .finally(() => {
        setRefreshing(false);
        setStatus(null);
      });
  }, [snapshot, onProgress]);

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  if (loading && !snapshot) {
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

  const currentSnapshot = snapshot ?? {};

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
        {/* KPI row — company cards */}
        <section className="kpi-row comp-kpi-row">
          {COMPANIES.map(c => {
            const scores = currentSnapshot[c.id] ?? {};
            const overall = overallScore(scores);
            return (
              <Link
                key={c.id}
                to={`/company/${c.id}`}
                className="kpi-card comp-kpi-card kpi-card-link"
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
          {/* Leaderboard — full width */}
          <div className="chart-card wide">
            <p className="chart-heading">Industry Leaderboard</p>
            <Leaderboard snapshot={currentSnapshot} prevSnapshot={prevSnapshot} />
          </div>

          {/* Heat map — full width */}
          <div className="chart-card wide">
            <p className="chart-heading">Signal Heat Map — click a domain header to highlight</p>
            <HeatMap
              snapshot={currentSnapshot}
              prevSnapshot={prevSnapshot}
              activeDomain={activeDomain}
              setActiveDomain={setActiveDomain}
            />
          </div>
        </div>

        {/* Methodology note */}
        <div className="comp-note">
          <span className="comp-note-icon">i</span>
          <p>
            <strong style={{ color: C.text }}>About these scores</strong> — Each domain pulls live data
            from a public API: news article counts (Spaceflight News), open job postings (Greenhouse / Lever),
            Hacker News story mentions, Wikipedia page views, and recent launch counts (Launch Library 2).
            Scores are normalized 0–100 relative to the top company in each domain.
            Refresh is rate-limited to once per 5 minutes.
          </p>
        </div>
      </main>

      <PageFooter note={
        <>Data sourced from{' '}
          <a href="https://api.spaceflightnewsapi.net" target="_blank" rel="noopener noreferrer">Spaceflight News API</a>,{' '}
          <a href="https://boards.greenhouse.io" target="_blank" rel="noopener noreferrer">Greenhouse</a>,{' '}
          <a href="https://hn.algolia.com/api" target="_blank" rel="noopener noreferrer">HN Algolia</a>,{' '}
          <a href="https://wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia</a>, and{' '}
          <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer">Launch Library 2</a>.
        </>
      } />
      <DebugPanel />
    </div>
  );
}
