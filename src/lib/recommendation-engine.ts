// Движок рекомендаций — анализирует объявления и генерирует советы
// Правила основаны на docs/avito-marketing.md и docs/audit-fixes.md
//
// ОГРАНИЧЕНИЕ API:
// Avito API не возвращает описание, фото и параметры объявлений.
// Правила для этих полей работают ТОЛЬКО если данные введены вручную.
// Если поле пустое (дефолт из API) — правило пропускается.

interface ListingForAnalysis {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  category: string | null;
  params: string | null;
  photos: string | null;
}

interface StatsForAnalysis {
  views: number;
  contacts: number;
  favorites: number;
  days: number;
}

export interface RecommendationItem {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  suggestion: string;
  field: string | null;
  newValue: string | null;
  impact: string;
  impactScore: number; // 1-100
}

// Основная функция — анализ одного объявления
export function analyzeListing(
  listing: ListingForAnalysis,
  stats: StatsForAnalysis | null
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  // === ЗАГОЛОВОК (всегда доступен через API) ===
  analyzeTitle(listing, recommendations);

  // === ОПИСАНИЕ (только если заполнено вручную) ===
  analyzeDescription(listing, recommendations);

  // === ФОТО (только если заполнено вручную) ===
  analyzePhotos(listing, recommendations);

  // === ЦЕНА (всегда доступна через API) ===
  analyzePrice(listing, recommendations);

  // === ПАРАМЕТРЫ (только если заполнены вручную) ===
  analyzeParams(listing, recommendations);

  // === СТАТИСТИКА (всегда доступна через API) ===
  if (stats) {
    analyzeStats(listing, stats, recommendations);
  }

  // === ADVISORY: напоминания проверить данные, недоступные через API ===
  analyzeApiGaps(listing, recommendations);

  return recommendations;
}

function analyzeTitle(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  const title = listing.title;

  // Заголовок слишком короткий
  if (title.length < 20) {
    recs.push({
      ruleId: "title_too_short",
      severity: "high",
      title: "Заголовок слишком короткий",
      description: "Короткий заголовок снижает CTR и позицию в поиске. Добавьте ключевые слова: характеристики, НДС, ГТД.",
      suggestion: "Добавьте в заголовок: модель, хешрейт, наличие документов (НДС, ГТД), партия/опт",
      field: "title",
      newValue: null,
      impact: "views_increase",
      impactScore: 75,
    });
  }

  // Нет упоминания НДС/ГТД в заголовке (для B2B критично)
  const hasNDS = /ндс|nds/i.test(title);
  const hasGTD = /гтд|gtd|таможен/i.test(title);
  if (!hasNDS && !hasGTD) {
    recs.push({
      ruleId: "title_no_docs",
      severity: "high",
      title: "Нет упоминания документов в заголовке",
      description: "Для B2B покупателей наличие НДС и ГТД — ключевой фактор. Это отделяет вас от серых продавцов.",
      suggestion: "Добавьте «НДС ГТД» в заголовок — это повышает CTR среди юрлиц на 30-50%",
      field: "title",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 85,
    });
  }

  // Нет «безнал» в заголовке — для B2B это фильтр
  if (!/безнал/i.test(title)) {
    recs.push({
      ruleId: "title_no_beznal",
      severity: "medium",
      title: "Нет слова «безнал» в заголовке",
      description: "B2B покупатели часто ищут по ключу «безнал». Добавив его, вы попадёте в их выдачу.",
      suggestion: "Добавьте «безнал» в заголовок, например: «Antminer T21 190TH б/у НДС ГТД безнал партия»",
      field: "title",
      newValue: null,
      impact: "views_increase",
      impactScore: 55,
    });
  }

  // Нет упоминания «наличие» / «в наличии» / «со склада»
  if (!/наличи|со склада|в стоке|в дата/i.test(title)) {
    recs.push({
      ruleId: "title_no_availability",
      severity: "low",
      title: "Нет указания на наличие в заголовке",
      description: "Фразы «в наличии», «со склада», «в дата-центре» повышают доверие и кликабельность.",
      suggestion: "Добавьте «в наличии» или «со склада в дата-центре» если место позволяет",
      field: "title",
      newValue: null,
      impact: "views_increase",
      impactScore: 40,
    });
  }

  // Спам в заголовке (CAPS, !!!)
  if (/[!]{2,}/.test(title) || /[A-ZА-ЯЁ\s]{10,}/.test(title.replace(/[A-Z][a-z]/g, ""))) {
    recs.push({
      ruleId: "title_spam",
      severity: "critical",
      title: "Спам в заголовке",
      description: "Авито штрафует за спам (!!!, CAPS) — объявление может быть пессимизировано или отклонено.",
      suggestion: "Уберите лишние символы и CAPS. Заголовок должен быть информативным, но без спама.",
      field: "title",
      newValue: null,
      impact: "penalty_avoid",
      impactScore: 95,
    });
  }
}

