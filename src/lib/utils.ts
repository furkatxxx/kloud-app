import type { ListingDTO, ListingStatus } from "@/lib/types";

// Определить статус объявления по количеству алертов и рекомендаций
export function getListingStatus(listing: ListingDTO): ListingStatus {
  if (listing._count.monitorAlerts > 0) return "critical";
  if (listing._count.recommendations > 0) return "warning";
  return "ok";
}

// Красивое форматирование даты последней синхронизации
export function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return "не синхронизировано";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Форматирование цены: 120000 → "120 000"
export function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU");
}
