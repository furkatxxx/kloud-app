import { NextResponse } from "next/server";
import { testTelegramConnection, sendTelegramMessage } from "@/lib/telegram";

// GET /api/telegram/test — проверить подключение к боту
export async function GET() {
  const result = await testTelegramConnection();
  return NextResponse.json(result);
}

// POST /api/telegram/test — отправить тестовое сообщение
export async function POST() {
  const result = await sendTelegramMessage(
    "🧪 <b>Тест KLOUD</b>\n\nТелеграм-уведомления работают!"
  );
  return NextResponse.json(result);
}
