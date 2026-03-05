import { prisma } from "@/lib/db";

// Загрузить API ключи из БД и установить в process.env
// Вызывать перед любым обращением к Avito API из API роутов
export async function ensureAvitoEnv(): Promise<{ ok: boolean; error?: string }> {
  const settings = await prisma.settings.findUnique({ where: { id: "main" } });

  if (!settings?.avitoClientId || !settings?.avitoClientSecret) {
    return { ok: false, error: "Сначала настройте API ключи в разделе Настройки" };
  }

  process.env.AVITO_CLIENT_ID = settings.avitoClientId;
  process.env.AVITO_CLIENT_SECRET = settings.avitoClientSecret;

  if (settings.avitoUserId) {
    process.env.AVITO_USER_ID = settings.avitoUserId;
  }

  return { ok: true };
}
