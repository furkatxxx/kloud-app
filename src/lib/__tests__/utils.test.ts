import { describe, it, expect } from "vitest";
import { getListingStatus, formatLastSync, formatPrice } from "@/lib/utils";

describe("getListingStatus", () => {
  it("возвращает 'critical' если есть активные алерты", () => {
    const listing = { _count: { monitorAlerts: 2, recommendations: 0 } } as any;
    expect(getListingStatus(listing)).toBe("critical");
  });

  it("возвращает 'warning' если есть рекомендации но нет алертов", () => {
    const listing = { _count: { monitorAlerts: 0, recommendations: 3 } } as any;
    expect(getListingStatus(listing)).toBe("warning");
  });

  it("возвращает 'ok' если нет ни алертов ни рекомендаций", () => {
    const listing = { _count: { monitorAlerts: 0, recommendations: 0 } } as any;
    expect(getListingStatus(listing)).toBe("ok");
  });

  it("приоритет алертов над рекомендациями", () => {
    const listing = { _count: { monitorAlerts: 1, recommendations: 5 } } as any;
    expect(getListingStatus(listing)).toBe("critical");
  });
});

describe("formatLastSync", () => {
  it("возвращает 'не синхронизировано' для null", () => {
    expect(formatLastSync(null)).toBe("не синхронизировано");
  });

  it("форматирует дату с цифрами", () => {
    const result = formatLastSync("2026-02-26T10:30:00Z");
    expect(result).toMatch(/\d/);
  });
});

describe("formatPrice", () => {
  it("форматирует число с разделителями", () => {
    const result = formatPrice(120000);
    expect(result).toContain("120");
    expect(result).toContain("000");
  });

  it("возвращает '0' для нуля", () => {
    expect(formatPrice(0)).toBe("0");
  });

  it("форматирует маленькое число", () => {
    const result = formatPrice(999);
    expect(result).toBe("999");
  });
});
