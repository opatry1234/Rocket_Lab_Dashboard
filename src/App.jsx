import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useLaunchData } from './DataContext';
import {
  LaunchSitesPage,
  SuccessRatePage,
  TotalLaunchesPage,
  UpcomingPage,
} from './DetailPages';
import NeutronPage from './NeutronPage';
import SpaceTerminalPage from './SpaceTerminalPage';
import CompanyPage from './CompanyPage';
import VehiclePage from './VehiclePage';
import { COMPANIES } from './spaceTerminalData';
import {
  Breadcrumbs,
  C,
  ErrorPage,
  LoadingPage,
  PageFooter,
  fmtDate,
  missionName,
  tickStyle,
  tt,
} from './shared';
import './styles.css';

// ─── GA4 SPA page-view tracking ───────────────────────────────────────────────

const PAGE_TITLES = {
  '/':             'Space Terminal',
  '/launches':     'Electron · Total Launches',
  '/success-rate': 'Electron · Success Rate',
  '/upcoming':     'Electron · Upcoming Launches',
  '/launch-sites': 'Electron · Launch Sites',
};

function titleFromPath(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'company') return 'Space Terminal';
  const toLabel = s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (parts.length === 2) return `${toLabel(parts[1])} · Space Terminal`;
  if (parts.length === 3) return `${toLabel(parts[2])} · ${toLabel(parts[1])}`;
  return 'Space Terminal';
}

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    const title = titleFromPath(location.pathname);
    document.title = title;
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_title: title,
      });
    }
  }, [location.pathname]);
  return null;
}

// ─── Charts / helpers ─────────────────────────────────────────────────────────

const ORBIT_COLORS = [C.blue, C.orange, C.purple, C.green, C.yellow, C.pink];
const OUTCOME_COLORS = [C.green, C.red, C.yellow];
const ORBIT_NAMES = {
  LEO: 'Low Earth Orbit',
  SSO: 'Sun-Synchronous Orbit',
  ISS: 'International Space Station',
  MEO: 'Medium Earth Orbit',
  HEO: 'Highly Elliptical Orbit',
  GTO: 'Geostationary Transfer Orbit',
  GEO: 'Geostationary Orbit',
  PO: 'Polar Orbit',
  Sub: 'Suborbital',
  LO: 'Lunar Orbit',
  SO: 'Suborbital',
  TLI: 'Trans-Lunar Injection',
};

function KpiCard({ title, value, subtitle, color, to }) {
  const content = (
    <>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{title}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
    </>
  );

  if (to) {
    return (
      <Link className="kpi-card kpi-card-link" style={{ borderTopColor: color }} to={to} aria-label={`${title} details`}>
        {content}
      </Link>
    );
  }

  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      {content}
    </div>
  );
}

function ChartCard({ title, wide, children }) {
  return (
    <div className={`chart-card${wide ? ' wide' : ''}`}>
      <p className="chart-heading">{title}</p>
      {children}
    </div>
  );
}

function AppNav() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <div className="app-nav">
        <div className="app-nav-inner">
          <Link to="/" className="app-nav-brand">
            <span className="app-nav-mark">ST</span>
            <span className="app-nav-brand-text">Space Terminal</span>
          </Link>
          <button
            className="st-hamburger"
            onClick={() => setOpen(o => !o)}
            aria-label="Open company menu"
            aria-expanded={open}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Drawer overlay */}
      {open && <div className="st-drawer-overlay" onClick={() => setOpen(false)} />}

      {/* Drawer */}
      <nav
        ref={drawerRef}
        className={`st-drawer${open ? ' st-drawer-open' : ''}`}
        aria-label="Company navigation"
      >
        <div className="st-drawer-header">
          <span className="st-drawer-title">Companies</span>
          <button className="st-drawer-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="st-drawer-links">
          {COMPANIES.map(c => (
            <Link key={c.id} to={`/company/${c.id}`} className="st-drawer-link">
              <span className="st-drawer-dot" style={{ background: c.color }} />
              <span className="st-drawer-name">{c.name}</span>
              <span className="st-drawer-tag">{c.tagline}</span>
            </Link>
          ))}
        </div>
        <div className="st-drawer-footer">
          <Link to="/" className="st-drawer-home">⬡ Space Terminal Home</Link>
        </div>
      </nav>
    </>
  );
}

function SuccessYearTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <p>Success Rate: {row.rate}%</p>
      <p>
        Success/Failure:{' '}
        <span style={{ color: C.green }}>{row.successes}</span>
        <span style={{ color: C.muted }}>/</span>
        <span style={{ color: C.red }}>{row.failures}</span>
      </p>
      <p>Total Launches: {row.n}</p>
    </div>
  );
}

function ReliabilityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  const statusColor = row.status === 'Success' ? C.green : row.status === 'Failure' ? C.red : C.yellow;

  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">Flight #{label}</p>
      <p>{missionName({ name: row.mission })}</p>
      <p>{fmtDate(row.date)}</p>
      <p>Running Success: {row.rate}%</p>
      <p style={{ color: statusColor }}>Status: {row.status}</p>
      {row.status !== 'Success' && <p>Reason: {row.failureReason}</p>}
    </div>
  );
}

function ElectronDashboard() {
  const { dash, loading, err } = useLaunchData();

  if (loading) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const {
    cadenceYear, successOverall, successByYear,
    successRunning, payloadCategories, orbits, topCustomers,
    launchPads, meta,
  } = dash;

  const successRate = +(successOverall.rates['Success'] ?? 0);

  const yearBars = cadenceYear.labels.map((y, i) => ({ year: y, launches: cadenceYear.counts[i] }));
  const rateByYear = successByYear.labels.map((y, i) => ({
    year: y,
    rate: successByYear.rates[i],
    n: successByYear.totals[i],
    successes: successByYear.successes[i],
    failures: successByYear.failures[i],
  }));
  const runLine = successRunning.labels.map((label, i) => ({
    n: i + 1,
    date: label.split(' ').slice(1).join(' '),
    rate: successRunning.runningRate[i],
    status: successRunning.statuses[i],
    failureReason: successRunning.failureReasons[i],
    mission: successRunning.missionNames[i],
  }));
  const outcomePie = successOverall.labels.map((l, i) => ({ name: l, value: successOverall.counts[i] }));
  const orbitPie = orbits.labels.map((l, i) => ({ name: l, value: orbits.counts[i] }));
  const orbitLegend = orbitPie.map((entry, i) => ({
    ...entry,
    color: ORBIT_COLORS[i % ORBIT_COLORS.length],
    fullName: ORBIT_NAMES[entry.name] ?? entry.name,
  }));
  const payloadBars = payloadCategories.labels.slice(0, 8).map((l, i) => ({
    name: l, n: payloadCategories.counts[i],
  }));
  const customerBars = topCustomers.labels.slice(0, 8).map((l, i) => ({
    name: l, n: topCustomers.counts[i],
  }));
  const padBars = launchPads.labels.map((l, i) => ({
    name: l.length > 24 ? l.slice(0, 24) + '…' : l,
    n: launchPads.counts[i],
  }));

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" style={{ background: '#FF4B1222', color: '#FF4B12' }} aria-hidden="true">EL</span>
            <div>
              <h1 className="hdr-title" style={{ color: '#FF4B12' }}>Electron Mission Dashboard</h1>
              <p className="hdr-sub">Rocket Lab analytics · Launch Library 2</p>
              <Breadcrumbs items={[
                { label: 'Space Terminal', to: '/' },
                { label: 'Rocket Lab', to: '/company/rocket-lab' },
                { label: 'Electron' },
              ]} />
            </div>
          </div>
          <span className="hdr-date">
            Updated {new Date(meta.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      <main className="main">
        <section className="kpi-row">
          <KpiCard title="Total Launches" value={meta.totalLaunches} subtitle="flown missions" color={C.orange} to="/launches" />
          <KpiCard title="Success Rate" value={`${successRate}%`} subtitle="all-time" color={C.green} to="/success-rate" />
          <KpiCard title="Upcoming" value={meta.upcomingLaunches} subtitle="scheduled" color={C.blue} to="/upcoming" />
          <KpiCard title="Launch Sites" value={launchPads.labels.length} subtitle="active pads" color={C.purple} to="/launch-sites" />
        </section>

        <div className="grid">

          <ChartCard title="Annual Launch Cadence">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={yearBars} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="launches" fill={C.orange} radius={[4, 4, 0, 0]} name="Launches" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Success Rate by Year">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rateByYear} margin={{ top: 4, right: 28, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={tickStyle} />
                <Tooltip
                  content={<SuccessYearTooltip />}
                />
                <ReferenceLine
                  y={90}
                  stroke={C.yellow}
                  strokeDasharray="4 4"
                  label={{ value: '90%', fill: C.yellow, fontSize: 10, position: 'insideTopRight' }}
                />
                <Bar dataKey="rate" name="rate" radius={[4, 4, 0, 0]}>
                  {rateByYear.map((e, i) => (
                    <Cell key={i} fill={e.rate === 100 ? C.green : e.rate >= 80 ? '#7EE8A2' : C.yellow} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Reliability Trend — Running Success %">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={runLine} margin={{ top: 4, right: 16, left: -8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis
                  dataKey="n"
                  tick={tickStyle}
                  label={{ value: 'Flight #', position: 'insideBottomRight', offset: -4, fill: C.muted, fontSize: 10 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={tickStyle} />
                <Tooltip
                  content={<ReliabilityTooltip />}
                />
                <ReferenceLine y={90} stroke={C.yellow} strokeDasharray="4 4" />
                <Line dataKey="rate" stroke={C.green} strokeWidth={2} dot={false} name="Running %" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Mission Outcomes">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={outcomePie}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {outcomePie.map((_, i) => <Cell key={i} fill={OUTCOME_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconType="circle" wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orbit Destinations">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={orbitPie}
                  cx="50%" cy="50%"
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : null}
                  labelLine={{ stroke: C.muted, strokeWidth: 1 }}
                >
                  {orbitPie.map((_, i) => <Cell key={i} fill={ORBIT_COLORS[i % ORBIT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
              </PieChart>
            </ResponsiveContainer>
            <div className="orbit-legend" aria-label="Orbit abbreviation legend">
              {orbitLegend.map((orbit) => (
                <div key={orbit.name} className="orbit-legend-item">
                  <span className="orbit-legend-dot" style={{ background: orbit.color }} />
                  <span>
                    <strong>{orbit.name}</strong> - {orbit.fullName}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Mission Types (Top 8)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={payloadBars}
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle, fontSize: 10 }} width={115} />
                <Tooltip contentStyle={tt} formatter={(v) => [v, 'Missions']} />
                <Bar dataKey="n" fill={C.purple} radius={[0, 4, 4, 0]} name="Missions" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Customers">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={customerBars}
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle, fontSize: 10 }} width={115} />
                <Tooltip contentStyle={tt} formatter={(v) => [v, 'Missions']} />
                <Bar dataKey="n" fill={C.orange} radius={[0, 4, 4, 0]} name="Missions" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Launch Pad Utilization" wide>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={padBars} margin={{ top: 4, right: 16, left: -8, bottom: 56 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis
                  dataKey="name"
                  tick={{ ...tickStyle, fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip contentStyle={tt} formatter={(v) => [v, 'Missions']} />
                <Bar dataKey="n" fill={C.yellow} radius={[4, 4, 0, 0]} name="Missions" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </main>

      <PageFooter />
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteTracker />
      <AppNav />
      <Routes>
        {/* ── Space Terminal (main page) ── */}
        <Route path="/" element={<SpaceTerminalPage />} />

        {/* ── Company + vehicle hierarchy ── */}
        <Route path="/company/rocket-lab/electron" element={<ElectronDashboard />} />
        <Route path="/company/rocket-lab/neutron"  element={<NeutronPage />} />
        <Route path="/company/:slug/:vehicleSlug"   element={<VehiclePage />} />
        <Route path="/company/:slug"               element={<CompanyPage />} />

        {/* ── Electron sub-pages (keep for backward compat & KPI links) ── */}
        <Route path="/launches"     element={<TotalLaunchesPage />} />
        <Route path="/success-rate" element={<SuccessRatePage />} />
        <Route path="/upcoming"     element={<UpcomingPage />} />
        <Route path="/launch-sites" element={<LaunchSitesPage />} />
      </Routes>
    </>
  );
}
