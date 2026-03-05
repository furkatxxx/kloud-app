import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runMonitorCheck, saveAlerts } from "@/lib/monitor-engine";
import { sendMonitorAlerts } from "@/lib/telegram";

// POST /api/avito/monitor — запустить проверку мониторинга
export async function POST() {
  const alerts = await runMonitorCheck();
  const created = await saveAlerts(alerts);

  // Отправляем новые алерты в Telegram (только critical и high)
  let telegramSent = 0;
  if (created > 0) {
    const importantAlerts = alerts.filter(
      (a) => a.severity === "critical" || a.severity === "high"
    );
    if (importantAlerts.length > 0) {
      const tgResult = await sendMonitorAlerts(importantAlerts);
      telegramSent = tgResult.sent;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: alerts.length,
    newAlerts: created,
    telegramSent,
  });
}

// GET /api/avito/monitor — получить текущие алерты
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolved = searchParams.get("resolved") === "true";
  const listingId = searchParams.get("listingId");

  const where: Record<string, unknown> = { resolved };
  if (listingId) where.listingId = listingId;

  const alerts = await prisma.monitorAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { select: { id: true, title: true } },
    },
  });

  // Сводка
  const summary = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
    total: alerts.length,
  };

  return NextResponse.json({ alerts, summary });
}
