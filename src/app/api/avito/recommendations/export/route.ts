import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Порядок severity для сортировки (чем больше — тем важнее)
const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Критические",
  high: "Высокий приоритет",
  medium: "Средний приоритет",
  low: "Низкий приоритет",
};

// GET /api/avito/recommendations/export — экспорт pending-рекомендаций в Markdown
export async function GET() {
  // Получаем все pending рекомендации с данными объявлений
  const recs = await prisma.recommendation.findMany({
    where: { status: "pending" },
    orderBy: [{ severity: "desc" }, { impactScore: "desc" }],
    include: {
      listing: {
        select: {
          id: true,
          avitoId: true,
          title: true,
          price: true,
          status: true,
          avitoUrl: true,
        },
      },
    },
  });

  if (recs.length === 0) {
    return NextResponse.json(
      { error: "Нет pending рекомендаций для экспорта" },
      { status: 404 }
    );
  }

  // Группируем по объявлениям
  const byListing = new Map<string, typeof recs>();
  for (const rec of recs) {
    const key = rec.listingId;
    if (!byListing.has(key)) byListing.set(key, []);
    byListing.get(key)!.push(rec);
  }

  // Подсчёт по severity
  const counts = {
    critical: recs.filter((r) => r.severity === "critical").length,
    high: recs.filter((r) => r.severity === "high").length,
    medium: recs.filter((r) => r.severity === "medium").length,
    low: recs.filter((r) => r.severity === "low").length,
  };

  // Генерация Markdown
  const now = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];

  lines.push("# Рекомендации по оптимизации объявлений KLOUD");
  lines.push("");
  lines.push(`> Сгенерировано: ${now}`);
  lines.push(`> Всего задач: ${recs.length} | Критических: ${counts.critical} | Высоких: ${counts.high} | Средних: ${counts.medium} | Низких: ${counts.low}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Для каждого объявления
  for (const [, listingRecs] of byListing) {
    const listing = listingRecs[0].listing;
    const price = listing.price.toLocaleString("ru-RU");

    lines.push(`## ${listing.title}`);
    lines.push(`Avito ID: ${listing.avitoId} | Цена: ${price} ₽ | Статус: ${listing.status}`);
    if (listing.avitoUrl) {
      lines.push(`URL: ${listing.avitoUrl}`);
    }
    lines.push("");

    // Группируем по severity внутри объявления
    const bySeverity = new Map<string, typeof listingRecs>();
    for (const rec of listingRecs) {
      if (!bySeverity.has(rec.severity)) bySeverity.set(rec.severity, []);
      bySeverity.get(rec.severity)!.push(rec);
    }

    // Сортируем группы severity по важности
    const sortedSeverities = [...bySeverity.entries()].sort(
      (a, b) => (SEVERITY_ORDER[b[0]] || 0) - (SEVERITY_ORDER[a[0]] || 0)
    );

    let counter = 1;
    for (const [severity, severityRecs] of sortedSeverities) {
      const emoji = SEVERITY_EMOJI[severity] || "⚪";
      const label = SEVERITY_LABEL[severity] || severity;

      lines.push(`### ${emoji} ${label}`);
      lines.push("");

      for (const rec of severityRecs) {
        lines.push(`${counter}. **${rec.title}** (impact: ${rec.impactScore})`);
        lines.push(`   - Проблема: ${rec.description}`);
        lines.push(`   - Действие: ${rec.suggestion}`);
        if (rec.field) {
          lines.push(`   - Поле: \`${rec.field}\``);
        }
        if (rec.newValue) {
          lines.push(`   - Новое значение: ${rec.newValue}`);
        }
        lines.push("");
        counter++;
      }
    }

    lines.push("---");
    lines.push("");
  }

  const markdown = lines.join("\n");
  const filename = `kloud-recommendations-${new Date().toISOString().slice(0, 10)}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
