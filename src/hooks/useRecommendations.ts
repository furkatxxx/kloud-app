"use client";

import { useState, useEffect, useCallback } from "react";

interface RecommendationDTO {
  id: string;
  listingId: string;
  ruleId: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string;
  field: string | null;
  newValue: string | null;
  impact: string;
  impactScore: number;
  status: string;
  appliedAt: string | null;
  createdAt: string;
  listing: { id: string; title: string };
}

interface RecommendationsSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface UseRecommendationsReturn {
  recommendations: RecommendationDTO[];
  summary: RecommendationsSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  generate: () => Promise<{ totalCreated: number } | null>;
  applyRec: (recId: string) => Promise<boolean>;
  dismissRec: (recId: string) => Promise<boolean>;
}

export function useRecommendations(listingId?: string): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<RecommendationDTO[]>([]);
  const [summary, setSummary] = useState<RecommendationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = listingId
        ? `/api/avito/recommendations?listingId=${listingId}`
        : "/api/avito/recommendations";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
      const data = await res.json();
      setRecommendations(data.recommendations);
      setSummary(data.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const generate = async () => {
    try {
      const res = await fetch("/api/avito/recommendations", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка генерации");
      }
      const data = await res.json();
      await reload();
      return { totalCreated: data.totalCreated };
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  };

  const patchRec = async (recId: string, action: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/avito/recommendations/${recId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Ошибка");
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const applyRec = (recId: string) => patchRec(recId, "apply");
  const dismissRec = (recId: string) => patchRec(recId, "dismiss");

  return { recommendations, summary, loading, error, reload, generate, applyRec, dismissRec };
}
