"use client";

import { useState, useEffect, useCallback } from "react";
import type { ABTestDTO } from "@/lib/types";

interface UseABTestsReturn {
  tests: ABTestDTO[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createTest: (listingId: string, field: string, variants: { label: string; value: string }[]) => Promise<ABTestDTO | null>;
  startTest: (testId: string) => Promise<boolean>;
  nextVariant: (testId: string) => Promise<boolean>;
  completeTest: (testId: string) => Promise<boolean>;
  deleteTest: (testId: string) => Promise<boolean>;
}

export function useABTests(listingId?: string): UseABTestsReturn {
  const [tests, setTests] = useState<ABTestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = listingId
        ? `/api/avito/ab-tests?listingId=${listingId}`
        : "/api/avito/ab-tests";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
      const data: ABTestDTO[] = await res.json();
      setTests(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTest = async (
    lid: string,
    field: string,
    variants: { label: string; value: string }[]
  ): Promise<ABTestDTO | null> => {
    try {
      const res = await fetch("/api/avito/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: lid, field, variants }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания теста");
      }
      const test: ABTestDTO = await res.json();
      await reload();
      return test;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  };

  const patchTest = async (testId: string, action: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/avito/ab-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка");
      }
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const startTest = (testId: string) => patchTest(testId, "start");
  const nextVariant = (testId: string) => patchTest(testId, "next");
  const completeTest = (testId: string) => patchTest(testId, "complete");

  const deleteTest = async (testId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/avito/ab-tests/${testId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  return { tests, loading, error, reload, createTest, startTest, nextVariant, completeTest, deleteTest };
}
