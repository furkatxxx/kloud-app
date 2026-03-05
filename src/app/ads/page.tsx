"use client";

import { useState } from "react";
import QuickStat from "@/components/ui/QuickStat";
import { useVAS } from "@/hooks/useVAS";
import { formatPrice } from "@/lib/utils";

export default function AdsPage() {
  const { data, loading, error, updateSettings } = useVAS();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidLimit, setBidLimit] = useState("");

  if (loading) {
    return (
      <div className="animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Реклама</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Реклама</h1>
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", color: "var(--destructive)" }}>
          Ошибка: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Маппинг VAS настроек по listingId
  const settingsMap = new Map(data.settings.map((s) => [s.listingId, s]));

  // Подсчёт активных ставок
  const activeBids = data.settings.filter((s) => s.bidEnabled).length;
  const activeXL = data.settings.filter((s) => s.xlEnabled).length;

  const handleSave = async (listingId: string, bidEnabled: boolean, xlEnabled: boolean) => {
    await updateSettings(listingId, {
      bidEnabled,
      bidAmount: bidAmount ? parseInt(bidAmount) : undefined,
      bidDailyLimit: bidLimit ? parseInt(bidLimit) : undefined,
      xlEnabled,
    });
    setEditingId(null);
    setBidAmount("");
    setBidLimit("");
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Реклама</h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Управление платным продвижением объявлений
        </p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <QuickStat label="Активных ставок" value={String(activeBids)} />
        <QuickStat label="XL активен" value={String(activeXL)} />
        <QuickStat label="Объявлений" value={String(data.listings.length)} />
        <QuickStat label="Расход" value={`${formatPrice(data.totalSpent)} ₽`} />
      </div>

      {/* Таблица объявлений с VAS */}
      <div
        className="rounded-xl border overflow-hidden mb-8"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Настройки продвижения
          </h2>
        </div>

        {data.listings.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            Нет объявлений. Синхронизируйте на дашборде.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {data.listings.map((listing) => {
              const vas = settingsMap.get(listing.id);
              const isEditing = editingId === listing.id;

              return (
                <div key={listing.id} className="px-3 sm:px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/listings/${listing.id}`}
                        className="text-sm font-medium hover:underline truncate block transition-colors duration-150"
                      >
                        {listing.title}
                      </a>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        <span>{formatPrice(listing.price)} ₽</span>
                        {vas?.bidEnabled && (
                          <span style={{ color: "var(--success)" }}>
                            Ставка: {vas.bidAmount || 0} ₽
                            {vas.bidDailyLimit ? ` (лимит ${vas.bidDailyLimit} ₽/день)` : ""}
                          </span>
                        )}
                        {vas?.xlEnabled && (
                          <span style={{ color: "#3b82f6" }}>XL ✓</span>
                        )}
                        {!vas?.bidEnabled && !vas?.xlEnabled && (
                          <span>Продвижение не настроено</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingId(null);
                        } else {
                          setEditingId(listing.id);
                          setBidAmount(vas?.bidAmount?.toString() || "");
                          setBidLimit(vas?.bidDailyLimit?.toString() || "");
                        }
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-medium ml-3 shrink-0 transition-all duration-150 active:scale-95"
                      style={{
                        backgroundColor: isEditing ? "var(--muted)" : "var(--primary)",
                        color: isEditing ? "var(--muted-foreground)" : "var(--primary-foreground)",
                      }}
                    >
                      {isEditing ? "Отмена" : "Настроить"}
                    </button>
                  </div>

                  {/* Форма редактирования */}
                  {isEditing && (
                    <div
                      className="mt-3 p-3 rounded-lg border animate-fade-in"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
                            Сумма ставки (₽)
                          </label>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--foreground)" }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted-foreground)" }}>
                            Дневной лимит (₽)
                          </label>
                          <input
                            type="number"
                            value={bidLimit}
                            onChange={(e) => setBidLimit(e.target.value)}
                            placeholder="Без лимита"
                            className="w-full px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--foreground)" }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSave(listing.id, true, vas?.xlEnabled || false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                          style={{ backgroundColor: "var(--success)", color: "white" }}
                        >
                          Включить ставку
                        </button>
                        <button
                          onClick={() => handleSave(listing.id, vas?.bidEnabled || false, true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                          style={{ backgroundColor: "#3b82f6", color: "white" }}
                        >
                          Включить XL
                        </button>
                        <button
                          onClick={() => handleSave(listing.id, false, false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                        >
                          Отключить всё
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* История действий */}
      {data.history.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
              История действий
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {data.history.slice(0, 20).map((action) => (
              <div key={action.id} className="px-3 sm:px-4 py-2.5 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="min-w-0">
                    <span className="font-medium">{action.listing.title}</span>
                    <span className="mx-2 hidden sm:inline" style={{ color: "var(--muted-foreground)" }}>·</span>
                    <span className="block sm:inline text-xs sm:text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {action.action}
                      {action.details && ` · ${action.details}`}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(action.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
