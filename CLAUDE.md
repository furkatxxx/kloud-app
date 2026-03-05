# KLOUD App — Контекст проекта

## О проекте

Веб-приложение для управления продажами майнинг-оборудования Bitmain на Авито.
Компания: ООО Кубера (Avito Pro). Целевая аудитория — юрлица (B2B).

## Стек

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5.9
- Prisma 6 + SQLite (файл: `prisma/dev.db`)
- Tailwind CSS 4
- Node.js v22.14.0 (путь: `~/.local/node/bin`)

## Запуск

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev        # dev-сервер
npm run build      # проверка сборки
npm run db:push    # применить схему БД
npm run db:studio  # UI для БД
```

## Структура

```
src/
  app/
    page.tsx                  # Дашборд (объявления + рекомендации)
    layout.tsx                # Layout + Sidebar навигация
    listings/page.tsx         # Список объявлений (хуки)
    listings/[id]/page.tsx    # Детальная страница (график, A/B тесты, фото, параметры)
    settings/page.tsx         # Настройки (API, Б360, Telegram, мониторинг, автоправила)
    analytics/page.tsx        # Аналитика (мультилинейный график, таблица, периоды)
    ads/page.tsx              # Реклама (VAS ставки, XL, история)
    api/
      avito/sync/route.ts         # POST — синхронизация + автосоздание snapshots
      avito/listings/route.ts     # GET (пагинация) / POST — объявления
      avito/listings/[id]/route.ts # GET — детали одного объявления
      avito/stats/route.ts        # GET/POST — статистика
      avito/analytics/route.ts    # GET — агрегированная аналитика
      avito/ab-tests/route.ts     # GET/POST — A/B тесты
      avito/ab-tests/[id]/route.ts # GET/PATCH/DELETE — управление тестом
      avito/auto-rules/route.ts   # GET/POST — автоправила
      avito/auto-rules/[id]/route.ts # PATCH/DELETE — управление правилом
      avito/vas/route.ts          # GET/POST — VAS настройки и история
      avito/recommendations/route.ts    # GET/POST — рекомендации (генерация + список)
      avito/recommendations/[id]/route.ts # PATCH — apply/dismiss рекомендации
      avito/monitor/route.ts      # GET/POST — мониторинг алертов
      avito/monitor/[id]/route.ts # PATCH — resolve алерта
      settings/route.ts           # GET/POST — настройки
  lib/
    avito-api.ts              # Клиент Avito API (OAuth, rate limit + retry, 7 функций)
    avito-env.ts              # Загрузка API ключей из БД → process.env
    db.ts                     # Prisma singleton
    types.ts                  # Общие TypeScript типы (15+ интерфейсов)
    utils.ts                  # Утилиты (getListingStatus, formatLastSync, formatPrice)
    recommendation-engine.ts  # Движок рекомендаций (15 правил анализа)
    monitor-engine.ts         # Движок мониторинга (5 проверок)
  hooks/
    useListings.ts            # Хук загрузки объявлений
    useSync.ts                # Хук синхронизации
    useListingStats.ts        # Хук статистики объявления
    useAnalytics.ts           # Хук агрегированной аналитики
    useABTests.ts             # Хук A/B тестов (CRUD + управление)
    useAutoRules.ts           # Хук автоправил (CRUD)
    useVAS.ts                 # Хук VAS продвижения
    useRecommendations.ts     # Хук рекомендаций (генерация + apply/dismiss)
  components/
    layout/Sidebar.tsx        # Боковое меню
    dashboard/StatusCard.tsx   # Карточка объявления
    ui/QuickStat.tsx          # Карточка метрики
    ui/SyncNotification.tsx   # Уведомление о синхронизации
    ui/SimpleChart.tsx        # SVG-график (одна линия)
    ui/MultiLineChart.tsx     # SVG-график (несколько линий + легенда)
    ui/ParamsTable.tsx        # Таблица параметров
    ui/ABTestPanel.tsx        # Панель A/B тестов (форма + список)
    ui/AutoRulesPanel.tsx     # Панель автоправил (шаблоны + вкл/выкл)
    ui/RecommendationsPanel.tsx # Панель рекомендаций (приоритеты + действия)
docs/                         # Маркетинговая база (скопирована из глобальной памяти)
prisma/
  schema.prisma               # 11 таблиц
  dev.db                      # SQLite база (3 объявления, API ключи настроены)
```

## БД — ключевые таблицы

- **Listing** — объявления (центральная сущность)
- **Snapshot** — история изменений объявления
- **DailyStat** — ежедневные метрики (views, contacts, favorites)
- **Recommendation** — рекомендации по оптимизации
- **ABTest / ABVariant** — A/B тестирование
- **VASSettings / VASAction** — платное продвижение
- **MonitorAlert** — алерты мониторинга
- **AutoRule** — автоправила
- **Settings** — глобальные настройки (API ключи, Telegram)

## Avito API

- Ключи настроены в БД (User ID: 131718920)
- 3 объявления синхронизированы: T21 190TH, T21 180TH, S21+ 235TH
- Rate limiting: 5 сек + retry 3 попытки (429/5xx)

---

## Прогресс

> Подробный журнал сессий — в **PROGRESS.md**

- **Фаза 0 (Скелет):** ЗАВЕРШЕНА
- **Фаза 1 (Основной функционал):** ЗАВЕРШЕНА
- **Фаза 2 (Оптимизация):** ЗАВЕРШЕНА
- **Фаза 3 (Продвинутые функции):** ЗАВЕРШЕНА — рекомендации, мониторинг, snapshots, Бизнес 360
- **Фаза 4 (Полировка):** ЗАВЕРШЕНА — адаптивность, анимации, скелетоны, мобильный сайдбар

---

## Правила работы

- **Проект полностью автономный** — работать ТОЛЬКО внутри папки `kloud-app/`, никаких файлов за её пределами
- Комментарии и коммиты — на русском
- Conventional Commits: feat/fix/refactor/docs/test/chore
- Лимиты: роуты 300/600 строк, сервисы 400/800, UI 200/400
- Проверять дубликаты перед созданием нового
- Запускать build перед заявлением о готовности
- Не создавать файлы "на будущее"
- **После каждой завершённой задачи** — обновить `PROGRESS.md` (не ждать конца сессии!)
