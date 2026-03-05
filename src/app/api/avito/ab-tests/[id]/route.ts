import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/ab-tests/[id] — получить один A/B тест
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const test = await prisma.aBTest.findUnique({
    where: { id },
    include: { variants: { orderBy: { label: "asc" } } },
  });

  if (!test) {
    return NextResponse.json({ error: "Тест не найден" }, { status: 404 });
  }

  return NextResponse.json(test);
}

// PATCH /api/avito/ab-tests/[id] — обновить статус теста (start, stop, complete)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  const test = await prisma.aBTest.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!test) {
    return NextResponse.json({ error: "Тест не найден" }, { status: 404 });
  }

  if (action === "start") {
    if (test.status !== "draft") {
      return NextResponse.json({ error: "Можно запустить только черновик" }, { status: 400 });
    }

    // Активируем первый вариант
    const firstVariant = test.variants[0];
    if (firstVariant) {
      await prisma.aBVariant.update({
        where: { id: firstVariant.id },
        data: { activeFrom: new Date() },
      });
    }

    const updated = await prisma.aBTest.update({
      where: { id },
      data: {
        status: "active",
        startedAt: new Date(),
        currentVariant: 0,
      },
      include: { variants: true },
    });

    return NextResponse.json(updated);
  }

  if (action === "next") {
    if (test.status !== "active") {
      return NextResponse.json({ error: "Тест не активен" }, { status: 400 });
    }

    // Завершаем текущий вариант
    const currentVariant = test.variants[test.currentVariant];
    if (currentVariant) {
      await prisma.aBVariant.update({
        where: { id: currentVariant.id },
        data: { activeTo: new Date() },
      });
    }

    const nextIndex = test.currentVariant + 1;

    // Если все варианты протестированы — завершаем тест
    if (nextIndex >= test.variants.length) {
      const updated = await prisma.aBTest.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
        include: { variants: true },
      });
      return NextResponse.json(updated);
    }

    // Активируем следующий вариант
    const nextVariant = test.variants[nextIndex];
    if (nextVariant) {
      await prisma.aBVariant.update({
        where: { id: nextVariant.id },
        data: { activeFrom: new Date() },
      });
    }

    const updated = await prisma.aBTest.update({
      where: { id },
      data: { currentVariant: nextIndex },
      include: { variants: true },
    });

    return NextResponse.json(updated);
  }

  if (action === "complete") {
    const updated = await prisma.aBTest.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
      include: { variants: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

// DELETE /api/avito/ab-tests/[id] — удалить тест
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Удаляем варианты и тест
  await prisma.aBVariant.deleteMany({ where: { testId: id } });
  await prisma.aBTest.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
