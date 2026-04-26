import React, { useRef, useEffect, useState } from 'react';
import { useDebugLog, clearDebugLog } from './debugLog';

const TAG_COLORS = {
  SUPABASE:   '#58a6ff',
  CACHE:      '#e3b341',
  API:        '#3fb950',
  ERROR:      '#f85149',
  WARN:       '#d29922',
  DATA:       '#bc8cff',
};

const styles = {
  panel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#0d1117',
    borderTop: '1px solid #30363d',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#c9d1d9',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    gap: '6px',
    height: '28px',
    borderBottom: '1px solid #21262d',
  },
  barLabel: {
    flex: 1,
    color: '#8b949e',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  chevron: {
    color: '#8b949e',
    fontSize: '10px',
    transition: 'transform 0.15s',
  },
  body: {
    height: '250px',
    overflowY: 'auto',
    padding: '6px 0',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '2px 10px 4px',
    borderBottom: '1px solid #21262d',
  },
  clearBtn: {
    background: 'none',
    border: '1px solid #30363d',
    borderRadius: '4px',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '1px 8px',
  },
  entry: {
    display: 'flex',
    gap: '8px',
    padding: '1px 12px',
    lineHeight: '1.6',
  },
  time: {
    color: '#484f58',
    flexShrink: 0,
    minWidth: '96px',
  },
  tag: {
    flexShrink: 0,
    minWidth: '84px',
    fontWeight: 700,
  },
  msg: {
    color: '#c9d1d9',
    wordBreak: 'break-all',
  },
};

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const entries = useDebugLog();
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries, open]);

  const count = entries.length;

  return (
    <div style={styles.panel}>
      <div style={styles.bar} onClick={() => setOpen(o => !o)}>
        <span style={styles.barLabel}>
          🔧 Debug {count > 0 ? `(${count})` : ''}
        </span>
        <span style={{ ...styles.chevron, transform: open ? 'rotate(180deg)' : 'none' }}>▲</span>
      </div>

      {open && (
        <>
          <div style={styles.toolbar}>
            <button style={styles.clearBtn} onClick={clearDebugLog}>Clear</button>
          </div>
          <div style={styles.body} ref={bodyRef}>
            {entries.length === 0 && (
              <div style={{ ...styles.entry, color: '#484f58' }}>No log entries yet.</div>
            )}
            {entries.map(e => (
              <div key={e.id} style={styles.entry}>
                <span style={styles.time}>{e.time}</span>
                <span style={{ ...styles.tag, color: TAG_COLORS[e.tag] ?? '#8b949e' }}>
                  [{e.tag}]
                </span>
                <span style={styles.msg}>{e.message}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
