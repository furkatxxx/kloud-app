"use client";

import StatusCard from "@/components/dashboard/StatusCard";
import SyncNotification from "@/components/ui/SyncNotification";
import { useListings } from "@/hooks/useListings";
import { useSync } from "@/hooks/useSync";
import { getListingStatus, formatLastSync } from "@/lib/utils";

export default function ListingsPage() {
  const { listings, total, page, totalPages, loading, reload, setPage } = useListings();
  const { syncing, result, error, sync } = useSync();

  async function handleSync() {
    await sync();
    reload();
  }

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Объявления</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {total} шт.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-95 w-full sm:w-auto"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {syncing ? "Синхронизация..." : "Синхронизировать с Авито"}
        </button>
      </div>

      <SyncNotification result={result} error={error} />

      {/* Список */}
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
            Нажмите &quot;Синхронизировать с Авито&quot; — инструмент автоматически найдёт все ваши активные объявления
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-150 active:scale-95"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <StatusCard
              key={listing.id}
              title={listing.title}
              subtitle={`${listing.quantity} шт. | Синхр: ${formatLastSync(listing.lastSyncAt)}`}
              status={getListingStatus(listing)}
              price={listing.price}
              href={`/listings/${listing.id}`}
            />
          ))}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            Назад
          </button>
          <span className="text-sm px-3" style={{ color: "var(--muted-foreground)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
          Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
