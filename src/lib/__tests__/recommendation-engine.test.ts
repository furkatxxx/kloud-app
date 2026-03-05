import { describe, it, expect } from "vitest";
import { analyzeListing } from "@/lib/recommendation-engine";

// Фабрика: хороший листинг (без проблем)
function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-1",
    title: "Antminer T21 190TH б/у НДС ГТД безнал в наличии партия",
    description: "Подробное описание с документами НДС ГТД счёт-фактура. Безнал, договор. Хешрейт 190TH/s, потребление 3610W. Пишите для заказа.",
    price: 110000,
    quantity: 30,
    status: "active",
    category: "Оборудование",
    params: JSON.stringify({ "Состояние": "Б/у", "Гарантия": "3 мес", "Тип": "ASIC" }),
    photos: JSON.stringify(["photo1.jpg", "photo2.jpg", "photo3.jpg"]),
    ...overrides,
  };
}

function makeStats(overrides: Record<string, unknown> = {}) {
  return { views: 50, contacts: 3, favorites: 2, days: 7, ...overrides };
}

// --- ЗАГОЛОВОК ---

describe("analyzeListing — заголовок", () => {
  it("ругается на короткий заголовок (< 20 символов)", () => {
    const recs = analyzeListing(makeListing({ title: "Antminer T21" }), null);
    expect(recs.some((r) => r.ruleId === "title_too_short")).toBe(true);
  });

  it("ругается на отсутствие НДС/ГТД", () => {
    const recs = analyzeListing(
      makeListing({ title: "Antminer T21 190TH б/у безнал в наличии партия" }),
      null
    );
    expect(recs.some((r) => r.ruleId === "title_no_docs")).toBe(true);
  });

  it("ругается на отсутствие 'безнал'", () => {
    const recs = analyzeListing(
      makeListing({ title: "Antminer T21 190TH б/у НДС ГТД в наличии партия" }),
      null
    );
    expect(recs.some((r) => r.ruleId === "title_no_beznal")).toBe(true);
  });

  it("ругается на спам (!!!)", () => {
    const recs = analyzeListing(
      makeListing({ title: "ANTMINER T21!! НДС ГТД безнал в наличии партия" }),
      null
    );
    expect(recs.some((r) => r.ruleId === "title_spam")).toBe(true);
  });

  it("НЕ ругается на хороший заголовок", () => {
    const recs = analyzeListing(makeListing(), null);
    const titleRecs = recs.filter((r) => r.field === "title");
    expect(titleRecs).toHaveLength(0);
  });
});

// --- ОПИСАНИЕ ---

describe("analyzeListing — описание", () => {
  it("пропускает пустое описание (нет данных из API)", () => {
    const recs = analyzeListing(makeListing({ description: "" }), null);
    expect(recs.some((r) => r.ruleId === "desc_too_short")).toBe(false);
  });

  it("ругается на короткое описание (< 100 символов)", () => {
    const recs = analyzeListing(makeListing({ description: "Продаю майнер. Хорошее состояние." }), null);
    expect(recs.some((r) => r.ruleId === "desc_too_short")).toBe(true);
  });

  it("ругается на отсутствие документов в описании", () => {
    const desc = "Продаю оборудование в отличном состоянии. Хешрейт 190TH/s. Потребление 3610W. Отличный вариант для дата-центра. Пишите для покупки.";
    const recs = analyzeListing(makeListing({ description: desc }), null);
    expect(recs.some((r) => r.ruleId === "desc_no_docs")).toBe(true);
  });

  it("НЕ ругается на хорошее описание", () => {
    const recs = analyzeListing(makeListing(), null);
    const descRecs = recs.filter((r) => r.field === "description");
    expect(descRecs).toHaveLength(0);
  });
});

// --- ЦЕНА ---

describe("analyzeListing — цена", () => {
  it("ругается на нулевую цену", () => {
    const recs = analyzeListing(makeListing({ price: 0 }), null);
    expect(recs.some((r) => r.ruleId === "price_zero")).toBe(true);
  });

  it("ругается на подозрительно низкую цену", () => {
    const recs = analyzeListing(makeListing({ price: 5000 }), null);
    expect(recs.some((r) => r.ruleId === "price_suspicious")).toBe(true);
  });

  it("НЕ ругается на нормальную цену", () => {
    const recs = analyzeListing(makeListing({ price: 110000 }), null);
    const priceRecs = recs.filter((r) => r.field === "price");
    expect(priceRecs).toHaveLength(0);
  });
});

// --- СТАТИСТИКА ---

describe("analyzeListing — статистика", () => {
  it("ругается на ноль просмотров за 3+ дней", () => {
    const recs = analyzeListing(makeListing(), makeStats({ views: 0, contacts: 0, days: 5 }));
    expect(recs.some((r) => r.ruleId === "zero_views")).toBe(true);
  });

  it("ругается на ноль контактов при наличии просмотров", () => {
    const recs = analyzeListing(makeListing(), makeStats({ views: 10, contacts: 0 }));
    expect(recs.some((r) => r.ruleId === "zero_contacts")).toBe(true);
  });

  it("ругается на низкий CTR", () => {
    const recs = analyzeListing(makeListing(), makeStats({ views: 100, contacts: 1, days: 7 }));
    expect(recs.some((r) => r.ruleId === "low_ctr")).toBe(true);
  });

  it("ругается на мало просмотров в день", () => {
    const recs = analyzeListing(makeListing(), makeStats({ views: 10, contacts: 1, days: 7 }));
    expect(recs.some((r) => r.ruleId === "low_views_per_day")).toBe(true);
  });

  it("ругается когда добавляют в избранное но не обращаются", () => {
    const recs = analyzeListing(makeListing(), makeStats({ views: 10, contacts: 0, favorites: 3 }));
    expect(recs.some((r) => r.ruleId === "favorites_no_contacts")).toBe(true);
  });
});

// --- API-GAP ADVISORY ---

describe("analyzeListing — advisory напоминания", () => {
  it("напоминает проверить описание если пустое", () => {
    const recs = analyzeListing(makeListing({ description: "" }), null);
    expect(recs.some((r) => r.ruleId === "advisory_check_description")).toBe(true);
  });

  it("напоминает проверить фото если null", () => {
    const recs = analyzeListing(makeListing({ photos: null }), null);
    expect(recs.some((r) => r.ruleId === "advisory_check_photos")).toBe(true);
  });

  it("НЕ напоминает про фото если есть данные", () => {
    const recs = analyzeListing(makeListing(), null);
    expect(recs.some((r) => r.ruleId === "advisory_check_photos")).toBe(false);
  });

  it("напоминает проверить параметры если null", () => {
    const recs = analyzeListing(makeListing({ params: null }), null);
    expect(recs.some((r) => r.ruleId === "advisory_check_params")).toBe(true);
  });
});
