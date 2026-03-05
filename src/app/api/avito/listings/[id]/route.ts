import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/listings/[id] — детальные данные одного объявления
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      stats: {
        orderBy: { date: "desc" },
        take: 30,
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      recommendations: {
        where: { status: "pending" },
        orderBy: { impactScore: "desc" },
      },
      monitorAlerts: {
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  return NextResponse.json(listing);
}

// PATCH /api/avito/listings/[id] — обновить описание и/или параметры вручную
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Белый список: только description и params
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: "description должен быть строкой" }, { status: 400 });
    }
    updateData.description = body.description;
  }

  if (body.params !== undefined) {
    if (typeof body.params !== "string") {
      return NextResponse.json({ error: "params должен быть JSON-строкой" }, { status: 400 });
    }
    try {
      JSON.parse(body.params);
    } catch {
      return NextResponse.json({ error: "params не является валидным JSON" }, { status: 400 });
    }
    updateData.params = body.params;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  // Snapshot перед изменением (для истории)
  const reasons: string[] = [];
  if (updateData.description !== undefined) reasons.push("описание");
  if (updateData.params !== undefined) reasons.push("параметры");

  await prisma.snapshot.create({
    data: {
      listingId: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      quantity: listing.quantity,
      params: listing.params,
      photos: listing.photos,
      reason: `Ручное редактирование: ${reasons.join(", ")}`,
    },
  });

  const updated = await prisma.listing.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, listing: updated });
}
