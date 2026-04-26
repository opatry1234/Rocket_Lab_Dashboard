import React from 'react';

const listeners = new Set();
const log = [];

export function debugLog(tag, message) {
  const entry = {
    time: new Date().toISOString().substr(11, 12),
    tag,
    message,
    id: Date.now() + Math.random(),
  };
  log.push(entry);
  listeners.forEach(fn => fn([...log]));
}

export function useDebugLog() {
  const [entries, setEntries] = React.useState([...log]);
  React.useEffect(() => {
    listeners.add(setEntries);
    return () => listeners.delete(setEntries);
  }, []);
  return entries;
}

export function clearDebugLog() {
  log.length = 0;
  listeners.forEach(fn => fn([]));
}
