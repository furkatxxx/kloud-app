"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import QuickStat from "@/components/ui/QuickStat";
import MultiLineChart from "@/components/ui/MultiLineChart";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatPrice } from "@/lib/utils";
import type { AnalyticsResponse } from "@/lib/types";

// Подготовка данных для экспорта (общая для CSV и Excel)
function buildExportData(data: AnalyticsResponse) {
  const dailyRows = data.daily.map((d) => ({
    "Дата": new Date(d.date).toLocaleDateString("ru-RU"),
    "Просмотры": d.views,
    "Контакты": d.contacts,
    "Избранное": d.favorites,
  }));

  const listingRows = data.perListing.map((l) => ({
    "Объявление": l.title,
    "Цена": l.price,
    "Просмотры": l.views,
    "Контакты": l.contacts,
    "Избранное": l.favorites,
    "CTR %": Number(l.ctr.toFixed(1)),
  }));

  return { dailyRows, listingRows };
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToCSV(data: AnalyticsResponse, period: number) {
  const BOM = "\uFEFF";
  const { dailyRows, listingRows } = buildExportData(data);
  const lines: string[] = [];

  // Дневная статистика
  lines.push(Object.keys(dailyRows[0] || {}).join(";"));
  for (const row of dailyRows) lines.push(Object.values(row).join(";"));

  lines.push("");

  // По объявлениям
  lines.push(Object.keys(listingRows[0] || {}).join(";"));
  for (const row of listingRows) {
    lines.push(Object.values(row).map((v) => String(v).replace(/;/g, ",")).join(";"));
  }

  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadFile(blob, `kloud-analytics-${period}d-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportToExcel(data: AnalyticsResponse, period: number) {
  const { dailyRows, listingRows } = buildExportData(data);

  const wb = XLSX.utils.book_new();

  // Лист 1: дневная статистика
  const ws1 = XLSX.utils.json_to_sheet(dailyRows);
  ws1["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "По дням");

  // Лист 2: по объявлениям
  const ws2 = XLSX.utils.json_to_sheet(listingRows);
  ws2["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, "По объявлениям");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadFile(blob, `kloud-analytics-${period}d-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type Period = 7 | 14 | 30;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const { data, loading, error } = useAnalytics(period);

  // Все хуки ДО ранних return (правила React)
  const chartLabels = useMemo(() =>
    data?.daily.map((d) =>
      new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    ) ?? [], [data?.daily]);

  const chartSeries = useMemo(() => data ? [
    { label: "Просмотры", color: "#3b82f6", data: data.daily.map((d) => d.views) },
    { label: "Контакты", color: "#10b981", data: data.daily.map((d) => d.contacts) },
    { label: "Избранное", color: "#f59e0b", data: data.daily.map((d) => d.favorites) },
  ] : [], [data?.daily]);

  const overallCtr = useMemo(() =>
    data && data.totals.views > 0
      ? ((data.totals.contacts / data.totals.views) * 100).toFixed(1)
      : "0",
  [data?.totals]);

  const sortedListings = useMemo(() =>
    data ? [...data.perListing].sort((a, b) => b.views - a.views) : [],
  [data?.perListing]);

  if (loading) {
    return (
      <div className="animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Аналитика</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-xl mb-8" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Аналитика</h1>
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", color: "var(--destructive)" }}>
          Ошибка: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-slide-up">
      {/* Заголовок + выбор периода */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Аналитика</h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Сводная статистика по всем объявлениям
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([7, 14, 30] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: period === p ? "var(--primary)" : "var(--muted)",
                  color: period === p ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                {p} дн.
              </button>
            ))}
          </div>
          <div className="flex gap-1 border rounded-lg overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => data && exportToCSV(data, period)}
              disabled={!data}
              className="px-2.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40"
              style={{ color: "var(--foreground)" }}
              title="Скачать CSV"
            >
              CSV
            </button>
            <div className="w-px" style={{ backgroundColor: "var(--border)" }} />
            <button
              onClick={() => data && exportToExcel(data, period)}
              disabled={!data}
              className="px-2.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40"
              style={{ color: "var(--foreground)" }}
              title="Скачать Excel (.xlsx)"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Сводные метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <QuickStat label="Просмотры" value={data.totals.views.toLocaleString("ru-RU")} />
        <QuickStat label="Контакты" value={data.totals.contacts.toLocaleString("ru-RU")} />
        <QuickStat label="Избранное" value={data.totals.favorites.toLocaleString("ru-RU")} />
        <QuickStat label="CTR" value={`${overallCtr}%`} />
      </div>

      {/* График */}
      <div
        className="rounded-xl p-3 sm:p-4 border mb-8"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
          Динамика за {period} дней
        </h2>
        <MultiLineChart labels={chartLabels} series={chartSeries} height={280} />
      </div>

      {/* Таблица по объявлениям */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Статистика по объявлениям
          </h2>
        </div>

        {sortedListings.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            Нет данных. Синхронизируйте объявления на дашборде.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Объявление
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Цена
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Просмотры
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Контакты
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Избранное
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    CTR
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b last:border-b-0 transition-colors duration-150"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`/listings/${l.id}`}
                        className="hover:underline font-medium transition-colors duration-150"
                        style={{ color: "var(--foreground)" }}
                      >
                        {l.title}
                      </a>
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: l.status === "active" ? "#f0fdf4" : "#fef2f2",
                          color: l.status === "active" ? "var(--success)" : "var(--destructive)",
                        }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatPrice(l.price)} ₽</td>
                    <td className="px-4 py-3 text-right font-medium">{l.views.toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3 text-right">{l.contacts.toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3 text-right">{l.favorites.toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3 text-right font-medium">{l.ctr.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
