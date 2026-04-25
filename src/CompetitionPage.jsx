import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLaunchData } from './DataContext';
import { fetchLaunchesByRocket } from './api';
import { isFlown, statusOf } from './processors';
import { C, ErrorPage, LoadingPage, PageFooter, tickStyle, tt } from './shared';

const ROCKETS = [
  { name: 'Electron',  color: C.orange },
  { name: 'Falcon 9',  color: C.blue   },
  { name: 'Terran R',  color: C.purple },
];

// ─── Data helpers ─────────────────────────────────────────────────────────────

function yearCadence(launches) {
  const byYear = {};
  for (const l of launches) {
    if (!isFlown(l) || !l.net) continue;
    const y = new Date(l.net).getFullYear().toString();
    byYear[y] = (byYear[y] ?? 0) + 1;
  }
  return byYear;
}

function yearEndCumulative(launches) {
  const by = yearCadence(launches);
  const years = Object.keys(by).sort();
  let cum = 0;
  return years.map((y) => { cum += by[y]; return { year: y, count: cum }; });
}

function successRate(launches) {
  const flown = launches.filter(isFlown);
  if (!flown.length) return null;
  return +((flown.filter((l) => statusOf(l) === 'Success').length / flown.length) * 100).toFixed(1);
}

function firstLaunchYear(launches) {
  const flown = launches.filter((l) => isFlown(l) && l.net).sort((a, b) => new Date(a.net) - new Date(b.net));
  return flown[0]?.net?.slice(0, 4) ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartCard({ title, wide, children }) {
  return (
    <div className={`chart-card${wide ? ' wide' : ''}`}>
      <p className="chart-heading">{title}</p>
      {children}
    </div>
  );
}

function RocketKpiCard({ name, color, launches }) {
  const flown = launches.filter(isFlown).length;
  const rate = successRate(launches);
  const since = firstLaunchYear(launches);

  return (
    <div className="kpi-card comp-kpi-card" style={{ borderTopColor: color }}>
      <div className="comp-kpi-rocket" style={{ color }}>{name}</div>
      <div className="kpi-value" style={{ color }}>{flown}</div>
      <div className="kpi-label">Flown Missions</div>
      <div className="comp-kpi-meta">
        {rate !== null ? `${rate}% success` : 'No flights yet'}
        {since && <span>Since {since}</span>}
      </div>
    </div>
  );
}

function CadenceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value} launches</p>
      ))}
    </div>
  );
}

function CumulativeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.filter((p) => p.value != null).map((p) => (
        <p key={p.name} style={{ color: p.stroke }}>{p.name}: {p.value} total</p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitionPage() {
  const { launches: electronLaunches, loading: electronLoading, err: electronErr } = useLaunchData();
  const [compLaunches, setCompLaunches] = useState(null);
  const [compLoading, setCompLoading] = useState(true);
  const [compErr, setCompErr] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchLaunchesByRocket('Falcon 9'),
      fetchLaunchesByRocket('Terran R'),
    ])
      .then(([falcon9, terranR]) => setCompLaunches({ falcon9, terranR }))
      .catch(setCompErr)
      .finally(() => setCompLoading(false));
  }, []);

  if (electronLoading || compLoading) return <LoadingPage />;
  if (electronErr || compErr) return <ErrorPage err={electronErr || compErr} />;

  const { falcon9, terranR } = compLaunches;
  const allLaunches = [electronLaunches, falcon9, terranR];

  // Annual cadence grouped bar chart data
  const cadenceByRocket = allLaunches.map(yearCadence);
  const allYears = [...new Set(cadenceByRocket.flatMap(Object.keys))].sort();
  const cadenceData = allYears.map((year) => ({
    year,
    Electron:  cadenceByRocket[0][year] ?? 0,
    'Falcon 9': cadenceByRocket[1][year] ?? 0,
    'Terran R': cadenceByRocket[2][year] ?? 0,
  }));

  // Cumulative line chart data (year-end totals, forward-filled)
  const cumByRocket = allLaunches.map(yearEndCumulative);
  const cumYears = [...new Set(cumByRocket.flatMap((r) => r.map((d) => d.year)))].sort();
  let last = [0, 0, 0];
  const cumulativeData = cumYears.map((year) => {
    last = cumByRocket.map((pts, i) => pts.find((d) => d.year === year)?.count ?? last[i]);
    return {
      year,
      Electron:   last[0] || undefined,
      'Falcon 9': last[1] || undefined,
      'Terran R': last[2] || undefined,
    };
  });

  const terranHasFlown = terranR.filter(isFlown).length > 0;

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" aria-hidden="true">RL</span>
            <div>
              <h1 className="hdr-title">Industry Competition</h1>
              <p className="hdr-sub">Electron · Falcon 9 · Terran R — cadence &amp; mission comparison</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="kpi-row comp-kpi-row">
          {ROCKETS.map(({ name, color }, i) => (
            <RocketKpiCard key={name} name={name} color={color} launches={allLaunches[i]} />
          ))}
        </section>

        <div className="grid">
          <ChartCard title="Annual Launch Cadence — Launches per Year" wide>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cadenceData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip content={<CadenceTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ color: C.muted, fontSize: 12 }} />
                <Bar dataKey="Electron"  fill={C.orange} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Falcon 9"  fill={C.blue}   radius={[4, 4, 0, 0]} />
                <Bar dataKey="Terran R"  fill={C.purple} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cumulative Missions Over Time" wide>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativeData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip content={<CumulativeTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ color: C.muted, fontSize: 12 }} />
                <Line dataKey="Electron"  stroke={C.orange} strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="Falcon 9"  stroke={C.blue}   strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="Terran R"  stroke={C.purple} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {!terranHasFlown && (
          <div className="comp-note">
            <span className="comp-note-icon">i</span>
            <p>
              <strong style={{ color: C.text }}>Terran R</strong> (Relativity Space) is a next-generation
              reusable medium-lift rocket still in development — no orbital flights have occurred yet.
              It appears here as a near-term competitor to watch.
            </p>
          </div>
        )}
      </main>

      <PageFooter note={
        <>Data sourced from{' '}
          <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer">Launch Library 2</a>.
          {' '}Terran R status based on publicly available program information.
        </>
      } />
    </div>
  );
}
