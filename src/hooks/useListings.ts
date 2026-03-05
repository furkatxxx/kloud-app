"use client";

import { useState, useEffect, useCallback } from "react";
import type { ListingDTO } from "@/lib/types";

interface UseListingsOptions {
  autoLoad?: boolean;
  status?: string;
  limit?: number;
}

interface UseListingsReturn {
  listings: ListingDTO[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  reload: () => Promise<void>;
}

export function useListings(options: UseListingsOptions = {}): UseListingsReturn {
  const { autoLoad = true, status, limit = 12 } = options;
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      });
      if (status) params.set("status", status);

      const res = await fetch(`/api/avito/listings?${params}`);
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);

      const data = await res.json();
      setListings(data.items);
      setTotal(data.total);
      setPageState(data.page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, limit]);

  const setPage = useCallback((newPage: number) => {
    loadPage(newPage);
  }, [loadPage]);

  const reload = useCallback(() => loadPage(page), [loadPage, page]);

  useEffect(() => {
    if (autoLoad) loadPage(1);
  }, [autoLoad, loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return { listings, total, page, totalPages, loading, error, setPage, reload };
}
