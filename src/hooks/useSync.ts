"use client";

import { useState, useCallback } from "react";
import type { SyncResult } from "@/lib/types";

interface UseSyncReturn {
  syncing: boolean;
  result: SyncResult | null;
  error: string | null;
  sync: () => Promise<SyncResult | null>;
  clearResult: () => void;
}

export function useSync(): UseSyncReturn {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (): Promise<SyncResult | null> => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/avito/sync", { method: "POST" });
      const data: SyncResult = await res.json();

      if (data.error) {
        setError(data.error);
        return null;
      }

      setResult(data);
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { syncing, result, error, sync, clearResult };
}
