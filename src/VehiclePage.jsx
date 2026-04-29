import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { COMPANIES, VEHICLES, getCompany, getVehicle } from './spaceTerminalData';
import { fetchLaunchesByRocket, getStaleLaunchesByRocket } from './api';
import { isFlown, statusOf } from './processors';
import { Breadcrumbs, C, tt, tickStyle, ErrorPage, LoadingPage, PageFooter, VehicleHeroImage } from './shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cadenceByYear(launches) {
  const map = {};
  for (const l of launches) {
    if (!isFlown(l) || !l.net) continue;
    const y = new Date(l.net).getFullYear().toString();
    map[y] = (map[y] ?? 0) + 1;
  }
  return Object.entries(map).sort().map(([year, n]) => ({ year, n }));
}

function successRate(launches) {
  const flown = launches.filter(isFlown);
  if (!flown.length) return null;
  return +((flown.filter(l => statusOf(l) === 'Success').length / flown.length) * 100).toFixed(1);
}

// ─── In-development helpers ────────────────────────────────────────────────────

function InDevStatusBadge({ status, color }) {
  return (
    <span className="status-badge" style={{ borderColor: `${color}55`, color, background: `${color}1A` }}>
      {status}
    </span>
  );
}

function InDevMiniBar({ pct, color, animated }) {
  return (
    <div className="mini-bar">
      <div className="mini-bar-fill" style={{ width: animated ? `${pct}%` : '0%', background: color }} />
    </div>
  );
}

function milestoneColor(m) {
  if (m.color) return m.color;
  if (m.pct === 100) return C.green;
  if (m.pct >= 70)   return C.blue;
  if (m.pct >= 40)   return C.yellow;
  return C.orange;
}

// ─── In-production vehicle ─────────────────────────────────────────────────────

