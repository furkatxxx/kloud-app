import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/avito/recommendations/[id] — применить или отклонить рекомендацию
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body; // "apply" | "dismiss"

  if (!action || !["apply", "dismiss"].includes(action)) {
    return NextResponse.json(
      { error: "action должен быть 'apply' или 'dismiss'" },
      { status: 400 }
    );
  }

  const rec = await prisma.recommendation.findUnique({ where: { id } });
  if (!rec) {
    return NextResponse.json({ error: "Рекомендация не найдена" }, { status: 404 });
  }

  const updated = await prisma.recommendation.update({
    where: { id },
    data: {
      status: action === "apply" ? "applied" : "dismissed",
      appliedAt: action === "apply" ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
