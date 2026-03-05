// Общие типы для фронтенда и API

// Объявление (как возвращается из GET /api/avito/listings)
export interface ListingDTO {
  id: string;
  avitoId: string;
  avitoUrl: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  category: string | null;
  params: string | null;
  photos: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    recommendations: number;
    monitorAlerts: number;
  };
}

// Статус объявления для UI (цвет индикатора)
export type ListingStatus = "ok" | "warning" | "critical";

// Результат синхронизации POST /api/avito/sync
export interface SyncResult {
  ok: boolean;
  synced: number;
  total: number;
  added: number;
  updated: number;
  results?: { id: string; title: string; action: string }[];
  error?: string;
  message?: string;
}

// Ответ GET /api/avito/listings с пагинацией
export interface ListingsResponse {
  items: ListingDTO[];
  total: number;
  page: number;
  limit: number;
}

// Дневная статистика (из DailyStat)
export interface DailyStatDTO {
  id: string;
  listingId: string;
  date: string;
  views: number;
  contacts: number;
  favorites: number;
  position: number | null;
  ctr: number | null;
  source: string;
}

// Ответ GET /api/avito/stats
export interface StatsResponse {
  totals: {
    views: number;
    contacts: number;
    favorites: number;
  };
  daily: DailyStatDTO[];
}

// Ответ GET /api/avito/analytics
export interface AnalyticsDailyDTO {
  date: string;
  views: number;
  contacts: number;
  favorites: number;
}

export interface AnalyticsListingDTO {
  id: string;
  title: string;
  price: number;
  status: string;
  views: number;
  contacts: number;
  favorites: number;
  ctr: number;
}

export interface AnalyticsResponse {
  totals: {
    views: number;
    contacts: number;
    favorites: number;
  };
  daily: AnalyticsDailyDTO[];
  perListing: AnalyticsListingDTO[];
  period: number;
}

// A/B тестирование
export interface ABVariantDTO {
  id: string;
  testId: string;
  label: string;
  value: string;
  views: number;
  contacts: number;
  favorites: number;
  activeDays: number;
  activeFrom: string | null;
  activeTo: string | null;
}

export interface ABTestDTO {
  id: string;
  listingId: string;
  field: string;
  status: string; // draft, active, completed
  rotationType: string;
  rotationDays: number;
  currentVariant: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  variants: ABVariantDTO[];
}

// Автоправила
export interface AutoRuleDTO {
  id: string;
  name: string;
  enabled: boolean;
  condition: string; // JSON
  action: string;    // JSON
  cooldownMin: number;
  lastFiredAt: string | null;
  createdAt: string;
}
