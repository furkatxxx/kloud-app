"use client";

import { useState } from "react";
import type { AutoRuleDTO } from "@/lib/types";

// Предустановленные шаблоны правил
const RULE_TEMPLATES = [
  {
    name: "Снизить цену при низких просмотрах",
    condition: { metric: "views", operator: "less_than", value: 10, period_days: 3 },
    action: { type: "reduce_price", percent: 5 },
    cooldownMin: 4320, // 3 дня
  },
  {
    name: "Уведомить при отсутствии контактов",
    condition: { metric: "contacts", operator: "equals", value: 0, period_days: 7 },
    action: { type: "notify", channel: "telegram" },
    cooldownMin: 10080, // 7 дней
  },
  {
    name: "Поднять при падении позиции",
    condition: { metric: "position", operator: "greater_than", value: 50, period_days: 1 },
    action: { type: "apply_vas", vas: "xl" },
    cooldownMin: 1440, // 1 день
  },
];

interface AutoRulesPanelProps {
  rules: AutoRuleDTO[];
  onCreateRule: (data: { name: string; condition: object; action: object; cooldownMin?: number }) => Promise<boolean>;
  onToggleRule: (ruleId: string, enabled: boolean) => Promise<boolean>;
  onDeleteRule: (ruleId: string) => Promise<boolean>;
}

function formatCondition(condJson: string): string {
  try {
    const c = JSON.parse(condJson);
    const ops: Record<string, string> = {
      less_than: "<",
      greater_than: ">",
      equals: "=",
      not_equals: "≠",
    };
    return `${c.metric} ${ops[c.operator] || c.operator} ${c.value} (за ${c.period_days} дн.)`;
  } catch {
    return condJson;
  }
}

function formatAction(actJson: string): string {
  try {
    const a = JSON.parse(actJson);
    switch (a.type) {
      case "reduce_price": return `Снизить цену на ${a.percent}%`;
      case "increase_price": return `Повысить цену на ${a.percent}%`;
      case "notify": return `Уведомить в ${a.channel || "telegram"}`;
      case "apply_vas": return `Применить ${a.vas || "продвижение"}`;
      default: return a.type;
    }
  } catch {
    return actJson;
  }
}

function formatCooldown(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} ч`;
  return `${Math.round(minutes / 1440)} дн`;
}

export default function AutoRulesPanel({
  rules,
  onCreateRule,
  onToggleRule,
  onDeleteRule,
}: AutoRulesPanelProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateFromTemplate = async (tpl: typeof RULE_TEMPLATES[0]) => {
    setCreating(true);
    await onCreateRule({
      name: tpl.name,
      condition: tpl.condition,
      action: tpl.action,
      cooldownMin: tpl.cooldownMin,
    });
    setCreating(false);
    setShowTemplates(false);
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Автоправила
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Автоматические действия при изменении метрик
          </p>
        </div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-3 py-1 rounded-lg text-xs font-medium"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          + Добавить правило
        </button>
      </div>

      {/* Шаблоны */}
      {showTemplates && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Выберите шаблон:
          </p>
          {RULE_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleCreateFromTemplate(tpl)}
              disabled={creating}
              className="w-full text-left px-3 py-2.5 rounded-lg border text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="font-medium">{tpl.name}</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Если {formatCondition(JSON.stringify(tpl.condition))} → {formatAction(JSON.stringify(tpl.action))}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowTemplates(false)}
            className="text-xs px-2 py-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Список правил */}
      {rules.length === 0 && !showTemplates ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Нет правил. Добавьте первое автоправило для автоматизации управления объявлениями.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between px-3 py-3 rounded-lg border"
              style={{
                borderColor: "var(--border)",
                opacity: rule.enabled ? 1 : 0.5,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{rule.name}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs shrink-0"
                    style={{
                      backgroundColor: rule.enabled ? "#f0fdf4" : "var(--muted)",
                      color: rule.enabled ? "var(--success)" : "var(--muted-foreground)",
                    }}
                  >
                    {rule.enabled ? "Вкл" : "Выкл"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Если {formatCondition(rule.condition)} → {formatAction(rule.action)}
                  {" · "}Кулдаун: {formatCooldown(rule.cooldownMin)}
                  {rule.lastFiredAt && (
                    <>
                      {" · "}Сработало: {new Date(rule.lastFiredAt).toLocaleDateString("ru-RU")}
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-1 ml-3 shrink-0">
                <button
                  onClick={() => onToggleRule(rule.id, !rule.enabled)}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: rule.enabled ? "var(--muted)" : "#f0fdf4",
                    color: rule.enabled ? "var(--muted-foreground)" : "var(--success)",
                  }}
                >
                  {rule.enabled ? "Выкл" : "Вкл"}
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="px-2 py-1 rounded text-xs"
                  style={{ color: "var(--destructive)" }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
