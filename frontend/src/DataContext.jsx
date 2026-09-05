import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

// Shared application data, loaded once and reused across routes.
//
// Without this, navigating between /dashboard and /districts/:id would refetch
// 135 complaints and the full priority ranking on every click. Pages read from
// here and call reload() after any write.
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [health, setHealth] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [h, p, c] = await Promise.all([
        api.health(),
        api.priorities(),
        api.complaints(),
      ]);
      setHealth(h);
      setPriorities(p);
      setComplaints(c);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <DataContext.Provider
      value={{ health, priorities, complaints, loading, error, reload }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside a DataProvider");
  return ctx;
}
