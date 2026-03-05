import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeListing } from "@/lib/recommendation-engine";

// POST /api/avito/recommendations — сгенерировать рекомендации для всех объявлений
export async function POST() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
  });

  if (listings.length === 0) {
    return NextResponse.json({ error: "Нет активных объявлений" }, { status: 400 });
  }

  let totalCreated = 0;
  const results: { listingId: string; title: string; count: number }[] = [];

  for (const listing of listings) {
    // Получаем статистику за 7 дней
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const stats = await prisma.dailyStat.findMany({
      where: { listingId: listing.id, date: { gte: since } },
    });

    const aggregated = stats.length > 0
      ? {
          views: stats.reduce((s, d) => s + d.views, 0),
          contacts: stats.reduce((s, d) => s + d.contacts, 0),
          favorites: stats.reduce((s, d) => s + d.favorites, 0),
          days: 7,
        }
      : null;

    // Анализируем объявление
    const recs = analyzeListing(listing, aggregated);

    // Сохраняем новые рекомендации (не дублируя существующие pending)
    for (const rec of recs) {
      const existing = await prisma.recommendation.findFirst({
        where: {
          listingId: listing.id,
          ruleId: rec.ruleId,
          status: "pending",
        },
      });

      if (!existing) {
        await prisma.recommendation.create({
          data: {
            listingId: listing.id,
            ruleId: rec.ruleId,
            severity: rec.severity,
            title: rec.title,
            description: rec.description,
            suggestion: rec.suggestion,
            field: rec.field,
            newValue: rec.newValue,
            impact: rec.impact,
            impactScore: rec.impactScore,
            status: "pending",
          },
        });
        totalCreated++;
      }
    }

    results.push({
      listingId: listing.id,
      title: listing.title,
      count: recs.length,
    });
  }

  return NextResponse.json({
    ok: true,
    totalCreated,
    analyzed: listings.length,
    results,
  });
}

// GET /api/avito/recommendations?listingId=xxx&status=pending
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const status = searchParams.get("status") || "pending";

  const where: Record<string, unknown> = {};
  if (listingId) where.listingId = listingId;
  if (status !== "all") where.status = status;

  const recommendations = await prisma.recommendation.findMany({
    where,
    orderBy: [{ severity: "desc" }, { impactScore: "desc" }],
    include: {
      listing: { select: { id: true, title: true } },
    },
  });

  // Группировка по severity для сводки
  const summary = {
    critical: recommendations.filter((r) => r.severity === "critical").length,
    high: recommendations.filter((r) => r.severity === "high").length,
    medium: recommendations.filter((r) => r.severity === "medium").length,
    low: recommendations.filter((r) => r.severity === "low").length,
    total: recommendations.length,
  };

  return NextResponse.json({ recommendations, summary });
}
