import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avito/auto-rules — получить все автоправила
export async function GET() {
  const rules = await prisma.autoRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

// POST /api/avito/auto-rules — создать новое автоправило
export async function POST(request: Request) {
  const body = await request.json();
  const { name, condition, action, cooldownMin } = body;

  if (!name || !condition || !action) {
    return NextResponse.json(
      { error: "name, condition и action обязательны" },
      { status: 400 }
    );
  }

  // Валидация JSON
  try {
    if (typeof condition === "string") JSON.parse(condition);
    if (typeof action === "string") JSON.parse(action);
  } catch {
    return NextResponse.json({ error: "condition и action должны быть валидным JSON" }, { status: 400 });
  }

  const rule = await prisma.autoRule.create({
    data: {
      name,
      condition: typeof condition === "string" ? condition : JSON.stringify(condition),
      action: typeof action === "string" ? action : JSON.stringify(action),
      cooldownMin: cooldownMin || 1440,
      enabled: true,
    },
  });

  return NextResponse.json(rule);
}
