import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  COMPANIES, DOMAINS, SNAPSHOTS, NARRATIVES,
  overallScore, rankCompanies, velocityLabel, velocityColor, scoreColor,
} from './orbitalSignalData';
import { C, tt, tickStyle, PageFooter } from './shared';

// ─── Heat Map ──────────────────────────────────────────────────────────────────

function HeatMap({ snapshot, prevSnapshot, activeDomain }) {
  const ranked = rankCompanies(snapshot);

  return (
    <div className="os-heat-wrap">
      <div className="os-heat-grid">
        {/* Header row */}
        <div className="os-heat-corner" />
        {DOMAINS.map(d => (
          <div
            key={d.id}
            className={`os-heat-domain-header${activeDomain === d.id ? ' os-active-col' : ''}`}
          >
            {d.short}
          </div>
        ))}

        {/* Company rows */}
        {ranked.map(company => (
          <React.Fragment key={company.id}>
            <Link to={`/orbital-signal/${company.id}`} className="os-heat-company-cell">
              <span className="os-heat-rank">#{company.rank}</span>
              <span className="os-heat-name">{company.name}</span>
              <span
                className="os-heat-overall"
                style={{ color: scoreColor(company.overall) }}
              >
                {company.overall}
              </span>
            </Link>
            {DOMAINS.map(d => {
              const score = company.scores[d.id];
              const prevScore = prevSnapshot?.data[company.id]?.[d.id] ?? score;
              const color = scoreColor(score);
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
                  {score !== prevScore && (
                    <span
                      className="os-cell-delta"
                      style={{ color: score > prevScore ? C.green : C.red }}
                    >
                      {score > prevScore ? '↑' : '↓'}
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

// ─── Momentum Leaderboard ──────────────────────────────────────────────────────

function MomentumLeaderboard({ snapshot, prevSnapshot }) {
  const ranked = rankCompanies(snapshot);
  const maxScore = ranked[0]?.overall ?? 100;

  return (
    <div className="os-leaderboard">
      {ranked.map(company => {
        const prevOverall = prevSnapshot
          ? overallScore(prevSnapshot.data[company.id])
          : company.overall;
        const delta = company.overall - prevOverall;

        return (
          <Link
            key={company.id}
            to={`/orbital-signal/${company.id}`}
            className="os-leader-row"
          >
            <span className="os-leader-rank">#{company.rank}</span>
            <div className="os-leader-body">
              <div className="os-leader-top">
                <span className="os-leader-name">{company.name}</span>
                <div className="os-leader-score-col">
                  <span className="os-leader-score" style={{ color: scoreColor(company.overall) }}>
                    {company.overall}
                  </span>
                  {delta !== 0 && (
                    <span
                      className="os-leader-delta"
                      style={{ color: delta > 0 ? C.green : C.red }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
              </div>
              <div className="os-leader-bar-track">
                <div
                  className="os-leader-bar-fill"
                  style={{
                    width: `${(company.overall / maxScore) * 100}%`,
                    background: company.color,
                  }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Domain Comparison Chart ───────────────────────────────────────────────────

function DomainComparisonChart({ snapshot }) {
  const data = DOMAINS.map(domain => {
    const entry = { domain: domain.short };
    COMPANIES.forEach(company => {
      entry[company.id] = snapshot.data[company.id][domain.id];
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="domain" tick={tickStyle} />
        <YAxis tick={tickStyle} domain={[0, 100]} />
        <Tooltip contentStyle={tt} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 11, paddingTop: 8 }} />
        {COMPANIES.map(company => (
          <Bar
            key={company.id}
            dataKey={company.id}
            name={company.name}
            fill={company.color}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Refresh Button ────────────────────────────────────────────────────────────

function RefreshButton({ isRefreshing, onClick, label }) {
  return (
    <div className="os-refresh-group">
      <button
        className={`os-refresh-btn${isRefreshing ? ' refreshing' : ''}`}
        onClick={onClick}
        disabled={isRefreshing}
        aria-label="Refresh intelligence signals"
      >
        <span className="os-refresh-icon">⟳</span>
        {isRefreshing ? 'Refreshing…' : 'Refresh Signal'}
      </button>
      {label && <span className="os-signal-label">Signal: {label}</span>}
    </div>
  );
}

// ─── Orbital Signal Dashboard ──────────────────────────────────────────────────

export function OrbitalSignalDashboard() {
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDomain, setActiveDomain] = useState(null);

  const snapshot = SNAPSHOTS[snapshotIdx];
  const prevSnapshot = snapshotIdx > 0 ? SNAPSHOTS[snapshotIdx - 1] : null;

  function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    DOMAINS.forEach((d, i) => {
      setTimeout(() => setActiveDomain(d.id), i * 340);
    });
    setTimeout(() => {
      setSnapshotIdx(idx => (idx + 1) % SNAPSHOTS.length);
      setActiveDomain(null);
      setIsRefreshing(false);
    }, DOMAINS.length * 340 + 300);
  }

  const ranked = rankCompanies(snapshot);

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon os-hdr-icon" aria-hidden="true">OS</span>
            <div>
              <h1 className="hdr-title os-hdr-title">Orbital Signal</h1>
              <p className="hdr-sub">
                Industry momentum intelligence · {COMPANIES.length} companies · {DOMAINS.length} domains
              </p>
            </div>
          </div>
          <RefreshButton
            isRefreshing={isRefreshing}
            onClick={handleRefresh}
            label={snapshot.label}
          />
        </div>
      </header>

      <main className="main">
        {/* Domain leader KPIs */}
        <section className="os-kpi-row">
          {DOMAINS.map(domain => {
            const leader = ranked.reduce((best, c) =>
              c.scores[domain.id] > best.scores[domain.id] ? c : best
            );
            const score = leader.scores[domain.id];
            return (
              <div
                key={domain.id}
                className={`kpi-card${activeDomain === domain.id ? ' os-kpi-active' : ''}`}
                style={{ borderTopColor: scoreColor(score) }}
              >
                <div className="kpi-value" style={{ color: scoreColor(score), fontSize: '2.2rem' }}>
                  {score}
                </div>
                <div className="kpi-label" style={{ fontSize: '0.67rem' }}>{domain.label}</div>
                <div className="kpi-sub">↑ {leader.name}</div>
              </div>
            );
          })}
        </section>

        {/* Leaderboard + Heat Map */}
        <div className="os-dash-grid">
          <div className="chart-card os-leaderboard-card">
            <p className="chart-heading">Momentum Leaderboard</p>
            <MomentumLeaderboard snapshot={snapshot} prevSnapshot={prevSnapshot} />
          </div>

          <div className="chart-card os-heatmap-card">
            <p className="chart-heading">Industry Heat Map</p>
            <HeatMap
              snapshot={snapshot}
              prevSnapshot={prevSnapshot}
              activeDomain={activeDomain}
            />
          </div>
        </div>

        {/* Domain comparison full width */}
        <div className="chart-card" style={{ marginBottom: 20 }}>
          <p className="chart-heading">Domain Comparison — All Companies</p>
          <DomainComparisonChart snapshot={snapshot} />
        </div>

        <div className="comp-note">
          <span className="comp-note-icon">i</span>
          <span>
            Momentum scores are size-normalized: growth is measured relative to each company's
            own historical baseline. A score of 70 for a smaller company may represent greater
            absolute growth than 70 for a larger one. Scores aggregate public signals — news volume,
            hiring activity, investment announcements, social engagement, and operational cadence.
          </span>
        </div>
      </main>

      <PageFooter note="Orbital Signal · Public signals intelligence · Data aggregated from news, job boards, financial disclosures, and launch records" />
    </div>
  );
}

// ─── Company Profile Page ──────────────────────────────────────────────────────

function DomainScoreRow({ domain, score, prevScore }) {
  const color = scoreColor(score);
  const velLabel = velocityLabel(score, prevScore);

  return (
    <div className="os-domain-row">
      <div className="os-domain-row-left">
        <span className="os-domain-row-label">{domain.label}</span>
        <span className="os-domain-row-desc">{domain.desc}</span>
      </div>
      <div className="os-domain-row-right">
        <div className="os-domain-bar-track">
          <div
            className="os-domain-bar-fill"
            style={{ width: `${score}%`, background: color }}
          />
        </div>
        <div className="os-domain-row-meta">
          <span className="os-domain-score" style={{ color }}>{score}</span>
          <span className="os-velocity-badge" style={{ color: velocityColor(velLabel) }}>
            {velLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function NarrativeCard({ narrative }) {
  const domain = DOMAINS.find(d => d.id === narrative.domain);
  return (
    <div className="os-narrative-card">
      <div className="os-narrative-tag" style={{ color: C.blue }}>
        {domain?.label ?? narrative.domain}
      </div>
      <h3 className="os-narrative-title">{narrative.title}</h3>
      <p className="os-narrative-body">{narrative.body}</p>
    </div>
  );
}

export function CompanyProfilePage() {
  const { companyId } = useParams();
  const company = COMPANIES.find(c => c.id === companyId);

  if (!company) {
    return (
      <div className="fullpage">
        <h2 style={{ color: C.orange }}>Company not found</h2>
        <Link to="/orbital-signal" style={{ color: C.blue, marginTop: 16, display: 'block' }}>
          ← Back to Orbital Signal
        </Link>
      </div>
    );
  }

  const currentSnapshot = SNAPSHOTS[SNAPSHOTS.length - 1];
  const prevSnapshot = SNAPSHOTS[SNAPSHOTS.length - 2];

  const scores = currentSnapshot.data[company.id];
  const prevScores = prevSnapshot.data[company.id];
  const overall = overallScore(scores);

  const trendData = SNAPSHOTS.map((snap, i) => ({
    period: i === 0 ? 'T−2' : i === 1 ? 'T−1' : 'Current',
    score: overallScore(snap.data[company.id]),
  }));

  const domainBars = DOMAINS.map(d => ({
    name: d.short,
    score: scores[d.id],
  }));

  const narratives = NARRATIVES[company.id] ?? [];

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <Link to="/orbital-signal" className="back-btn">← Orbital Signal</Link>
            <span
              className="hdr-icon"
              style={{ background: company.color }}
              aria-hidden="true"
            >
              {company.shortName.slice(0, 2)}
            </span>
            <div>
              <h1
                className="hdr-title"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${company.color} 20%, ${company.color}88 100%)`,
                }}
              >
                {company.name}
              </h1>
              <p className="hdr-sub">
                {company.tagline} · Founded {company.founded} · {company.hq}
              </p>
            </div>
          </div>
          <div className="os-company-overall">
            <span className="os-overall-label">Overall Signal</span>
            <span className="os-overall-value" style={{ color: scoreColor(overall) }}>
              {overall}
            </span>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Domain KPI row (5-col) */}
        <section className="kpi-row os-profile-kpi-row">
          {DOMAINS.map(domain => {
            const score = scores[domain.id];
            const velLabel = velocityLabel(score, prevScores[domain.id]);
            return (
              <div
                key={domain.id}
                className="kpi-card"
                style={{ borderTopColor: scoreColor(score) }}
              >
                <div
                  className="kpi-value"
                  style={{ color: scoreColor(score), fontSize: '2rem' }}
                >
                  {score}
                </div>
                <div className="kpi-label" style={{ fontSize: '0.65rem' }}>{domain.label}</div>
                <div
                  className="kpi-sub"
                  style={{ color: velocityColor(velLabel) }}
                >
                  {velLabel}
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid">
          {/* Domain breakdown */}
          <div className="chart-card">
            <p className="chart-heading">Domain Breakdown</p>
            <div className="os-domain-rows">
              {DOMAINS.map(domain => (
                <DomainScoreRow
                  key={domain.id}
                  domain={domain}
                  score={scores[domain.id]}
                  prevScore={prevScores[domain.id]}
                />
              ))}
            </div>
          </div>

          {/* Trend chart */}
          <div className="chart-card">
            <p className="chart-heading">Overall Signal — Trend</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 12, right: 20, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="period" tick={tickStyle} />
                <YAxis domain={[0, 100]} tick={tickStyle} />
                <Tooltip contentStyle={tt} />
                <Line
                  dataKey="score"
                  stroke={company.color}
                  strokeWidth={3}
                  dot={{ fill: company.color, r: 5, strokeWidth: 0 }}
                  name="Overall Signal"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Horizontal domain scores */}
          <div className="chart-card wide">
            <p className="chart-heading">Domain Scores</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                layout="vertical"
                data={domainBars}
                margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" domain={[0, 100]} tick={tickStyle} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...tickStyle, fontSize: 11 }}
                  width={80}
                />
                <Tooltip contentStyle={tt} formatter={v => [v, 'Score']} />
                <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                  {domainBars.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational narratives */}
        <div style={{ marginTop: 28 }}>
          <p className="chart-heading" style={{ marginBottom: 16 }}>Operational Intelligence</p>
          <div className="os-narrative-grid">
            {narratives.map((n, i) => (
              <NarrativeCard key={i} narrative={n} />
            ))}
          </div>
        </div>
      </main>

      <PageFooter note="Orbital Signal · Company Intelligence Profile · Public signals aggregated from news, job boards, financial disclosures, and operational records" />
    </div>
  );
}
