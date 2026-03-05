import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/avito/auto-rules/[id] — обновить правило (вкл/выкл, изменить)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.autoRule.findUnique({ where: { id } });
  if (!rule) {
    return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  }

  // Собираем только переданные поля
  const updateData: Record<string, unknown> = {};

  if (typeof body.enabled === "boolean") {
    updateData.enabled = body.enabled;
  }
  if (body.name) {
    updateData.name = body.name;
  }
  if (body.condition) {
    updateData.condition = typeof body.condition === "string"
      ? body.condition
      : JSON.stringify(body.condition);
  }
  if (body.action) {
    updateData.action = typeof body.action === "string"
      ? body.action
      : JSON.stringify(body.action);
  }
  if (body.cooldownMin) {
    updateData.cooldownMin = body.cooldownMin;
  }

  const updated = await prisma.autoRule.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/avito/auto-rules/[id] — удалить правило
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.autoRule.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
