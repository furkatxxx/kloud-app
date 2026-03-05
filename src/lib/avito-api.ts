const AVITO_API_BASE = "https://api.avito.ru";

let cachedToken: { token: string; expiresAt: number } | null = null;

// Получить OAuth токен
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.AVITO_CLIENT_ID;
  const clientSecret = process.env.AVITO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("AVITO_CLIENT_ID и AVITO_CLIENT_SECRET не настроены");
  }

  const res = await fetch(`${AVITO_API_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ошибка авторизации Avito: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

// Rate limiting: минимум 5 секунд между запросами
let lastRequestTime = 0;
const MAX_RETRIES = 3;

async function rateLimitedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 5000 - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    const token = await getAccessToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Успех или клиентская ошибка (кроме 429) — возвращаем сразу
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      return res;
    }

    // 429 (rate limit) или 5xx (серверная ошибка) — повторяем
    if (attempt < MAX_RETRIES - 1) {
      const delay = Math.pow(2, attempt) * 5000; // 5с, 10с, 20с
      console.log(`[avito-api] Повтор ${attempt + 1}/${MAX_RETRIES} через ${delay / 1000}с (статус: ${res.status})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      return res; // Последняя попытка — возвращаем как есть
    }
  }

  // Сюда не должны попасть, но TypeScript требует return
  throw new Error("Не удалось выполнить запрос после нескольких попыток");
}

// Получить ВСЕ свои объявления (с пагинацией)
export async function getMyListings(
  status: string = "active"
): Promise<AvitoItem[]> {
  const allItems: AvitoItem[] = [];
  let page = 1;
  const perPage = 25;

  while (true) {
    const res = await rateLimitedFetch(
      `${AVITO_API_BASE}/core/v1/items?status=${status}&page=${page}&per_page=${perPage}`
    );

    if (!res.ok) break;
    const data = await res.json();
    const items: AvitoItem[] = data.resources || [];

    if (items.length === 0) break;
    allItems.push(...items);

    // Если вернулось меньше чем per_page — это последняя страница
    if (items.length < perPage) break;
    page++;
  }

  return allItems;
}

// Метаданные объявления (ответ detail API)
export interface AvitoItemMeta {
  status: string;
  url: string;
  start_time?: string;
  finish_time?: string;
  vas?: unknown[];
}

// Получить метаданные объявления (url, статус, даты, VAS)
// ВАЖНО: Avito API НЕ возвращает описание, фото и параметры через этот эндпоинт
export async function getItem(itemId: string): Promise<AvitoItemMeta | null> {
  const userId = process.env.AVITO_USER_ID;
  if (!userId) throw new Error("AVITO_USER_ID не настроен");

  const res = await rateLimitedFetch(
    `${AVITO_API_BASE}/core/v1/accounts/${userId}/items/${itemId}/`
  );

  if (!res.ok) return null;
  return res.json();
}

// Получить статистику объявлений
export async function getItemsStats(itemIds: string[]): Promise<AvitoStats[]> {
  const userId = process.env.AVITO_USER_ID;
  if (!userId) throw new Error("AVITO_USER_ID не настроен");

  // Avito API требует dateFrom и dateTo, период до 270 дней
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const dateFrom = weekAgo.toISOString().slice(0, 10);
  const dateTo = today.toISOString().slice(0, 10);

  const body = {
    dateFrom,
    dateTo,
    itemIds: itemIds.map(Number),
    fields: ["uniqViews", "uniqContacts", "uniqFavorites"],
    periodGrouping: "day",
  };

  console.log(`[avito-api] getItemsStats: ${itemIds.length} объявлений, период ${dateFrom}..${dateTo}`);

  const res = await rateLimitedFetch(
    `${AVITO_API_BASE}/stats/v1/accounts/${userId}/items`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[avito-api] getItemsStats ошибка ${res.status}: ${errorText}`);
    return [];
  }

  const data = await res.json();
  console.log(`[avito-api] getItemsStats ответ: ${JSON.stringify(data).slice(0, 500)}`);
  return data.result?.items || [];
}

// Применить VAS (платное продвижение)
export async function applyVAS(
  itemId: string,
  vasId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = process.env.AVITO_USER_ID;
  if (!userId) throw new Error("AVITO_USER_ID не настроен");

  const res = await rateLimitedFetch(
    `${AVITO_API_BASE}/core/v1/accounts/${userId}/items/${itemId}/vas`,
    {
      method: "PUT",
      body: JSON.stringify({ vasId }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    return { ok: false, error };
  }
  return { ok: true };
}

// Получить цены на VAS
export async function getVASPrices(): Promise<VASPrice[]> {
  const userId = process.env.AVITO_USER_ID;
  if (!userId) throw new Error("AVITO_USER_ID не настроен");

  const res = await rateLimitedFetch(
    `${AVITO_API_BASE}/core/v1/accounts/${userId}/price/vas`
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.result || [];
}

// Проверить подключение к API
export async function testConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await getAccessToken();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Типы

export interface AvitoItem {
  id: number;
  title: string;
  description?: string;
  price?: number;
  category?: { name: string };
  images?: { id?: number; url?: string; [key: string]: unknown }[];
  status?: string;
  url?: string;
  [key: string]: unknown;
}

export interface AvitoStats {
  itemId: number;
  stats: {
    uniqViews?: number;
    uniqContacts?: number;
    uniqFavorites?: number;
    date?: string;
  }[];
}

// Формат ответа stats/v1 (новый API)
export interface AvitoStatsV1Item {
  itemId: number;
  stats: {
    date: string;
    uniqViews: number;
    uniqContacts: number;
    uniqFavorites: number;
  }[];
}

export interface VASPrice {
  vas_id: string;
  name: string;
  price: number;
}
