// Модуль отправки уведомлений в Telegram
import { prisma } from "@/lib/db";

const TELEGRAM_API = "https://api.telegram.org";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

// Загрузить настройки Telegram из БД
async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "main" } });
  if (!settings?.telegramBotToken || !settings?.telegramChatId) {
    return null;
  }
  return {
    botToken: settings.telegramBotToken,
    chatId: settings.telegramChatId,
  };
}

// Отправить текстовое сообщение в Telegram
export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "MarkdownV2" = "HTML"
): Promise<{ ok: boolean; error?: string }> {
  const config = await getTelegramConfig();
  if (!config) {
    return { ok: false, error: "Telegram не настроен (нет botToken или chatId)" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[telegram] Ошибка отправки: ${res.status} ${error}`);
      return { ok: false, error: `Telegram API: ${res.status}` };
    }

    return { ok: true };
  } catch (e) {
    console.error(`[telegram] Ошибка сети:`, (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

// Отправить алерты мониторинга
export async function sendMonitorAlerts(
  alerts: { type: string; severity: string; message: string }[]
): Promise<{ ok: boolean; sent: number }> {
  if (alerts.length === 0) return { ok: true, sent: 0 };

  const severityIcon: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
  };

  const lines = alerts.map((a) => {
    const icon = severityIcon[a.severity] || "⚪";
    return `${icon} ${a.message}`;
  });

  const text = `<b>🔔 KLOUD — Алерты мониторинга</b>\n\n${lines.join("\n\n")}`;
  const result = await sendTelegramMessage(text);

  return { ok: result.ok, sent: result.ok ? alerts.length : 0 };
}

// Отправить уведомление о синхронизации
export async function sendSyncNotification(stats: {
  synced: number;
  added: number;
  updated: number;
  statsSaved: number;
}): Promise<{ ok: boolean }> {
  const parts: string[] = [];
  parts.push(`<b>✅ Синхронизация завершена</b>`);
  parts.push(`Объявлений: ${stats.synced}`);
  if (stats.added > 0) parts.push(`Новых: ${stats.added}`);
  if (stats.updated > 0) parts.push(`Обновлено: ${stats.updated}`);
  if (stats.statsSaved > 0) parts.push(`Записей статистики: ${stats.statsSaved}`);

  const text = parts.join("\n");
  return sendTelegramMessage(text);
}

// Отправить ежедневный отчёт (сводка + алерты)
export async function sendDailyReport(data: {
  listings: { title: string; views: number; contacts: number; favorites: number }[];
  totals: { views: number; contacts: number; favorites: number };
  alerts: { severity: string; message: string }[];
  date: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parts: string[] = [];

  parts.push(`<b>📊 KLOUD — Отчёт за ${data.date}</b>`);
  parts.push("");

  // Итоги
  parts.push("<b>Итого:</b>");
  parts.push(`👁 Просмотры: ${data.totals.views}`);
  parts.push(`📞 Контакты: ${data.totals.contacts}`);
  parts.push(`⭐ Избранное: ${data.totals.favorites}`);
  parts.push("");

  // По каждому объявлению
  parts.push("<b>По объявлениям:</b>");
  for (const l of data.listings) {
    const shortTitle = l.title.length > 35 ? l.title.slice(0, 35) + "..." : l.title;
    parts.push(`• ${shortTitle}`);
    parts.push(`  👁${l.views} 📞${l.contacts} ⭐${l.favorites}`);
  }

  // Алерты (если есть)
  if (data.alerts.length > 0) {
    parts.push("");
    parts.push(`<b>🔔 Алерты (${data.alerts.length}):</b>`);
    const severityIcon: Record<string, string> = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🔵",
    };
    for (const a of data.alerts) {
      const icon = severityIcon[a.severity] || "⚪";
      parts.push(`${icon} ${a.message}`);
    }
  }

  return sendTelegramMessage(parts.join("\n"));
}

// Тест соединения
export async function testTelegramConnection(): Promise<{ ok: boolean; error?: string }> {
  const config = await getTelegramConfig();
  if (!config) {
    return { ok: false, error: "Telegram не настроен" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/getMe`);
    if (!res.ok) {
      return { ok: false, error: `Ошибка: ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, error: `Бот: @${data.result.username}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
