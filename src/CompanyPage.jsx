import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  COMPANIES, DOMAINS, NARRATIVES, VEHICLES,
  overallScore, scoreColor, velocityLabel, velocityColor,
} from './spaceTerminalData';
import { getStaleSignals } from './api';
import { Breadcrumbs, C, tt, PageFooter } from './shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function VehicleCard({ companyId, vehicle }) {
  const isSpecial = vehicle.type.startsWith('special-');
  const isUsable  = vehicle.type === 'usable' || isSpecial;

  const badge = isSpecial
    ? (vehicle.type === 'special-electron' ? 'Operational' : 'In Development')
    : (vehicle.type === 'usable' ? 'Operational' : 'In Development');

  const badgeColor = badge === 'Operational' ? C.green : C.yellow;

  return (
    <Link
      to={`/company/${companyId}/${vehicle.slug}`}
      className="st-vehicle-card"
      style={{ borderTopColor: badgeColor }}
    >
      <div className="st-vehicle-badge" style={{ color: badgeColor }}>{badge}</div>
      <div className="st-vehicle-name">{vehicle.name}</div>
      <div className="st-vehicle-tagline">{vehicle.tagline}</div>
      <div className="st-vehicle-specs">
        {Object.entries(vehicle.specs ?? {}).slice(0, 3).map(([k, v]) => (
          <div key={k} className="st-vehicle-spec-row">
            <span className="st-spec-key">{k.replace(/_/g, ' ')}</span>
            <span className="st-spec-val">{v}</span>
          </div>
        ))}
      </div>
      {'overallPct' in vehicle && (
        <div className="st-vehicle-progress-wrap">
          <div className="st-vehicle-progress-label">
            <span>Development</span>
            <span style={{ color: C.yellow }}>{vehicle.overallPct}%</span>
          </div>
          <div className="st-vehicle-progress-bar">
            <div
              className="st-vehicle-progress-fill"
              style={{ width: `${vehicle.overallPct}%` }}
            />
          </div>
        </div>
      )}
      <span className="st-vehicle-cta">View details →</span>
    </Link>
  );
}

function NarrativeCard({ narrative }) {
  const domain = DOMAINS.find(d => d.id === narrative.domain);
  return (
    <div className="os-narrative-card">
      <div className="os-nar-domain">{domain?.short ?? narrative.domain}</div>
      <div className="os-nar-title">{narrative.title}</div>
      <div className="os-nar-body">{narrative.body}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const { slug } = useParams();
  const company = COMPANIES.find(c => c.id === slug);

  if (!company) {
    return (
      <div className="app">
        <main className="main">
          <div className="error-page">
            <h2>Company not found</h2>
            <Link to="/" className="back-link">← Space Terminal</Link>
          </div>
        </main>
      </div>
    );
  }

  const signals  = getStaleSignals();
  const scores   = signals?.[company.id] ?? {};
  const overall  = overallScore(scores);
  const vehicles = VEHICLES[company.id] ?? [];
  const narratives = NARRATIVES[company.id] ?? [];

  // Radar chart data
  const radarData = DOMAINS.map(d => ({
    domain: d.short,
    score:  scores[d.id] ?? 0,
    fullMark: 100,
  }));

  // Previous snapshot for velocity — use snapshot raw values (best-effort)
  const vel    = velocityLabel(overall, overall); // stable if no prev data
  const velCol = velocityColor(vel);

  return (
    <div className="app">
      <header className="hdr" style={{ borderBottomColor: company.color }}>
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" style={{ background: `${company.color}22`, color: company.color }} aria-hidden="true">
              {company.shortName}
            </span>
            <div>
              <h1 className="hdr-title" style={{ color: company.color }}>{company.name}</h1>
              <p className="hdr-sub">{company.tagline} · Founded {company.founded} · {company.hq}</p>
              <Breadcrumbs items={[
                { label: 'Space Terminal', to: '/' },
                { label: company.name },
              ]} />
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Signal KPIs */}
        <section className="kpi-row">
          <div className="kpi-card" style={{ borderTopColor: scoreColor(overall) }}>
            <div className="kpi-value" style={{ color: scoreColor(overall) }}>{overall || '—'}</div>
            <div className="kpi-label">Overall Signal</div>
            <div className="kpi-sub" style={{ color: velCol }}>{vel}</div>
          </div>
          {DOMAINS.map(d => (
            <div key={d.id} className="kpi-card" style={{ borderTopColor: scoreColor(scores[d.id] ?? 0) }}>
              <div className="kpi-value" style={{ color: scoreColor(scores[d.id] ?? 0) }}>
                {scores[d.id] ?? '—'}
              </div>
              <div className="kpi-label">{d.label}</div>
              <div className="kpi-sub">{d.short}</div>
            </div>
          ))}
        </section>

        <div className="grid">
          {/* Signal radar */}
          <div className="chart-card">
            <p className="chart-heading">Signal Profile</p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="domain" tick={{ fill: C.muted, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={company.name}
                  dataKey="score"
                  stroke={company.color}
                  fill={company.color}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip contentStyle={tt} formatter={(v) => [`${v} / 100`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Domain breakdown bars */}
          <div className="chart-card">
            <p className="chart-heading">Domain Breakdown</p>
            <div className="os-domain-bars">
              {DOMAINS.map(d => {
                const sc = scores[d.id] ?? 0;
                return (
                  <div key={d.id} className="os-domain-bar-row">
                    <div className="os-domain-bar-label">
                      <span>{d.label}</span>
                      <span style={{ color: scoreColor(sc) }}>{sc}</span>
                    </div>
                    <div className="os-domain-bar-track">
                      <div
                        className="os-domain-bar-fill"
                        style={{ width: `${sc}%`, background: scoreColor(sc) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vehicles */}
        {vehicles.length > 0 && (
          <section>
            <h2 className="st-section-title">Vehicles</h2>
            <div className="st-vehicle-grid">
              {vehicles.map(v => (
                <VehicleCard key={v.slug} companyId={company.id} vehicle={v} />
              ))}
            </div>
          </section>
        )}

        {/* Intelligence notes */}
        {narratives.length > 0 && (
          <section>
            <h2 className="st-section-title">Intelligence Notes</h2>
            <div className="os-narrative-grid">
              {narratives.map((n, i) => (
                <NarrativeCard key={i} narrative={n} />
              ))}
            </div>
          </section>
        )}

        {/* Company meta */}
        <div className="comp-note">
          <span className="comp-note-icon">i</span>
          <p>
            <strong style={{ color: C.text }}>{company.name}</strong> — Founded {company.founded} · HQ: {company.hq} ·
            {company.ticker !== 'Private' && ` Ticker: ${company.ticker} · `}
            {company.ticker === 'Private' && ' Privately held · '}
            Size tier: {company.size}.
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}
