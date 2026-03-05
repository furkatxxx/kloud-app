import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/settings — получить текущие настройки
export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: "main" } });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: "main" },
    });
  }

  // Маскируем секреты для фронтенда
  return NextResponse.json({
    ...settings,
    avitoClientSecret: settings.avitoClientSecret ? "••••••••" : null,
    telegramBotToken: settings.telegramBotToken ? "••••••••" : null,
  });
}

// POST /api/settings — обновить настройки
export async function POST(request: Request) {
  const body = await request.json();

  // Не перезаписываем секреты маскированными значениями
  const data: Record<string, unknown> = {};
  if (body.avitoClientId !== undefined) data.avitoClientId = body.avitoClientId;
  if (body.avitoClientSecret && body.avitoClientSecret !== "••••••••")
    data.avitoClientSecret = body.avitoClientSecret;
  if (body.avitoUserId !== undefined) data.avitoUserId = body.avitoUserId;
  if (body.telegramBotToken && body.telegramBotToken !== "••••••••")
    data.telegramBotToken = body.telegramBotToken;
  if (body.telegramChatId !== undefined) data.telegramChatId = body.telegramChatId;
  if (body.monitorIntervalMin !== undefined)
    data.monitorIntervalMin = Number(body.monitorIntervalMin);
  if (body.monitorEnabled !== undefined)
    data.monitorEnabled = Boolean(body.monitorEnabled);

  const settings = await prisma.settings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });

  return NextResponse.json({ ok: true, settings });
}
