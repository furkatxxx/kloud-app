"use client";

import { useState, useEffect, useCallback } from "react";
import type { AutoRuleDTO } from "@/lib/types";

interface UseAutoRulesReturn {
  rules: AutoRuleDTO[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createRule: (data: { name: string; condition: object; action: object; cooldownMin?: number }) => Promise<boolean>;
  toggleRule: (ruleId: string, enabled: boolean) => Promise<boolean>;
  deleteRule: (ruleId: string) => Promise<boolean>;
}

export function useAutoRules(): UseAutoRulesReturn {
  const [rules, setRules] = useState<AutoRuleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/avito/auto-rules");
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
      const data: AutoRuleDTO[] = await res.json();
      setRules(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createRule = async (data: {
    name: string;
    condition: object;
    action: object;
    cooldownMin?: number;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/avito/auto-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Ошибка создания");
      }
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/avito/auto-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Ошибка обновления");
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/avito/auto-rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  return { rules, loading, error, reload, createRule, toggleRule, deleteRule };
}
