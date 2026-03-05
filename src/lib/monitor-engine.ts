// Движок мониторинга — проверяет объявления и создаёт алерты
// Запускается по расписанию или вручную

import { prisma } from "@/lib/db";

export interface MonitorAlertItem {
  listingId: string | null;
  type: string;
  severity: string;
  message: string;
}

// Главная функция — полная проверка всех объявлений
export async function runMonitorCheck(): Promise<MonitorAlertItem[]> {
  const alerts: MonitorAlertItem[] = [];

  const listings = await prisma.listing.findMany({
    include: {
      stats: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
  });

  for (const listing of listings) {
    // 1. Объявление скрыто или архивировано
    if (listing.status === "hidden") {
      alerts.push({
        listingId: listing.id,
        type: "listing_hidden",
        severity: "high",
        message: `Объявление "${listing.title}" скрыто. Возможно заблокировано модерацией.`,
      });
    }

    // 2. Нет просмотров за 3 дня
    const recentStats = listing.stats.slice(0, 3);
    const totalViews = recentStats.reduce((s, d) => s + d.views, 0);
    if (recentStats.length >= 3 && totalViews === 0) {
      alerts.push({
        listingId: listing.id,
        type: "no_views",
        severity: "critical",
        message: `"${listing.title}" — 0 просмотров за 3 дня. Проверьте статус объявления.`,
      });
    }

    // 3. Резкое падение просмотров (текущий день < 30% от среднего)
    if (listing.stats.length >= 5) {
      const avgViews = listing.stats.slice(1, 5).reduce((s, d) => s + d.views, 0) / 4;
      const latestViews = listing.stats[0]?.views || 0;
      if (avgViews > 10 && latestViews < avgViews * 0.3) {
        alerts.push({
          listingId: listing.id,
          type: "views_drop",
          severity: "high",
          message: `"${listing.title}" — резкое падение просмотров: ${latestViews} (среднее ${Math.round(avgViews)}).`,
        });
      }
    }

    // 4. Давно не синхронизировалось (больше 24 часов)
    if (listing.lastSyncAt) {
      const hoursSinceSync = (Date.now() - new Date(listing.lastSyncAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 24) {
        alerts.push({
          listingId: listing.id,
          type: "stale_data",
          severity: "low",
          message: `"${listing.title}" — данные устарели (${Math.round(hoursSinceSync)} ч. назад). Синхронизируйте.`,
        });
      }
    }

    // 5. Цена = 0
    if (listing.price === 0) {
      alerts.push({
        listingId: listing.id,
        type: "price_zero",
        severity: "critical",
        message: `"${listing.title}" — цена не указана (0 ₽). Это снижает доверие и может быть заблокировано.`,
      });
    }
  }

  return alerts;
}

// Сохраняет алерты в БД (не дублируя нерешённые)
export async function saveAlerts(alerts: MonitorAlertItem[]): Promise<number> {
  let created = 0;

  for (const alert of alerts) {
    // Проверяем нет ли уже такого нерешённого алерта
    const existing = await prisma.monitorAlert.findFirst({
      where: {
        listingId: alert.listingId,
        type: alert.type,
        resolved: false,
      },
    });

    if (!existing) {
      await prisma.monitorAlert.create({
        data: {
          listingId: alert.listingId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        },
      });
      created++;
    }
  }

  return created;
}