function analyzeDescription(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  const desc = listing.description;

  // Пропускаем если описание пустое — Avito API не возвращает описание,
  // поэтому пустое описание = нет данных, а не реальная проблема
  if (!desc || desc.length === 0) return;

  // Описание слишком короткое (только если есть хоть что-то)
  if (desc.length < 100) {
    recs.push({
      ruleId: "desc_too_short",
      severity: "critical",
      title: "Описание слишком короткое",
      description: "Подробное описание — второй фактор конверсии после фото. B2B покупатели читают описание целиком.",
      suggestion: "Добавьте: технические характеристики, состояние, документы, условия оплаты, доставку",
      field: "description",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 90,
    });
    return;
  }

  // Нет блока документов
  if (!/документ|ндс|гтд|счёт-фактура|упд|инвойс/i.test(desc)) {
    recs.push({
      ruleId: "desc_no_docs",
      severity: "high",
      title: "Нет блока документов в описании",
      description: "Юрлица не покупают без документов. Перечислите все доступные документы.",
      suggestion: "Добавьте раздел ДОКУМЕНТЫ: ГТД РФ, НДС, счёт-фактура, УПД, чеки, инвойсы",
      field: "description",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 80,
    });
  }

  // Нет условий оплаты
  if (!/безнал|оплат|расчёт|договор/i.test(desc)) {
    recs.push({
      ruleId: "desc_no_payment",
      severity: "medium",
      title: "Нет условий оплаты",
      description: "B2B покупатели хотят знать условия оплаты сразу — безнал, договор, рассрочка.",
      suggestion: "Добавьте: безналичный расчёт с НДС, договор поставки, возможна рассрочка",
      field: "description",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 60,
    });
  }

  // Нет технических характеристик
  if (!/хешрейт|hashrate|th\/s|ватт|потребление|алгоритм/i.test(desc)) {
    recs.push({
      ruleId: "desc_no_specs",
      severity: "medium",
      title: "Нет технических характеристик",
      description: "Покупатели оборудования ищут конкретные характеристики: хешрейт, потребление, алгоритм.",
      suggestion: "Добавьте раздел ТТХ: хешрейт, потребление, алгоритм, охлаждение",
      field: "description",
      newValue: null,
      impact: "views_increase",
      impactScore: 55,
    });
  }

  // Нет призыва к действию
  if (!/звоните|пишите|написать|позвонить|обращайтесь/i.test(desc)) {
    recs.push({
      ruleId: "desc_no_cta",
      severity: "low",
      title: "Нет призыва к действию",
      description: "Призыв к действию увеличивает конверсию в контакты.",
      suggestion: "Добавьте в конце: «Пишите или звоните — подготовим КП в течение 2 часов»",
      field: "description",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 40,
    });
  }
}

function analyzePhotos(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  // Пропускаем если фото null — Avito API не возвращает фото,
  // null = нет данных из API, а не реальное отсутствие фото
  if (listing.photos === null) return;

  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.photos);
  } catch { /* невалидный JSON */ }

  if (photos.length === 0) {
    recs.push({
      ruleId: "no_photos",
      severity: "critical",
      title: "Нет фотографий",
      description: "Объявления без фото получают в 5-10 раз меньше просмотров. Это главный фактор CTR.",
      suggestion: "Добавьте реальные фото оборудования: общий вид, серийные номера, рабочее состояние, скрины хешрейта",
      field: "photos",
      newValue: null,
      impact: "views_increase",
      impactScore: 98,
    });
  } else if (photos.length < 3) {
    recs.push({
      ruleId: "few_photos",
      severity: "medium",
      title: "Мало фотографий",
      description: `Только ${photos.length} фото. Больше фото = больше доверия. Рекомендуется 5-10 фото.`,
      suggestion: "Добавьте: фото в дата-центре, скрины хешрейта с пула, крупный план серийника, документы",
      field: "photos",
      newValue: null,
      impact: "views_increase",
      impactScore: 65,
    });
  }
}

