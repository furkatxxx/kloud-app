import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendDailyReport } from "@/lib/telegram";

// POST /api/avito/report — сгенерировать и отправить отчёт в Telegram
export async function POST() {
  try {
    // 1. Дата: вчера (за сегодня данные неполные)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 2. Все объявления
    const listings = await prisma.listing.findMany({
      select: { id: true, title: true },
    });

    // 3. Статистика за вчера
    const stats = await prisma.dailyStat.findMany({
      where: {
        date: { gte: yesterday, lt: today },
      },
    });

    // Маппинг статистики по listing
    const statsMap = new Map<string, { views: number; contacts: number; favorites: number }>();
    for (const s of stats) {
      const existing = statsMap.get(s.listingId) || { views: 0, contacts: 0, favorites: 0 };
      existing.views += s.views;
      existing.contacts += s.contacts;
      existing.favorites += s.favorites;
      statsMap.set(s.listingId, existing);
    }

    // 4. Данные по каждому объявлению
    const listingData = listings.map((l) => {
      const s = statsMap.get(l.id) || { views: 0, contacts: 0, favorites: 0 };
      return { title: l.title, views: s.views, contacts: s.contacts, favorites: s.favorites };
    });

    // 5. Итоги
    const totals = listingData.reduce(
      (acc, l) => ({
        views: acc.views + l.views,
        contacts: acc.contacts + l.contacts,
        favorites: acc.favorites + l.favorites,
      }),
      { views: 0, contacts: 0, favorites: 0 }
    );

    // 6. Нерешённые алерты
    const alerts = await prisma.monitorAlert.findMany({
      where: { resolved: false },
      select: { severity: true, message: true },
    });

    // 7. Дата для заголовка
    const dateStr = yesterday.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // 8. Отправляем
    const result = await sendDailyReport({
      listings: listingData,
      totals,
      alerts,
      date: dateStr,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      date: dateStr,
      listings: listingData.length,
      alerts: alerts.length,
    });
  } catch (e) {
    console.error("[report] Ошибка:", (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
