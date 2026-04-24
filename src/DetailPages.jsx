import React from 'react';
import {
  BarChart, Bar, Cell, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useLaunchData } from './DataContext';
import { isFlown, statusOf } from './processors';
import {
  C,
  DetailHeader,
  ErrorPage,
  LoadingPage,
  PageFooter,
  StatusBadge,
  customerNames,
  fmtDate,
  fmtDateTime,
  missionName,
  missionSummary,
  shortFailureReason,
  tickStyle,
  tt,
} from './shared';

function sortByDateAsc(a, b) {
  return new Date(a.net ?? 0) - new Date(b.net ?? 0);
}

function sortByDateDesc(a, b) {
  return new Date(b.net ?? 0) - new Date(a.net ?? 0);
}

function useReadyData() {
  const data = useLaunchData();
  if (!data || data.loading) return { loading: true };
  if (data.err) return { err: data.err };
  return data;
}

function MissionRow({ launch, children }) {
  return (
    <article className="mission-row">
      <div className="mission-row-main">
        <div>
          <div className="mission-title-line">
            <h3>{missionName(launch)}</h3>
            <StatusBadge status={statusOf(launch)} />
          </div>
          <p className="mission-meta">
            {fmtDateTime(launch.net)} · {launch.pad?.name ?? 'Unknown pad'}
          </p>
        </div>
        <div className="mission-side">
          <span>{launch.mission?.orbit?.abbrev ?? 'Orbit TBD'}</span>
          <span>{customerNames(launch)}</span>
        </div>
      </div>
      {children && <div className="mission-row-detail">{children}</div>}
    </article>
  );
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function TotalLaunchesPage() {
  const { launches, loading, err } = useReadyData();
  if (loading) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const flown = launches.filter(isFlown).sort(sortByDateDesc);

  return (
    <div className="app">
      <DetailHeader title="Electron Launch History" subtitle={`${flown.length} flown missions, most recent first`} />
      <main className="main detail-main">
        <section className="mission-list">
          {flown.map((launch) => (
            <MissionRow key={launch.id ?? launch.slug ?? launch.name} launch={launch}>
              <p>{missionSummary(launch)}</p>
            </MissionRow>
          ))}
        </section>
      </main>
      <PageFooter />
    </div>
  );
}

export function SuccessRatePage() {
  const { launches, dash, loading, err } = useReadyData();
  if (loading) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const flown = launches.filter(isFlown);
  const failed = flown.filter((launch) => statusOf(launch) !== 'Success').sort(sortByDateDesc);
  const succeeded = flown.filter((launch) => statusOf(launch) === 'Success').sort(sortByDateDesc);
  const chartData = dash.successOverall.labels.map((label, index) => ({
    name: label,
    missions: dash.successOverall.counts[index],
  }));

  return (
    <div className="app">
      <DetailHeader title="Electron Success Analysis" subtitle="Mission outcomes, failure notes, and completed mission goals" />
      <main className="main detail-main">
        <section className="chart-card detail-chart">
          <p className="chart-heading">Mission Outcomes</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={tickStyle} />
              <YAxis tick={tickStyle} allowDecimals={false} />
              <Tooltip contentStyle={tt} formatter={(value) => [value, 'Missions']} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Bar dataKey="missions" name="Missions" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === 'Success' ? C.green : entry.name === 'Failure' ? C.red : C.yellow}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="detail-section">
          <p className="chart-heading">Failures and Partial Failures</p>
          <div className="mission-list compact">
            {failed.length ? failed.map((launch) => (
              <MissionRow key={launch.id ?? launch.slug ?? launch.name} launch={launch}>
                <p><strong>Reason:</strong> {shortFailureReason(launch)}</p>
              </MissionRow>
            )) : <EmptyState>No failures recorded in the current data.</EmptyState>}
          </div>
        </section>

        <section className="detail-section">
          <p className="chart-heading">Successful Missions</p>
          <div className="mission-list compact">
            {succeeded.map((launch) => (
              <MissionRow key={launch.id ?? launch.slug ?? launch.name} launch={launch}>
                <p><strong>Accomplished:</strong> {missionSummary(launch)}</p>
              </MissionRow>
            ))}
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  );
}

export function UpcomingPage() {
  const { launches, loading, err } = useReadyData();
  if (loading) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const upcoming = launches.filter((launch) => !isFlown(launch)).sort(sortByDateAsc);

  return (
    <div className="app">
      <DetailHeader title="Upcoming Electron Missions" subtitle={`${upcoming.length} scheduled or pending missions from Launch Library 2`} />
      <main className="main detail-main">
        <section className="mission-list">
          {upcoming.length ? upcoming.map((launch) => (
            <MissionRow key={launch.id ?? launch.slug ?? launch.name} launch={launch}>
              <p>{missionSummary(launch)}</p>
            </MissionRow>
          )) : <EmptyState>No upcoming Electron missions are currently listed.</EmptyState>}
        </section>
      </main>
      <PageFooter />
    </div>
  );
}

export function LaunchSitesPage() {
  const { launches, loading, err } = useReadyData();
  if (loading) return <LoadingPage />;
  if (err) return <ErrorPage err={err} />;

  const byPad = launches.reduce((acc, launch) => {
    const pad = launch.pad?.name ?? 'Unknown pad';
    acc[pad] ??= [];
    acc[pad].push(launch);
    return acc;
  }, {});

  const sites = Object.entries(byPad)
    .map(([pad, padLaunches]) => ({
      pad,
      flownCount: padLaunches.filter(isFlown).length,
      upcoming: padLaunches.filter((launch) => !isFlown(launch)).sort(sortByDateAsc).slice(0, 5),
    }))
    .sort((a, b) => b.flownCount - a.flownCount);

  return (
    <div className="app">
      <DetailHeader title="Electron Launch Sites" subtitle="Pad utilization and next planned missions by location" />
      <main className="main detail-main">
        <section className="site-grid">
          {sites.map((site) => (
            <article key={site.pad} className="chart-card site-card">
              <div className="site-card-head">
                <h3>{site.pad}</h3>
                <span>{site.flownCount} flown</span>
              </div>
              <p className="chart-heading">Next Planned Missions</p>
              {site.upcoming.length ? (
                <ol className="site-upcoming-list">
                  {site.upcoming.map((launch) => (
                    <li key={launch.id ?? launch.slug ?? launch.name}>
                      <strong>{missionName(launch)}</strong>
                      <span>{fmtDate(launch.net)} · {statusOf(launch)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState>No planned missions listed for this pad.</EmptyState>
              )}
            </article>
          ))}
        </section>
      </main>
      <PageFooter />
    </div>
  );
}
