import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAllElectronLaunches } from './api';
import { buildDashboardData } from './processors';

const DataContext = createContext(null);

export function useLaunchData() {
  return useContext(DataContext);
}

export default function DataProvider({ children }) {
  const [launches, setLaunches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchAllElectronLaunches()
      .then(setLaunches)
      .catch(setErr)
      .finally(() => setLoading(false));
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
