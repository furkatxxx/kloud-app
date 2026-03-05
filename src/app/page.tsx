"use client";

import { useState } from "react";
import StatusCard from "@/components/dashboard/StatusCard";
import QuickStat from "@/components/ui/QuickStat";
import SyncNotification from "@/components/ui/SyncNotification";
import RecommendationsPanel from "@/components/ui/RecommendationsPanel";
import { useListings } from "@/hooks/useListings";
import { useSync } from "@/hooks/useSync";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useToast } from "@/components/ui/Toast";
import { getListingStatus } from "@/lib/utils";

export default function DashboardPage() {
  const { listings, loading, reload } = useListings();
  const { syncing, result, error, sync } = useSync();
  const { recommendations, summary, generate, applyRec, dismissRec } = useRecommendations();
  const { data: weekStats, reload: reloadStats } = useAnalytics(7);
  const { toast } = useToast();
  const [sendingReport, setSendingReport] = useState(false);

  // Маппинг статистики по ID объявления
  const statsMap = new Map(
    weekStats?.perListing?.map((s) => [s.id, s]) || []
  );

  async function handleSync() {
    const syncResult = await sync();
    reload();
    reloadStats();
    if (syncResult) {
      toast(`Синхронизировано: ${syncResult.synced} объявлений`, "success");
    } else {
      toast("Ошибка синхронизации", "error");
    }
  }

  async function handleReport() {
    setSendingReport(true);
    try {
      const res = await fetch("/api/avito/report", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast(`Отчёт отправлен в Telegram (${data.listings} объявлений)`, "success");
      } else {
        toast(data.error || "Ошибка отправки", "error");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSendingReport(false);
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Дашборд</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Состояние всех объявлений
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleReport}
            disabled={sendingReport}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-95 w-full sm:w-auto border"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {sendingReport ? "Отправка..." : "📊 Отчёт в Telegram"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-95 w-full sm:w-auto"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </button>
        </div>
      </div>

      <SyncNotification result={result} error={error} />

      {/* Быстрая сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <QuickStat label="Объявления" value={listings.length ? String(listings.length) : "0"} />
        <QuickStat label="Просмотры / 7 дней" value={weekStats ? String(weekStats.totals.views) : "–"} />
        <QuickStat label="Контакты / 7 дней" value={weekStats ? String(weekStats.totals.contacts) : "–"} />
        <QuickStat label="В избранном / 7 дней" value={weekStats ? String(weekStats.totals.favorites) : "–"} />
      </div>

      {/* Рекомендации */}
      <div className="mb-8">
        <RecommendationsPanel
          recommendations={recommendations}
          summary={summary}
          onGenerate={generate}
          onApply={applyRec}
          onDismiss={dismissRec}
        />
      </div>

      {/* Карточки объявлений */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div
          className="text-center p-8 sm:p-12 rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-lg font-medium mb-2">Нет объявлений</p>
          <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
            Настройте API ключи и нажмите &quot;Синхронизировать&quot; — объявления загрузятся автоматически
          </p>
          <a
            href="/settings"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Открыть настройки
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const stat = statsMap.get(listing.id);
            return (
              <StatusCard
                key={listing.id}
                title={listing.title}
                subtitle={`${listing.quantity} шт.`}
                status={getListingStatus(listing)}
                price={listing.price}
                views={stat?.views}
                contacts={stat?.contacts}
                href={`/listings/${listing.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
