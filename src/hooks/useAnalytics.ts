"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalyticsResponse } from "@/lib/types";

interface UseAnalyticsReturn {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAnalytics(days: number = 30): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/avito/analytics?days=${days}`);
      if (!res.ok) throw new Error(`Ошибка загрузки аналитики: ${res.status}`);
      const json: AnalyticsResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