function InProductionVehicle({ company, vehicle }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const pct = vehicle.overallPct ?? 0;
  const timeline = vehicle.timeline ?? [];
  const stats = vehicle.stats ?? [];
  const colCount = timeline.length || 1;

  return (
    <div className="app">
      <header className="hdr" style={{ borderBottomColor: company.color }}>
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" style={{ background: `${company.color}22`, color: company.color }} aria-hidden="true">
              {vehicle.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="hdr-title" style={{ color: company.color }}>{vehicle.name}</h1>
              <p className="hdr-sub">{vehicle.tagline}</p>
              <Breadcrumbs items={[
                { label: 'Space Terminal', to: '/' },
                { label: company.name, to: `/company/${company.id}` },
                { label: vehicle.name },
              ]} />
            </div>
          </div>
        </div>
      </header>

      <VehicleHeroImage src={vehicle.heroImage} />

      <div className="neutron-bar-wrap">
        <div className="neutron-bar-inner">
          <span className="neutron-bar-label">{vehicle.name}: Development Progress</span>
          <div className="neutron-bar-track">
            <div className="neutron-bar-fill" style={{ width: animated ? `${pct}%` : '0%' }} />
            <span className="neutron-bar-pct">{pct}% Complete</span>
          </div>
        </div>
      </div>

      <main className="main">
        <div className="indev-main-content">

          {/* Development Milestones */}
          <section className="detail-section">
            <p className="chart-heading">Development Milestones</p>
            <div className="neutron-milestone-grid">
              {(vehicle.milestones ?? []).map((m, i) => {
                const col = milestoneColor(m);
                return (
                  <article key={i} className="chart-card neutron-milestone-card">
                    <InDevStatusBadge status={m.status} color={col} />
                    <h3>{m.title}</h3>
                    <InDevMiniBar pct={m.pct} color={col} animated={animated} />
                    <div className="milestone-pct">{m.pct}%</div>
                    <p>{m.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Program Timeline */}
          {timeline.length > 0 && (
            <section className="detail-section">
              <p className="chart-heading">Program Timeline</p>
              <div className="chart-card neutron-timeline-card">
                <div
                  className="neutron-timeline-wrap"
                  style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
                >
                  <div className="neutron-timeline-line" />
                  {timeline.map((item) => (
                    <div key={item.year} className="neutron-timeline-item">
                      <div className="neutron-timeline-year" style={{ color: item.current ? C.green : C.orange }}>
                        {item.year}
                      </div>
                      <div
                        className="neutron-timeline-dot"
                        style={{
                          background: item.current ? C.green : C.orange,
                          boxShadow: item.current ? `0 0 10px ${C.green}88` : 'none',
                        }}
                      />
                      <div className="neutron-timeline-text">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Key Specifications */}
          {stats.length > 0 && (
            <section className="detail-section">
              <p className="chart-heading">Key Specifications</p>
              <div className="kpi-row">
                {stats.map((stat) => (
                  <div key={stat.label} className="kpi-card" style={{ borderTopColor: company.color }}>
                    <div className="kpi-value" style={{ color: company.color, fontSize: '1.2rem' }}>
                      {stat.value}
                    </div>
                    <div className="kpi-label">{stat.label}</div>
                    <div className="kpi-sub">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <PageFooter note={`${vehicle.name} data sourced from public announcements and investor communications. Estimates are approximations.`} />
    </div>
  );
}

// ─── Usable vehicle ────────────────────────────────────────────────────────────

function UsableVehicle({ company, vehicle }) {
  const [launches, setLaunches] = useState(() => {
    return vehicle.ll2Name ? getStaleLaunchesByRocket(vehicle.ll2Name) : null;
  });
  const [loading, setLoading] = useState(() => !launches);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!vehicle.ll2Name) { setLoading(false); return; }
    const hadStale = !!launches;
    fetchLaunchesByRocket(vehicle.ll2Name)
      .then(data => { setLaunches(data); setLoading(false); })
      .catch(e => { if (!hadStale) setErr(e); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.ll2Name]);

  if (loading && !launches) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const flown = (launches ?? []).filter(isFlown);
  const rate  = successRate(flown);
  const cadence = cadenceByYear(launches ?? []);
  const firstYear = flown[0]?.net?.slice(0, 4) ?? null;

  return (
    <div className="app">
      <header className="hdr" style={{ borderBottomColor: company.color }}>
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" style={{ background: `${company.color}22`, color: company.color }} aria-hidden="true">
              {vehicle.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="hdr-title" style={{ color: company.color }}>{vehicle.name}</h1>
              <p className="hdr-sub">{vehicle.tagline}</p>
              <Breadcrumbs items={[
                { label: 'Space Terminal', to: '/' },
                { label: company.name, to: `/company/${company.id}` },
                { label: vehicle.name },
              ]} />
            </div>
          </div>
        </div>
      </header>

      <VehicleHeroImage src={vehicle.heroImage} />

      <main className="main">
        {/* KPI row */}
        <section className="kpi-row">
          <div className="kpi-card" style={{ borderTopColor: company.color }}>
            <div className="kpi-value" style={{ color: company.color }}>{flown.length}</div>
            <div className="kpi-label">Total Launches</div>
            {firstYear && <div className="kpi-sub">Since {firstYear}</div>}
          </div>
          <div className="kpi-card" style={{ borderTopColor: C.green }}>
            <div className="kpi-value" style={{ color: C.green }}>
              {rate !== null ? `${rate}%` : '—'}
            </div>
            <div className="kpi-label">Success Rate</div>
            <div className="kpi-sub">all-time</div>
          </div>
          {Object.entries(vehicle.specs ?? {}).slice(0, 3).map(([k, v]) => (
            <div key={k} className="kpi-card" style={{ borderTopColor: company.color }}>
              <div className="kpi-value" style={{ color: company.color, fontSize: '1.1rem' }}>{v}</div>
              <div className="kpi-label">{k.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </section>

        {/* Annual cadence */}
        {cadence.length > 0 && (
          <div className="chart-card wide">
            <p className="chart-heading">Annual Launch Cadence</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cadence} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip contentStyle={tt} formatter={(v) => [v, 'Launches']} />
                <Bar dataKey="n" fill={company.color} radius={[4, 4, 0, 0]} name="Launches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Missions list */}
        {flown.length > 0 && (
          <div className="chart-card wide">
            <p className="chart-heading">Recent Missions</p>
            <div className="st-mission-list">
              {[...flown].reverse().slice(0, 20).map((l, i) => {
                const status = statusOf(l);
                const color  = status === 'Success' ? C.green : status === 'Failure' ? C.red : C.yellow;
                return (
                  <div key={l.id ?? i} className="st-mission-row">
                    <span className="st-mission-dot" style={{ background: color }} />
                    <span className="st-mission-name">{l.name ?? '—'}</span>
                    <span className="st-mission-date">{l.net?.slice(0, 10) ?? ''}</span>
                    <span className="st-mission-status" style={{ color }}>{status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!vehicle.ll2Name && (
          <div className="comp-note">
            <span className="comp-note-icon">i</span>
            <p>Launch history data is not yet available for {vehicle.name}.</p>
          </div>
        )}
      </main>

      <PageFooter note="Launch data sourced from Launch Library 2." />
    </div>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────────

export default function VehiclePage() {
  const { slug, vehicleSlug } = useParams();
  const company = getCompany(slug);
  const vehicle = company ? getVehicle(company.id, vehicleSlug) : null;

  if (!company || !vehicle) {
    return (
      <div className="app">
        <main className="main">
          <div className="error-page">
            <h2>Vehicle not found</h2>
            <Link to={slug ? `/company/${slug}` : '/'} className="back-link">
              ← {slug ? 'Company' : 'Space Terminal'}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (vehicle.type === 'in-production') {
    return <InProductionVehicle company={company} vehicle={vehicle} />;
  }

  // usable, special-electron, special-neutron all use UsableVehicle template
  return <UsableVehicle company={company} vehicle={vehicle} />;
}
