import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/vas — получить VAS настройки и историю по всем объявлениям
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");

  // VAS настройки
  const settingsWhere = listingId ? { listingId } : {};
  const vasSettings = await prisma.vASSettings.findMany({
    where: settingsWhere,
    include: {
      listing: { select: { id: true, title: true, price: true, status: true } },
    },
  });

  // Последние VAS действия
  const actionsWhere = listingId ? { listingId } : {};
  const vasActions = await prisma.vASAction.findMany({
    where: actionsWhere,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      listing: { select: { id: true, title: true } },
    },
  });

  // Все объявления (для тех, у кого ещё нет VAS настроек)
  const listings = await prisma.listing.findMany({
    select: { id: true, title: true, price: true, status: true },
    orderBy: { title: "asc" },
  });

  // Общий расход (сумма cost за все VASAction)
  const totalSpent = vasActions.reduce((sum, a) => sum + (a.cost || 0), 0);

  return NextResponse.json({
    settings: vasSettings,
    history: vasActions,
    listings,
    totalSpent,
  });
}

// POST /api/avito/vas — обновить VAS настройки для объявления
export async function POST(request: Request) {
  const body = await request.json();
  const { listingId, bidEnabled, bidAmount, bidDailyLimit, xlEnabled } = body;

  if (!listingId) {
    return NextResponse.json({ error: "listingId обязателен" }, { status: 400 });
  }

  // Проверяем объявление
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  // Upsert VAS настроек
  const vasSettings = await prisma.vASSettings.upsert({
    where: { listingId },
    update: {
      bidEnabled: bidEnabled ?? false,
      bidAmount: bidAmount ?? null,
      bidDailyLimit: bidDailyLimit ?? null,
      xlEnabled: xlEnabled ?? false,
    },
    create: {
      listingId,
      bidEnabled: bidEnabled ?? false,
      bidAmount: bidAmount ?? null,
      bidDailyLimit: bidDailyLimit ?? null,
      xlEnabled: xlEnabled ?? false,
    },
  });

  // Логируем действие
  const details: string[] = [];
  if (bidEnabled) details.push(`ставка ${bidAmount || 0} руб.`);
  if (xlEnabled) details.push("XL включён");

  if (details.length > 0) {
    await prisma.vASAction.create({
      data: {
        listingId,
        action: "update_settings",
        details: details.join(", "),
        trigger: "manual",
      },
    });
  }

  return NextResponse.json(vasSettings);
}