function analyzePrice(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  // Цена = 0 или подозрительно низкая
  if (listing.price === 0) {
    recs.push({
      ruleId: "price_zero",
      severity: "critical",
      title: "Цена не указана",
      description: "Объявление без цены получает меньше доверия и может быть помечено Авито.",
      suggestion: "Укажите реальную цену. B2B покупатели фильтруют по цене.",
      field: "price",
      newValue: null,
      impact: "views_increase",
      impactScore: 80,
    });
  }

  // Слишком низкая цена для оборудования (подозрение на мошенничество)
  if (listing.price > 0 && listing.price < 10000 && /antminer|asic|майнер/i.test(listing.title)) {
    recs.push({
      ruleId: "price_suspicious",
      severity: "critical",
      title: "Подозрительно низкая цена",
      description: "Авито может пометить объявление как мошенничество при слишком низкой цене на дорогие товары.",
      suggestion: "Установите рыночную цену. Для T21 — от 59 000 ₽ (серый) до 110 000 ₽ (белый с НДС)",
      field: "price",
      newValue: null,
      impact: "penalty_avoid",
      impactScore: 90,
    });
  }
}

function analyzeParams(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  // Пропускаем если параметры null — Avito API не возвращает параметры,
  // null = нет данных из API, а не реальное отсутствие параметров
  if (listing.params === null) return;

  // Если строка пустая или "{}" — нет параметров
  if (listing.params === "" || listing.params === "{}") {
    recs.push({
      ruleId: "no_params",
      severity: "medium",
      title: "Не заполнены параметры карточки",
      description: "Полнота карточки влияет на ранжирование. Авито даёт приоритет полностью заполненным объявлениям.",
      suggestion: "Заполните все доступные атрибуты категории: состояние, гарантия, тип оборудования",
      field: "params",
      newValue: null,
      impact: "views_increase",
      impactScore: 50,
    });
    return;
  }

  // Мало параметров
  try {
    const params = JSON.parse(listing.params);
    const keys = Object.keys(params);
    if (keys.length < 3) {
      recs.push({
        ruleId: "few_params",
        severity: "low",
        title: "Мало заполненных параметров",
        description: `Заполнено только ${keys.length} параметра. Полная карточка ранжируется выше.`,
        suggestion: "Заполните все доступные атрибуты: вид, состояние, гарантия, категория",
        field: "params",
        newValue: null,
        impact: "views_increase",
        impactScore: 35,
      });
    }
  } catch { /* невалидный JSON */ }
}

