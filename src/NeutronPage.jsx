import React, { useEffect, useState } from 'react';
import { Breadcrumbs, C, PageFooter, VehicleHeroImage } from './shared';

const COMPLETION_PCT = 42;

const MILESTONES = [
  {
    title: 'Archimedes Engine Development',
    pct: 55,
    status: 'In Development',
    color: C.blue,
    detail: 'LOX/methane engine test campaigns are underway at NASA Stennis, moving toward qualification.',
  },
  {
    title: 'Launch Complex 3 - Wallops Island',
    pct: 40,
    status: 'Under Construction',
    color: C.yellow,
    detail: 'Pad and ground systems work is progressing at the Mid-Atlantic Regional Spaceport in Virginia.',
  },
  {
    title: 'Vehicle Structure and Manufacturing',
    pct: 35,
    status: 'In Progress',
    color: C.blue,
    detail: 'Composite structure development and manufacturing tooling continue at Rocket Lab facilities.',
  },
  {
    title: 'Avionics and Flight Software',
    pct: 30,
    status: 'Early Development',
    color: C.purple,
    detail: 'Flight systems build on Electron heritage while adapting to Neutron scale and reusability.',
  },
  {
    title: 'Reusability Systems',
    pct: 25,
    status: 'In Development',
    color: C.blue,
    detail: 'Reusable first-stage systems remain a core program goal, with recovery architecture in development.',
  },
  {
    title: 'Regulatory and Licensing',
    pct: 20,
    status: 'Pre-Launch License',
    color: C.orange,
    detail: 'Launch licensing and range readiness work will mature as vehicle and site readiness improves.',
  },
];

const TIMELINE = [
  { year: '2021', label: 'Neutron announced' },
  { year: '2022', label: 'Vehicle architecture and Archimedes engine revealed' },
  { year: '2023', label: 'Engine development and test preparation' },
  { year: '2024', label: 'LC-3 site work and engine test campaign progress' },
  { year: '2025', label: 'Qualification, manufacturing, and pad readiness push' },
  { year: '2026', label: 'Estimated first launch window', current: true },
];

const STATS = [
  { label: 'Target Payload', value: '13,000 kg', sub: 'to LEO' },
  { label: 'First Stage', value: 'Reusable', sub: 'program goal' },
  { label: 'Engine', value: 'Archimedes', sub: 'LOX/methane' },
  { label: 'Target Launch', value: '2026', sub: 'estimated' },
];

function StatusBadge({ status, color }) {
  return (
    <span className="status-badge" style={{ borderColor: `${color}55`, color, background: `${color}1A` }}>
      {status}
    </span>
  );
}

function MiniBar({ pct, color, animated }) {
  return (
    <div className="mini-bar">
      <div
        className="mini-bar-fill"
        style={{ width: animated ? `${pct}%` : '0%', background: color }}
      />
    </div>
  );
}

export default function NeutronPage() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app">
      <header className="hdr" style={{ borderBottomColor: C.green }}>
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon" style={{ background: `${C.green}22`, color: C.green }} aria-hidden="true">NT</span>
            <div>
              <h1 className="hdr-title" style={{ color: C.green }}>Neutron</h1>
              <p className="hdr-sub">Medium-lift reusable launch vehicle · Rocket Lab</p>
              <Breadcrumbs items={[
                { label: 'Space Terminal', to: '/' },
                { label: 'Rocket Lab', to: '/company/rocket-lab' },
                { label: 'Neutron' },
              ]} />
            </div>
          </div>
        </div>
      </header>

      <VehicleHeroImage src="/vehicles/neutron.jpg" />

      <div className="neutron-bar-wrap">
        <div className="neutron-bar-inner">
          <span className="neutron-bar-label">Neutron: First Launch Readiness</span>
          <div className="neutron-bar-track">
            <div className="neutron-bar-fill" style={{ width: animated ? `${COMPLETION_PCT}%` : '0%' }} />
            <span className="neutron-bar-pct">{COMPLETION_PCT}% Complete</span>
          </div>
        </div>
      </div>

      <main className="main">
        <section className="page-intro">
          <h1>Neutron Program Status</h1>
          <p>
            A curated snapshot of Rocket Lab's medium-lift reusable launch vehicle progress toward its first flight.
            Completion estimates are based on public announcements, investor updates, and visible program milestones.
          </p>
        </section>

        <div className="indev-main-content">
          <section className="detail-section">
            <p className="chart-heading">Development Milestones</p>
            <div className="neutron-milestone-grid">
              {MILESTONES.map((milestone) => (
                <article key={milestone.title} className="chart-card neutron-milestone-card">
                  <StatusBadge status={milestone.status} color={milestone.color} />
                  <h3>{milestone.title}</h3>
                  <MiniBar pct={milestone.pct} color={milestone.color} animated={animated} />
                  <div className="milestone-pct">{milestone.pct}%</div>
                  <p>{milestone.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <p className="chart-heading">Program Timeline</p>
            <div className="chart-card neutron-timeline-card">
              <div className="neutron-timeline-wrap">
                <div className="neutron-timeline-line" />
                {TIMELINE.map((item) => (
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

          <section className="detail-section">
            <p className="chart-heading">Key Specifications</p>
            <div className="kpi-row">
              {STATS.map((stat) => (
                <div key={stat.label} className="kpi-card" style={{ borderTopColor: C.green }}>
                  <div className="kpi-value neutron-stat-value" style={{ color: C.green }}>
                    {stat.value}
                  </div>
                  <div className="kpi-label">{stat.label}</div>
                  <div className="kpi-sub">{stat.sub}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <PageFooter note="Neutron data sourced from public Rocket Lab announcements and investor communications. Estimates are approximations." />
    </div>
  );
}
