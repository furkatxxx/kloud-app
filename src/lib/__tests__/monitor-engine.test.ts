import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем Prisma ДО импорта тестируемого модуля
vi.mock("@/lib/db", () => ({
  prisma: {
    listing: {
      findMany: vi.fn(),
    },
    monitorAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { runMonitorCheck, saveAlerts } from "@/lib/monitor-engine";
import { prisma } from "@/lib/db";

const mockFindMany = prisma.listing.findMany as ReturnType<typeof vi.fn>;
const mockAlertFindFirst = prisma.monitorAlert.findFirst as ReturnType<typeof vi.fn>;
const mockAlertCreate = prisma.monitorAlert.create as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runMonitorCheck", () => {
  it("создаёт алерт listing_hidden для скрытых объявлений", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", title: "Тест", status: "hidden", price: 100000, lastSyncAt: new Date(), stats: [] },
    ]);

    const alerts = await runMonitorCheck();
    expect(alerts.some((a) => a.type === "listing_hidden")).toBe(true);
  });

  it("создаёт алерт no_views если 0 просмотров за 3 дня", async () => {
    mockFindMany.mockResolvedValue([{
      id: "1", title: "Тест", status: "active", price: 100000,
      lastSyncAt: new Date(),
      stats: [
        { views: 0, contacts: 0, favorites: 0, date: new Date() },
        { views: 0, contacts: 0, favorites: 0, date: new Date() },
        { views: 0, contacts: 0, favorites: 0, date: new Date() },
      ],
    }]);

    const alerts = await runMonitorCheck();
    expect(alerts.some((a) => a.type === "no_views")).toBe(true);
  });

  it("создаёт алерт price_zero если цена = 0", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", title: "Тест", status: "active", price: 0, lastSyncAt: new Date(), stats: [] },
    ]);

    const alerts = await runMonitorCheck();
    expect(alerts.some((a) => a.type === "price_zero")).toBe(true);
  });

  it("НЕ создаёт алертов для здорового объявления", async () => {
    mockFindMany.mockResolvedValue([{
      id: "1", title: "Тест", status: "active", price: 100000,
      lastSyncAt: new Date(),
      stats: [
        { views: 10, contacts: 1, favorites: 1, date: new Date() },
        { views: 12, contacts: 2, favorites: 0, date: new Date() },
        { views: 8, contacts: 1, favorites: 1, date: new Date() },
      ],
    }]);

    const alerts = await runMonitorCheck();
    expect(alerts).toHaveLength(0);
  });
});

describe("saveAlerts", () => {
  it("создаёт новый алерт если нет дубликата", async () => {
    mockAlertFindFirst.mockResolvedValue(null);
    mockAlertCreate.mockResolvedValue({});

    const created = await saveAlerts([
      { listingId: "1", type: "price_zero", severity: "critical", message: "Тест" },
    ]);

    expect(created).toBe(1);
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
  });

  it("НЕ дублирует существующий нерешённый алерт", async () => {
    mockAlertFindFirst.mockResolvedValue({ id: "existing" });

    const created = await saveAlerts([
      { listingId: "1", type: "price_zero", severity: "critical", message: "Тест" },
    ]);

    expect(created).toBe(0);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });
});
