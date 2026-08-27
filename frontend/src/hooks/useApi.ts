import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Minimal fetch hook. The public site is read-mostly, so a full query cache is
 * only justified inside the admin panel.
 */
export function useApi<T>(
  path: string | null,
  params?: Record<string, unknown>,
  auth = false,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params ?? {});

  const run = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const result = auth
        ? await api.admin.get<T>(path, params)
        : await api.get<T>(path, params);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, auth]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}
