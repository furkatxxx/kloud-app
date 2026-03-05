import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/ab-tests?listingId=xxx — получить A/B тесты объявления
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");

  const where = listingId ? { listingId } : {};

  const tests = await prisma.aBTest.findMany({
    where,
    include: {
      variants: {
        orderBy: { label: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

// POST /api/avito/ab-tests — создать новый A/B тест
export async function POST(request: Request) {
  const body = await request.json();
  const { listingId, field, variants } = body;

  if (!listingId || !field || !variants || variants.length < 2) {
    return NextResponse.json(
      { error: "listingId, field и минимум 2 варианта обязательны" },
      { status: 400 }
    );
  }

  // Проверяем что объявление существует
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  // Проверяем нет ли уже активного теста для этого поля
  const existing = await prisma.aBTest.findFirst({
    where: { listingId, field, status: "active" },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Уже есть активный тест для поля "${field}"` },
      { status: 409 }
    );
  }

  // Создаём тест с вариантами
  const test = await prisma.aBTest.create({
    data: {
      listingId,
      field,
      status: "draft",
      variants: {
        create: (variants as { label: string; value: string }[]).map((v) => ({
          label: v.label,
          value: v.value,
        })),
      },
    },
    include: { variants: true },
  });

  return NextResponse.json(test);
}