function analyzeStats(
  listing: ListingForAnalysis,
  stats: StatsForAnalysis,
  recs: RecommendationItem[]
) {
  // Нет просмотров
  if (stats.views === 0 && stats.days >= 3) {
    recs.push({
      ruleId: "zero_views",
      severity: "critical",
      title: "Ноль просмотров за 3+ дней",
      description: "Объявление не видят. Возможные причины: плохой заголовок, нет фото, объявление скрыто.",
      suggestion: "Проверьте статус объявления. Улучшите заголовок и добавьте фото. Рассмотрите поднятие или бид.",
      field: null,
      newValue: null,
      impact: "views_increase",
      impactScore: 95,
    });
  }

  // Нет контактов при наличии просмотров (порог снижен для B2B — трафик ниже)
  if (stats.views >= 5 && stats.contacts === 0) {
    recs.push({
      ruleId: "zero_contacts",
      severity: "high",
      title: "Нет контактов при наличии просмотров",
      description: `${stats.views} просмотров за ${stats.days} дн., но 0 контактов. Описание или цена не мотивируют к обращению.`,
      suggestion: "Улучшите описание: добавьте документы, условия оплаты, призыв к действию. Проверьте конкурентность цены.",
      field: null,
      newValue: null,
      impact: "contacts_increase",
      impactScore: 85,
    });
  }

  // Низкий CTR (порог снижен для B2B)
  if (stats.views >= 20 && stats.contacts > 0) {
    const ctr = (stats.contacts / stats.views) * 100;
    if (ctr < 2) {
      recs.push({
        ruleId: "low_ctr",
        severity: "medium",
        title: `Низкий CTR (${ctr.toFixed(1)}%)`,
        description: `${stats.views} просмотров, ${stats.contacts} контактов. Для B2B нормальный CTR 3-5%.`,
        suggestion: "Улучшите конверсионные элементы: чёткие условия, документы, скидка при партии, быстрый ответ",
        field: null,
        newValue: null,
        impact: "contacts_increase",
        impactScore: 70,
      });
    }
  }

  // Мало просмотров в день — нужно продвижение
  const viewsPerDay = stats.views / Math.max(stats.days, 1);
  if (stats.days >= 3 && viewsPerDay < 5) {
    recs.push({
      ruleId: "low_views_per_day",
      severity: "high",
      title: `Мало просмотров: ${viewsPerDay.toFixed(1)} в день`,
      description: `Всего ${stats.views} просмотров за ${stats.days} дней (${viewsPerDay.toFixed(1)}/день). Для конкурентной ниши нужно минимум 5-10 в день.`,
      suggestion: "Используйте VAS-продвижение (поднятие, бид). Проверьте заголовок — добавьте ключевые слова, которые ищут покупатели.",
      field: null,
      newValue: null,
      impact: "views_increase",
      impactScore: 80,
    });
  }

  // Много избранного, мало контактов — люди сомневаются
  if (stats.favorites >= 1 && stats.contacts === 0) {
    recs.push({
      ruleId: "favorites_no_contacts",
      severity: "medium",
      title: "Добавляют в избранное, но не обращаются",
      description: `${stats.favorites} в избранном, но 0 обращений. Люди интересуются, но сомневаются — возможно, цена кажется высокой или нет доверия.`,
      suggestion: "Снизьте барьер: укажите точную цену с НДС, добавьте «подготовим КП за 2 часа», предложите осмотр на складе",
      field: null,
      newValue: null,
      impact: "contacts_increase",
      impactScore: 65,
    });
  }
}

// === ADVISORY: напоминания про данные, недоступные через API ===
// Эти рекомендации генерируются ТОЛЬКО если данные не были заполнены вручную
function analyzeApiGaps(listing: ListingForAnalysis, recs: RecommendationItem[]) {
  // Описание не заполнено — напоминаем проверить вручную
  if (!listing.description || listing.description.length === 0) {
    recs.push({
      ruleId: "advisory_check_description",
      severity: "medium",
      title: "Проверьте описание на Авито",
      description: "API Авито не возвращает описание объявлений. Мы не можем проверить его автоматически.",
      suggestion: "Откройте объявление на Авито и убедитесь, что описание содержит: ТТХ (хешрейт, потребление), документы (НДС, ГТД, УПД), условия оплаты (безнал, договор), призыв к действию.",
      field: "description",
      newValue: null,
      impact: "contacts_increase",
      impactScore: 50,
    });
  }

  // Фото не заполнены — напоминаем проверить вручную
  if (listing.photos === null) {
    recs.push({
      ruleId: "advisory_check_photos",
      severity: "medium",
      title: "Проверьте фото на Авито",
      description: "API Авито не возвращает фото. Мы не можем проверить качество и количество фото автоматически.",
      suggestion: "Убедитесь, что есть 5-10 фото: общий вид оборудования, серийные номера, скрины хешрейта с пула, фото в дата-центре, документы.",
      field: "photos",
      newValue: null,
      impact: "views_increase",
      impactScore: 45,
    });
  }

  // Параметры не заполнены — напоминаем проверить вручную
  if (listing.params === null) {
    recs.push({
      ruleId: "advisory_check_params",
      severity: "low",
      title: "Проверьте параметры карточки на Авито",
      description: "API Авито не возвращает параметры. Полнота карточки влияет на ранжирование.",
      suggestion: "Откройте объявление и заполните все доступные атрибуты: состояние, гарантия, тип оборудования, производитель.",
      field: "params",
      newValue: null,
      impact: "views_increase",
      impactScore: 35,
    });
  }
}
