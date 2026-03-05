import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureAvitoEnv } from "@/lib/avito-env";
import { getItemsStats } from "@/lib/avito-api";

// GET /api/avito/stats?listingId=xxx&days=30 — статистика из локальной БД
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const days = parseInt(searchParams.get("days") || "30");

  if (!listingId) {
    return NextResponse.json({ error: "listingId обязателен" }, { status: 400 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const stats = await prisma.dailyStat.findMany({
    where: {
      listingId,
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  });

  const totals = stats.reduce(
    (acc, s) => ({
      views: acc.views + s.views,
      contacts: acc.contacts + s.contacts,
      favorites: acc.favorites + s.favorites,
    }),
    { views: 0, contacts: 0, favorites: 0 }
  );

  return NextResponse.json({ totals, daily: stats });
}

// POST /api/avito/stats — принудительно обновить статистику с Авито
export async function POST(request: Request) {
  const env = await ensureAvitoEnv();
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 400 });
  }

  const body = await request.json();
  const { listingIds } = body;

  if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds обязателен (массив)" }, { status: 400 });
  }

  // Найдём avitoId для каждого listingId
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
  });

  if (listings.length === 0) {
    return NextResponse.json({ error: "Объявления не найдены" }, { status: 404 });
  }

  const avitoIds = listings.map((l) => l.avitoId);

  try {
    const statsItems = await getItemsStats(avitoIds);
    let saved = 0;

    for (const item of statsItems) {
      const listing = listings.find((l) => l.avitoId === String(item.itemId));
      if (!listing || !item.stats?.length) continue;

      for (const dayStat of item.stats) {
        if (!dayStat.date) continue;
        const date = new Date(dayStat.date);
        date.setHours(0, 0, 0, 0);

        await prisma.dailyStat.upsert({
          where: {
            listingId_date_source: {
              listingId: listing.id,
              date,
              source: "total",
            },
          },
          update: {
            views: dayStat.uniqViews || 0,
            contacts: dayStat.uniqContacts || 0,
            favorites: dayStat.uniqFavorites || 0,
          },
          create: {
            listingId: listing.id,
            date,
            views: dayStat.uniqViews || 0,
            contacts: dayStat.uniqContacts || 0,
            favorites: dayStat.uniqFavorites || 0,
            source: "total",
          },
        });
        saved++;
      }
    }

    return NextResponse.json({ ok: true, saved });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
