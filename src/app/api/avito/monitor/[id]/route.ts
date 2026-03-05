import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/avito/monitor/[id] — пометить алерт как решённый
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const alert = await prisma.monitorAlert.findUnique({ where: { id } });
  if (!alert) {
    return NextResponse.json({ error: "Алерт не найден" }, { status: 404 });
  }

  const updated = await prisma.monitorAlert.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
