"use client";

import { useState } from "react";
import type { ABTestDTO } from "@/lib/types";

interface ABTestPanelProps {
  listingId: string;
  tests: ABTestDTO[];
  onCreateTest: (field: string, variants: { label: string; value: string }[]) => Promise<unknown>;
  onStartTest: (testId: string) => Promise<boolean>;
  onNextVariant: (testId: string) => Promise<boolean>;
  onCompleteTest: (testId: string) => Promise<boolean>;
  onDeleteTest: (testId: string) => Promise<boolean>;
}

// Поля для тестирования
const FIELDS = [
  { value: "title", label: "Заголовок" },
  { value: "price", label: "Цена" },
  { value: "description", label: "Описание" },
];

function getStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "Черновик";
    case "active": return "Активен";
    case "completed": return "Завершён";
    default: return status;
  }
}

function getStatusColor(status: string): { bg: string; color: string } {
  switch (status) {
    case "draft": return { bg: "var(--muted)", color: "var(--muted-foreground)" };
    case "active": return { bg: "#f0fdf4", color: "var(--success)" };
    case "completed": return { bg: "#eff6ff", color: "#3b82f6" };
    default: return { bg: "var(--muted)", color: "var(--muted-foreground)" };
  }
}

export default function ABTestPanel({
  tests,
  onCreateTest,
  onStartTest,
  onNextVariant,
  onCompleteTest,
  onDeleteTest,
}: ABTestPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [field, setField] = useState("title");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!variantA.trim() || !variantB.trim()) return;
    setSaving(true);
    await onCreateTest(field, [
      { label: "A", value: variantA.trim() },
      { label: "B", value: variantB.trim() },
    ]);
    setVariantA("");
    setVariantB("");
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          A/B тесты
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1 rounded-lg text-xs font-medium"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + Новый тест
          </button>
        )}
      </div>

      {/* Форма создания */}
      {showForm && (
        <div
          className="rounded-lg p-3 mb-4 border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
        >
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
              Поле для тестирования
            </label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
                Вариант A
              </label>
              <input
                type="text"
                value={variantA}
                onChange={(e) => setVariantA(e.target.value)}
                placeholder="Текущее значение"
                className="w-full px-3 py-1.5 rounded-lg text-sm border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
                Вариант B
              </label>
              <input
                type="text"
                value={variantB}
                onChange={(e) => setVariantB(e.target.value)}
                placeholder="Новый вариант"
                className="w-full px-3 py-1.5 rounded-lg text-sm border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !variantA.trim() || !variantB.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {saving ? "Создаю..." : "Создать тест"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список тестов */}
      {tests.length === 0 && !showForm ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Нет тестов. Создайте первый A/B тест для оптимизации объявления.
        </p>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const statusStyle = getStatusColor(test.status);
            const winner = test.status === "completed"
              ? [...test.variants].sort((a, b) => b.contacts - a.contacts)[0]
              : null;

            return (
              <div
                key={test.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {FIELDS.find((f) => f.value === test.field)?.label || test.field}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {getStatusLabel(test.status)}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    {test.status === "draft" && (
                      <button
                        onClick={() => onStartTest(test.id)}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: "#f0fdf4", color: "var(--success)" }}
                      >
                        Запустить
                      </button>
                    )}
                    {test.status === "active" && (
                      <>
                        <button
                          onClick={() => onNextVariant(test.id)}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: "#eff6ff", color: "#3b82f6" }}
                        >
                          Следующий вариант
                        </button>
                        <button
                          onClick={() => onCompleteTest(test.id)}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                        >
                          Завершить
                        </button>
                      </>
                    )}
                    {test.status !== "active" && (
                      <button
                        onClick={() => onDeleteTest(test.id)}
                        className="px-2 py-1 rounded text-xs"
                        style={{ color: "var(--destructive)" }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>

                {/* Варианты */}
                <div className="space-y-1.5">
                  {test.variants.map((v, i) => {
                    const isActive = test.status === "active" && i === test.currentVariant;
                    const isWinner = winner?.id === v.id;

                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-3 py-2 rounded text-sm"
                        style={{
                          backgroundColor: isActive ? "#f0fdf4" : isWinner ? "#eff6ff" : "var(--muted)",
                          borderLeft: isActive ? "3px solid var(--success)" : isWinner ? "3px solid #3b82f6" : "3px solid transparent",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card)" }}>
                            {v.label}
                          </span>
                          <span className="truncate max-w-[200px]">{v.value}</span>
                          {isActive && (
                            <span className="text-xs" style={{ color: "var(--success)" }}>● активен</span>
                          )}
                          {isWinner && (
                            <span className="text-xs font-medium" style={{ color: "#3b82f6" }}>★ победитель</span>
                          )}
                        </div>
                        <div className="flex gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                          <span>👁 {v.views}</span>
                          <span>📞 {v.contacts}</span>
                          <span>⭐ {v.favorites}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
