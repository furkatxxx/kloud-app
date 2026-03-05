"use client";

import { useState } from "react";

interface RecommendationItem {
  id: string;
  listingId: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string;
  field: string | null;
  impactScore: number;
  listing: { id: string; title: string };
}

interface RecommendationsSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface RecommendationsPanelProps {
  recommendations: RecommendationItem[];
  summary: RecommendationsSummary | null;
  onGenerate: () => Promise<unknown>;
  onApply: (recId: string) => Promise<boolean>;
  onDismiss: (recId: string) => Promise<boolean>;
}

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fef2f2", color: "var(--destructive)", label: "Критический" },
  high: { bg: "#fff7ed", color: "#ea580c", label: "Высокий" },
  medium: { bg: "#fefce8", color: "#ca8a04", label: "Средний" },
  low: { bg: "#f0fdf4", color: "var(--success)", label: "Низкий" },
};

export default function RecommendationsPanel({
  recommendations,
  summary,
  onGenerate,
  onApply,
  onDismiss,
}: RecommendationsPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerate();
    setGenerating(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/avito/recommendations/export");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Ошибка экспорта");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Берём имя файла из Content-Disposition или генерируем
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="(.+)"/);
      a.download = match?.[1] || `kloud-recommendations-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Рекомендации по оптимизации
          </h2>
          {summary && summary.total > 0 && (
            <div className="flex gap-2 mt-1">
              {summary.critical > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fef2f2", color: "var(--destructive)" }}>
                  {summary.critical} крит.
                </span>
              )}
              {summary.high > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
                  {summary.high} важн.
                </span>
              )}
              {summary.medium > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fefce8", color: "#ca8a04" }}>
                  {summary.medium} средн.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {recommendations.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50 border transition-all duration-150 active:scale-95"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {exporting ? "..." : "Экспорт"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50 transition-all duration-150 active:scale-95"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {generating ? "Анализ..." : "Анализировать"}
          </button>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Нет рекомендаций. Нажмите «Анализировать» для проверки объявлений.
        </p>
      ) : (
        <div className="space-y-2">
          {recommendations.slice(0, 10).map((rec) => {
            const style = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.low;

            return (
              <div
                key={rec.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)", borderLeft: `3px solid ${style.color}` }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: style.bg, color: style.color }}
                    >
                      {style.label}
                    </span>
                    <span className="text-sm font-medium">{rec.title}</span>
                  </div>
                  <span className="text-xs shrink-0 ml-2" style={{ color: "var(--muted-foreground)" }}>
                    +{rec.impactScore}
                  </span>
                </div>

                <a
                  href={`/listings/${rec.listingId}`}
                  className="text-xs hover:underline mb-1 block"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {rec.listing.title}
                </a>

                <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                  {rec.description}
                </p>

                <div
                  className="text-xs px-2 py-1.5 rounded mb-2"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  💡 {rec.suggestion}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => onApply(rec.id)}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: "#f0fdf4", color: "var(--success)" }}
                  >
                    ✓ Выполнено
                  </button>
                  <button
                    onClick={() => onDismiss(rec.id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Пропустить
                  </button>
                </div>
              </div>
            );
          })}

          {recommendations.length > 10 && (
            <p className="text-xs text-center py-2" style={{ color: "var(--muted-foreground)" }}>
              И ещё {recommendations.length - 10} рекомендаций...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
