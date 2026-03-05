"use client";

import { useState, useEffect, useCallback } from "react";

interface VASSettingsDTO {
  id: string;
  listingId: string;
  bidEnabled: boolean;
  bidAmount: number | null;
  bidDailyLimit: number | null;
  xlEnabled: boolean;
  listing: { id: string; title: string; price: number; status: string };
}

interface VASActionDTO {
  id: string;
  listingId: string;
  action: string;
  details: string | null;
  cost: number | null;
  trigger: string;
  createdAt: string;
  listing: { id: string; title: string };
}

interface VASListingDTO {
  id: string;
  title: string;
  price: number;
  status: string;
}

interface VASResponse {
  settings: VASSettingsDTO[];
  history: VASActionDTO[];
  listings: VASListingDTO[];
  totalSpent: number;
}

interface UseVASReturn {
  data: VASResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateSettings: (listingId: string, settings: {
    bidEnabled?: boolean;
    bidAmount?: number;
    bidDailyLimit?: number;
    xlEnabled?: boolean;
  }) => Promise<boolean>;
}

export function useVAS(): UseVASReturn {
  const [data, setData] = useState<VASResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/avito/vas");
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
      const json: VASResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateSettings = async (
    listingId: string,
    settings: {
      bidEnabled?: boolean;
      bidAmount?: number;
      bidDailyLimit?: number;
      xlEnabled?: boolean;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/avito/vas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, ...settings }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Ошибка сохранения");
      }
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  return { data, loading, error, reload, updateSettings };
}
