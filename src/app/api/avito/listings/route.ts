import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/listings — получить объявления из локальной БД (с пагинацией)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const status = searchParams.get("status") || undefined;

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            recommendations: { where: { status: "pending" } },
            monitorAlerts: { where: { resolved: false } },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

// POST /api/avito/listings — добавить объявление вручную (по URL)
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.avitoId || !body.avitoUrl || !body.title) {
    return NextResponse.json(
      { error: "avitoId, avitoUrl и title обязательны" },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.upsert({
    where: { avitoId: String(body.avitoId) },
    update: {
      title: body.title,
      description: body.description || "",
      price: body.price || 0,
      quantity: body.quantity || 1,
      status: body.status || "active",
      category: body.category,
      params: body.params ? JSON.stringify(body.params) : null,
      photos: body.photos ? JSON.stringify(body.photos) : null,
      avitoUrl: body.avitoUrl,
      lastSyncAt: new Date(),
    },
    create: {
      avitoId: String(body.avitoId),
      avitoUrl: body.avitoUrl,
      title: body.title,
      description: body.description || "",
      price: body.price || 0,
      quantity: body.quantity || 1,
      status: body.status || "active",
      category: body.category,
      params: body.params ? JSON.stringify(body.params) : null,
      photos: body.photos ? JSON.stringify(body.photos) : null,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json(listing);
}
