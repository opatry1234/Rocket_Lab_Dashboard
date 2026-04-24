import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
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
import {
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
  return (
    <div className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="app-nav-mark">RL</span>
          <span className="app-nav-brand-text">Rocket Lab Dashboard</span>
        </div>
        <nav className="app-nav-tabs" aria-label="Primary navigation">
          <NavLink to="/" end className={({ isActive }) => `app-nav-tab${isActive ? ' active' : ''}`}>
            Electron
          </NavLink>
          <NavLink to="/neutron" className={({ isActive }) => `app-nav-tab${isActive ? ' active' : ''}`}>
            Neutron
          </NavLink>
        </nav>
      </div>
    </div>
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
            <span className="hdr-icon" aria-hidden="true">RL</span>
            <div>
              <h1 className="hdr-title">Electron Mission Dashboard</h1>
              <p className="hdr-sub">Rocket Lab analytics · Launch Library 2</p>
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
      <AppNav />
      <Routes>
        <Route path="/" element={<ElectronDashboard />} />
        <Route path="/neutron" element={<NeutronPage />} />
        <Route path="/launches" element={<TotalLaunchesPage />} />
        <Route path="/success-rate" element={<SuccessRatePage />} />
        <Route path="/upcoming" element={<UpcomingPage />} />
        <Route path="/launch-sites" element={<LaunchSitesPage />} />
      </Routes>
    </>
  );
}
