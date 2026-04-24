import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fetchAllElectronLaunches, RateLimitError } from './api';
import { buildDashboardData } from './processors';
import './styles.css';

const C = {
  orange: '#FF4B12',
  blue: '#00AAFF',
  green: '#00D2A0',
  yellow: '#FFB800',
  red: '#FF4B4B',
  purple: '#7B61FF',
  pink: '#FF6B9D',
  muted: '#8B9BC0',
  border: '#1E2A40',
  surface: '#141928',
  text: '#E8EAF0',
};

const ORBIT_COLORS = [C.blue, C.orange, C.purple, C.green, C.yellow, C.pink];
const OUTCOME_COLORS = [C.green, C.red, C.yellow];
const tt = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text };
const tickStyle = { fill: C.muted, fontSize: 11 };

function KpiCard({ title, value, subtitle, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{title}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
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

export default function App() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchAllElectronLaunches()
      .then((launches) => setDash(buildDashboardData(launches)))
      .catch(setErr)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="fullpage">
        <div className="spinner" />
        <p style={{ color: C.muted, marginTop: 16 }}>Fetching launch data from Launch Library 2…</p>
        <p style={{ color: C.border, marginTop: 6, fontSize: '0.75rem' }}>First load may take a moment</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="fullpage">
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
        <h2 style={{ color: C.orange }}>Failed to load launch data</h2>
        <p style={{ color: C.muted, marginTop: 8, maxWidth: 400 }}>{err.message}</p>
        {err instanceof RateLimitError && (
          <p style={{ color: C.yellow, marginTop: 8, fontSize: '0.85rem' }}>
            LL2 free tier rate limit hit — retry after {err.retryAfterSeconds}s
          </p>
        )}
        <button
          style={{ marginTop: 20, padding: '8px 24px', background: C.orange, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    cadenceYear, cumulative, successOverall, successByYear,
    successRunning, payloadCategories, orbits, topCustomers,
    launchPads, meta,
  } = dash;

  const successRate = +(successOverall.rates['Success'] ?? 0);

  const yearBars = cadenceYear.labels.map((y, i) => ({ year: y, launches: cadenceYear.counts[i] }));
  const cumLine = cumulative.dates.map((d, i) => ({ d, n: cumulative.cumulative[i] }));
  const rateByYear = successByYear.labels.map((y, i) => ({
    year: y, rate: successByYear.rates[i], n: successByYear.totals[i],
  }));
  const runLine = successRunning.labels.map((_, i) => ({
    n: i + 1, rate: successRunning.runningRate[i],
  }));
  const outcomePie = successOverall.labels.map((l, i) => ({ name: l, value: successOverall.counts[i] }));
  const orbitPie = orbits.labels.map((l, i) => ({ name: l, value: orbits.counts[i] }));
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
            <span className="hdr-icon" role="img" aria-label="rocket">🚀</span>
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
          <KpiCard title="Total Launches" value={meta.totalLaunches} subtitle="flown missions" color={C.orange} />
          <KpiCard title="Success Rate" value={`${successRate}%`} subtitle="all-time" color={C.green} />
          <KpiCard title="Upcoming" value={meta.upcomingLaunches} subtitle="scheduled" color={C.blue} />
          <KpiCard title="Launch Sites" value={launchPads.labels.length} subtitle="active pads" color={C.purple} />
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

          <ChartCard title="Cumulative Launches Over Time">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cumLine} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis
                  dataKey="d"
                  tick={tickStyle}
                  tickFormatter={(v) => v.slice(0, 4)}
                  interval={Math.max(1, Math.floor(cumLine.length / 6))}
                />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip contentStyle={tt} formatter={(v) => [v, 'Missions']} />
                <Area dataKey="n" stroke={C.blue} fill="url(#blueGrad)" strokeWidth={2} dot={false} name="Total" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Success Rate by Year">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rateByYear} margin={{ top: 4, right: 28, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={tickStyle} />
                <Tooltip
                  contentStyle={tt}
                  formatter={(v, name) => name === 'rate' ? [`${v}%`, 'Success Rate'] : [v, 'Launches']}
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
                  contentStyle={tt}
                  formatter={(v) => [`${v}%`, 'Success Rate']}
                  labelFormatter={(v) => `Flight #${v}`}
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

      <footer className="ftr">
        Data sourced from{' '}
        <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer">
          Launch Library 2
        </a>{' '}
        · Built by Owen Patry
      </footer>
    </div>
  );
}
