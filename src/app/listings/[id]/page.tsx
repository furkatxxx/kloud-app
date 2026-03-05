"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QuickStat from "@/components/ui/QuickStat";
import SimpleChart from "@/components/ui/SimpleChart";
import ParamsTable from "@/components/ui/ParamsTable";
import ABTestPanel from "@/components/ui/ABTestPanel";
import { useListingStats } from "@/hooks/useListingStats";
import { useABTests } from "@/hooks/useABTests";
import { formatPrice } from "@/lib/utils";

// Тип детального объявления (с включёнными связями)
interface ListingDetail {
  id: string;
  avitoId: string;
  avitoUrl: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  category: string | null;
  params: string | null;
  photos: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshots: { id: string; reason: string | null; createdAt: string; title: string; price: number }[];
  recommendations: { id: string; title: string; severity: string; suggestion: string }[];
  monitorAlerts: { id: string; type: string; severity: string; message: string }[];
}

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editParams, setEditParams] = useState<[string, string][]>([]);
  const [saving, setSaving] = useState(false);
  const { stats } = useListingStats(id);
  const { tests: abTests, createTest, startTest, nextVariant, completeTest, deleteTest } = useABTests(id);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/avito/listings/${id}`);
        if (!res.ok) throw new Error("Объявление не найдено");
        const data = await res.json();
        setListing(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function startEdit() {
    if (!listing) return;
    setEditDesc(listing.description || "");
    let paramPairs: [string, string][] = [];
    try {
      if (listing.params) {
        paramPairs = Object.entries(JSON.parse(listing.params)).map(
          ([k, v]) => [k, String(v)] as [string, string]
        );
      }
    } catch { /* пустой массив */ }
    setEditParams(paramPairs);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!listing) return;
    setSaving(true);
    try {
      const paramsObj: Record<string, string> = {};
      for (const [key, value] of editParams) {
        if (key.trim()) paramsObj[key.trim()] = value;
      }

      const res = await fetch(`/api/avito/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc,
          params: JSON.stringify(paramsObj),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setListing({ ...listing, description: editDesc, params: JSON.stringify(paramsObj) });
        setEditing(false);
      } else {
        alert(data.error || "Ошибка сохранения");
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function addParam() {
    setEditParams([...editParams, ["", ""]]);
  }

  function removeParam(index: number) {
    setEditParams(editParams.filter((_, i) => i !== index));
  }

  function updateParam(index: number, field: 0 | 1, value: string) {
    const updated = [...editParams];
    updated[index] = [...updated[index]] as [string, string];
    updated[index][field] = value;
    setEditParams(updated);
  }

  if (loading) {
    return (
      <div className="animate-slide-up space-y-4">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-8 w-3/4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-52 rounded-xl" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="text-center p-12">
        <p className="text-lg font-medium mb-2">{error || "Объявление не найдено"}</p>
        <Link href="/listings" className="text-sm underline" style={{ color: "var(--primary)" }}>
          Назад к списку
        </Link>
      </div>
    );
  }

  // Парсинг фото
  let photos: string[] = [];
  try {
    if (listing.photos) photos = JSON.parse(listing.photos);
  } catch { /* пустой массив */ }

  // Данные для графика
  const chartData = (stats?.daily || []).map((s) => ({
    label: new Date(s.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    value: s.views,
  }));

  return (
    <div className="animate-slide-up">
      {/* Навигация */}
      <div className="mb-4">
        <Link
          href="/listings"
          className="text-sm hover:underline transition-colors duration-150"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Назад к объявлениям
        </Link>
      </div>

      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-semibold text-lg sm:text-xl" style={{ color: "var(--foreground)" }}>
              {formatPrice(listing.price)} ₽
            </span>
            <span className="hidden sm:inline">•</span>
            <span>{listing.quantity} шт.</span>
            <span className="hidden sm:inline">•</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: listing.status === "active" ? "#f0fdf4" : "#fef2f2",
                color: listing.status === "active" ? "var(--success)" : "var(--destructive)",
              }}
            >
              {listing.status}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!editing && (
            <button
              onClick={startEdit}
              className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 text-center transition-all duration-150 active:scale-95 w-full sm:w-auto border"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              ✏️ Редактировать
            </button>
          )}
          <a
            href={listing.avitoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 text-center transition-all duration-150 active:scale-95 w-full sm:w-auto"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Открыть на Авито ↗
          </a>
        </div>
      </div>

      {/* Быстрые метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <QuickStat label="Просмотры (30 дн)" value={stats?.totals.views ? String(stats.totals.views) : "—"} />
        <QuickStat label="Контакты (30 дн)" value={stats?.totals.contacts ? String(stats.totals.contacts) : "—"} />
        <QuickStat label="Избранное (30 дн)" value={stats?.totals.favorites ? String(stats.totals.favorites) : "—"} />
        <QuickStat
          label="CTR"
          value={
            stats?.totals.views && stats?.totals.contacts
              ? `${((stats.totals.contacts / stats.totals.views) * 100).toFixed(1)}%`
              : "—"
          }
        />
      </div>

      {/* График просмотров */}
      <div
        className="rounded-xl p-3 sm:p-4 border mb-8"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
          Просмотры за 30 дней
        </h2>
        <SimpleChart data={chartData} color="var(--primary)" height={200} />
      </div>

      {/* A/B тесты */}
      <div className="mb-8">
        <ABTestPanel
          listingId={id}
          tests={abTests}
          onCreateTest={(field, variants) => createTest(id, field, variants)}
          onStartTest={startTest}
          onNextVariant={nextVariant}
          onCompleteTest={completeTest}
          onDeleteTest={deleteTest}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Описание */}
        <div
          className="rounded-xl p-3 sm:p-4 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
            Описание
          </h2>
          {editing ? (
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={10}
              className="w-full p-3 rounded-lg border text-sm resize-y"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
              placeholder="Введите описание объявления..."
            />
          ) : (
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {listing.description || "Нет описания"}
            </p>
          )}
        </div>

        {/* Параметры */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
              Параметры
            </h2>
            {editing && (
              <button
                onClick={addParam}
                className="text-xs px-2 py-1 rounded border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--primary)" }}
              >
                + Добавить
              </button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              {editParams.map(([key, value], i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={key}
                    onChange={(e) => updateParam(i, 0, e.target.value)}
                    placeholder="Название"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
                  />
                  <input
                    value={value}
                    onChange={(e) => updateParam(i, 1, e.target.value)}
                    placeholder="Значение"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
                  />
                  <button
                    onClick={() => removeParam(i)}
                    className="text-xs px-2 py-2 rounded hover:bg-red-50 transition-colors"
                    style={{ color: "var(--destructive)" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {editParams.length === 0 && (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Нет параметров. Нажмите &quot;+ Добавить&quot;.
                </p>
              )}
            </div>
          ) : (
            <>
              <ParamsTable paramsJson={listing.params} />
              {!listing.params && (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Нет параметров
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Кнопки сохранения/отмены */}
      {editing && (
        <div className="flex gap-2 mt-6">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-95"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border active:scale-95"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Фотографии */}
      {photos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
            Фотографии ({photos.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Фото ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border transition-all duration-150 group-hover:opacity-80 group-hover:scale-[1.02]"
                  style={{ borderColor: "var(--border)" }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Алерты */}
      {listing.monitorAlerts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--destructive)" }}>
            Алерты ({listing.monitorAlerts.length})
          </h2>
          {listing.monitorAlerts.map((alert) => (
            <div
              key={alert.id}
              className="px-3 sm:px-4 py-3 rounded-lg mb-2 text-sm animate-fade-in"
              style={{ backgroundColor: "#fef2f2", color: "var(--destructive)" }}
            >
              <span className="font-medium">{alert.type}:</span> {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* История изменений */}
      {listing.snapshots.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
            История изменений ({listing.snapshots.length})
          </h2>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {listing.snapshots.map((snap) => (
              <div
                key={snap.id}
                className="px-3 sm:px-4 py-3 border-b last:border-b-0 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="font-medium">{snap.reason || "Изменение"}</span>
                  <span className="text-xs sm:text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(snap.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p style={{ color: "var(--muted-foreground)" }}>
                  {snap.title} — {formatPrice(snap.price)} ₽
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
