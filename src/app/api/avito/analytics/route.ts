import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/analytics?days=30 — агрегированная статистика по всем объявлениям
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Все объявления (для списка и сводки)
  const listings = await prisma.listing.findMany({
    select: { id: true, title: true, price: true, status: true },
    orderBy: { title: "asc" },
  });

  // Статистика по дням (агрегация по всем объявлениям)
  const dailyStats = await prisma.dailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  });

  // Агрегация по датам (суммируем все объявления за каждый день)
  const byDate: Record<string, { views: number; contacts: number; favorites: number }> = {};
  for (const s of dailyStats) {
    const key = s.date.toISOString().slice(0, 10);
    if (!byDate[key]) {
      byDate[key] = { views: 0, contacts: 0, favorites: 0 };
    }
    byDate[key].views += s.views;
    byDate[key].contacts += s.contacts;
    byDate[key].favorites += s.favorites;
  }

  const daily = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date, ...totals }));

  // Агрегация по объявлениям (суммируем статистику каждого объявления за период)
  const byListing: Record<string, { views: number; contacts: number; favorites: number }> = {};
  for (const s of dailyStats) {
    if (!byListing[s.listingId]) {
      byListing[s.listingId] = { views: 0, contacts: 0, favorites: 0 };
    }
    byListing[s.listingId].views += s.views;
    byListing[s.listingId].contacts += s.contacts;
    byListing[s.listingId].favorites += s.favorites;
  }

  const perListing = listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    status: l.status,
    views: byListing[l.id]?.views || 0,
    contacts: byListing[l.id]?.contacts || 0,
    favorites: byListing[l.id]?.favorites || 0,
    ctr: byListing[l.id]?.views
      ? ((byListing[l.id].contacts / byListing[l.id].views) * 100)
      : 0,
  }));

  // Общие итоги
  const totals = daily.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      contacts: acc.contacts + d.contacts,
      favorites: acc.favorites + d.favorites,
    }),
    { views: 0, contacts: 0, favorites: 0 }
  );

  return NextResponse.json({
    totals,
    daily,
    perListing,
    period: days,
  });
}
