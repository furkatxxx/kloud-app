import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMyListings, getItem, getItemsStats, type AvitoItem } from "@/lib/avito-api";
import { ensureAvitoEnv } from "@/lib/avito-env";
import { sendSyncNotification } from "@/lib/telegram";

// POST /api/avito/sync — автоматически достать все объявления с Авито и сохранить
export async function POST() {
  const env = await ensureAvitoEnv();
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 400 });
  }

  try {
    // 1. Достаём ВСЕ активные объявления с Авито
    const avitoItems = await getMyListings("active");

    if (avitoItems.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "На Авито нет активных объявлений",
        synced: 0,
        total: 0,
        added: 0,
        updated: 0,
      });
    }

    let added = 0;
    let updated = 0;
    const results: { id: string; title: string; action: string }[] = [];

    // 2. Для каждого объявления — создаём или обновляем в локальной БД
    // ВАЖНО: Avito API не возвращает описание, фото и параметры.
    //   - /core/v1/items (список) → title, price, status, category, id
    //   - /core/v1/accounts/{userId}/items/{id} (детали) → url, status, start/finish_time, vas
    // Описание, фото и параметры доступны только через веб-интерфейс Авито.
    for (const item of avitoItems) {
      const avitoId = String(item.id);

      const existing = await prisma.listing.findUnique({
        where: { avitoId },
      });

      // Для новых объявлений — достаём каноничный URL через детальный API
      // Для существующих — пропускаем (URL уже есть, экономим 5с на API-вызов)
      let avitoUrl = existing?.avitoUrl || item.url || `https://www.avito.ru/${avitoId}`;
      if (!existing) {
        try {
          const meta = await getItem(avitoId);
          if (meta?.url) avitoUrl = meta.url;
        } catch (e) {
          console.error(`[sync] Ошибка getItem(${avitoId}):`, (e as Error).message);
        }
      }

      // Защита: не перезаписываем description если API вернул пустое, а в БД есть ручное описание
      const apiDescription = item.description || "";
      const keepDescription = existing && !apiDescription && existing.description;

      const listingData = {
        title: item.title || "Без заголовка",
        description: keepDescription ? existing.description : apiDescription,
        price: item.price || 0,
        status: item.status || "active",
        category: item.category?.name || null,
        avitoUrl,
        lastSyncAt: new Date(),
      };

      if (existing) {
        // Создаём snapshot если данные изменились
        const changed =
          existing.title !== listingData.title ||
          existing.price !== listingData.price ||
          existing.status !== listingData.status;

        if (changed) {
          const reasons: string[] = [];
          if (existing.title !== listingData.title) reasons.push("заголовок");
          if (existing.price !== listingData.price) reasons.push("цена");
          if (existing.status !== listingData.status) reasons.push("статус");

          await prisma.snapshot.create({
            data: {
              listingId: existing.id,
              title: existing.title,
              description: existing.description,
              price: existing.price,
              quantity: existing.quantity,
              params: existing.params,
              photos: existing.photos,
              reason: `Изменение: ${reasons.join(", ")}`,
            },
          });
        }

        await prisma.listing.update({
          where: { avitoId },
          data: listingData,
        });
        updated++;
        results.push({ id: avitoId, title: listingData.title, action: changed ? "updated" : "synced" });
      } else {
        await prisma.listing.create({
          data: {
            avitoId,
            ...listingData,
          },
        });
        added++;
        results.push({ id: avitoId, title: listingData.title, action: "added" });
      }
    }

    // 3. Помечаем объявления которых больше нет на Авито
    const activeAvitoIds = avitoItems.map((item: AvitoItem) => String(item.id));
    const localListings = await prisma.listing.findMany({
      where: { status: "active" },
    });

    for (const local of localListings) {
      if (!activeAvitoIds.includes(local.avitoId)) {
        await prisma.listing.update({
          where: { id: local.id },
          data: { status: "hidden" },
        });
        results.push({ id: local.avitoId, title: local.title, action: "hidden" });
      }
    }

    // 4. Получаем статистику
    const allListings = await prisma.listing.findMany();
    const avitoIds = allListings.map((l) => l.avitoId);
    let statsSaved = 0;

    try {
      console.log(`[sync] Начинаем загрузку статистики, AVITO_USER_ID=${process.env.AVITO_USER_ID}, avitoIds=${avitoIds.join(",")}`);
      if (process.env.AVITO_USER_ID && avitoIds.length > 0) {
        const statsItems = await getItemsStats(avitoIds);
        console.log(`[sync] Получено ${statsItems.length} записей статистики: ${JSON.stringify(statsItems).slice(0, 300)}`);

        for (const item of statsItems) {
          const listing = allListings.find((l) => l.avitoId === String(item.itemId));
          if (!listing || !item.stats?.length) continue;

          // Сохраняем статистику за каждый день
          for (const dayStat of item.stats) {
            if (!dayStat.date) continue;
            const date = new Date(dayStat.date);
            date.setHours(0, 0, 0, 0);

            await prisma.dailyStat.upsert({
              where: {
                listingId_date_source: {
                  listingId: listing.id,
                  date,
                  source: "total",
                },
              },
              update: {
                views: dayStat.uniqViews || 0,
                contacts: dayStat.uniqContacts || 0,
                favorites: dayStat.uniqFavorites || 0,
              },
              create: {
                listingId: listing.id,
                date,
                views: dayStat.uniqViews || 0,
                contacts: dayStat.uniqContacts || 0,
                favorites: dayStat.uniqFavorites || 0,
                source: "total",
              },
            });
            statsSaved++;
          }
        }
      }
    } catch (statsErr) {
      console.error(`[sync] Ошибка статистики:`, (statsErr as Error).message, (statsErr as Error).stack);
      // Не критично — продолжаем
    }
    console.log(`[sync] Итого statsSaved: ${statsSaved}`);

    // 5. Уведомление в Telegram о завершении синхронизации
    try {
      await sendSyncNotification({
        synced: avitoItems.length,
        added,
        updated,
        statsSaved,
      });
    } catch (tgErr) {
      console.error("[sync] Ошибка Telegram:", (tgErr as Error).message);
      // Не критично — продолжаем
    }

    return NextResponse.json({
      ok: true,
      synced: avitoItems.length,
      total: avitoItems.length,
      added,
      updated,
      statsSaved,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
