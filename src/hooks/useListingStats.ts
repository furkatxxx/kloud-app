"use client";

import { useState, useEffect, useCallback } from "react";
import type { StatsResponse } from "@/lib/types";

interface UseListingStatsReturn {
  stats: StatsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useListingStats(
  listingId: string | undefined,
  days: number = 30
): UseListingStatsReturn {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/avito/stats?listingId=${listingId}&days=${days}`);
      if (!res.ok) throw new Error(`Ошибка загрузки статистики: ${res.status}`);
      const data: StatsResponse = await res.json();
      setStats(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listingId, days]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, loading, error, reload };
}
