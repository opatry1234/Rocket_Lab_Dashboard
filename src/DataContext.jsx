import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAllElectronLaunches, getStaleElectronLaunches } from './api';
import { buildDashboardData } from './processors';

const DataContext = createContext(null);

export function useLaunchData() {
  return useContext(DataContext);
}

export default function DataProvider({ children }) {
  // Seed state with whatever is in cache right now (may be stale — that's fine).
  // This means repeat visitors never see a loading spinner.
  const [launches, setLaunches] = useState(() => getStaleElectronLaunches());
  const [loading, setLoading] = useState(() => !getStaleElectronLaunches());
  const [err, setErr] = useState(null);

  useEffect(() => {
    const hadStale = !!getStaleElectronLaunches();
    // fetchAllElectronLaunches returns from cache immediately if still valid,
    // or hits the network if the cache is expired — either way this is a background op.
    fetchAllElectronLaunches()
      .then(data => {
        setLaunches(data);
        setLoading(false);
      })
      .catch(e => {
        // Only surface the error if we have nothing to show.
        if (!hadStale) setErr(e);
        setLoading(false);
      });
  }, []);

  const value = useMemo(() => ({
    launches,
    dash: launches ? buildDashboardData(launches) : null,
    loading,
    err,
  }), [launches, loading, err]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
