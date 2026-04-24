import React from 'react';
import { Link } from 'react-router-dom';
import { RateLimitError } from './api';
import { isFlown, statusOf } from './processors';

export const C = {
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

export const tt = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
};

export const tickStyle = { fill: C.muted, fontSize: 11 };

export function fmtDate(isoStr) {
  if (!isoStr) return 'TBD';
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDateTime(isoStr) {
  if (!isoStr) return 'TBD';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function missionName(launch) {
  const name = launch?.name ?? 'Unnamed mission';
  return name.replace(/^Electron\s*[|]\s*/i, '').trim() || name;
}

export function customerNames(launch) {
  const agencies = launch?.mission?.agencies ?? [];
  const customers = agencies
    .map((agency) => agency.name)
    .filter((name) => name && name.toLowerCase() !== 'rocket lab');

  return customers.length ? customers.join(', ') : 'Rocket Lab / undisclosed';
}

export function cleanText(value, fallback = 'No public details available.') {
  if (!value) return fallback;
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

export function shortFailureReason(launch) {
  const status = statusOf(launch);
  if (status === 'Partial Failure') return 'Partial mission success';
  if (status !== 'Failure') return 'Mission successful';

  const source = cleanText(
    launch?.failreason || launch?.failure_reason || launch?.status?.description,
    'Launch vehicle failure'
  );
  return source.split(/\s+/).slice(0, 5).join(' ');
}

export function missionSummary(launch) {
  return cleanText(
    launch?.mission?.description || launch?.status?.description,
    isFlown(launch) ? 'Mission details are limited.' : 'Upcoming mission details are limited.'
  );
}

export function StatusBadge({ status }) {
  const colors = {
    Success: C.green,
    Failure: C.red,
    'Partial Failure': C.yellow,
    Go: C.blue,
    TBD: C.muted,
    TBC: C.muted,
    Hold: C.yellow,
    Scheduled: C.blue,
    'To Be Confirmed': C.muted,
    'To Be Determined': C.muted,
  };
  const color = colors[status] ?? C.muted;

  return (
    <span className="status-badge" style={{ borderColor: `${color}55`, color, background: `${color}1A` }}>
      {status}
    </span>
  );
}

export function DetailHeader({ title, subtitle }) {
  return (
    <header className="hdr">
      <div className="hdr-inner">
        <div className="hdr-brand">
          <Link to="/" className="back-btn">Back to Dashboard</Link>
          <span className="hdr-icon" role="img" aria-label="rocket">Rocket</span>
          <div>
            <h1 className="hdr-title">{title}</h1>
            {subtitle && <p className="hdr-sub">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}

export function PageFooter({ note }) {
  return (
    <footer className="ftr">
      {note ?? (
        <>
          Data sourced from{' '}
          <a href="https://ll.thespacedevs.com" target="_blank" rel="noopener noreferrer">
            Launch Library 2
          </a>
        </>
      )}{' '}
      · Built by Owen Patry
    </footer>
  );
}

export function LoadingPage() {
  return (
    <div className="fullpage">
      <div className="spinner" />
      <p style={{ color: C.muted, marginTop: 16 }}>Fetching launch data from Launch Library 2...</p>
      <p style={{ color: C.border, marginTop: 6, fontSize: '0.75rem' }}>First load may take a moment</p>
    </div>
  );
}

export function ErrorPage({ err }) {
  return (
    <div className="fullpage">
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>!</div>
      <h2 style={{ color: C.orange }}>Failed to load launch data</h2>
      <p style={{ color: C.muted, marginTop: 8, maxWidth: 400 }}>{err?.message}</p>
      {err instanceof RateLimitError && (
        <p style={{ color: C.yellow, marginTop: 8, fontSize: '0.85rem' }}>
          LL2 free tier rate limit hit. Retry after {err.retryAfterSeconds}s.
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
