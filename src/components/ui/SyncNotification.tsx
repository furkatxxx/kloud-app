import type { SyncResult } from "@/lib/types";

// Уведомление о результате синхронизации
interface SyncNotificationProps {
  result: SyncResult | null;
  error: string | null;
}

export default function SyncNotification({ result, error }: SyncNotificationProps) {
  if (!result && !error) return null;

  const isError = !!error;
  const message = isError
    ? `Ошибка: ${error}`
    : result
      ? formatResult(result)
      : "";

  return (
    <div
      className="mb-4 px-4 py-3 rounded-lg text-sm"
      style={{
        backgroundColor: isError ? "#fef2f2" : "#f0fdf4",
        color: isError ? "var(--destructive)" : "var(--success)",
      }}
    >
      {message}
    </div>
  );
}

function formatResult(result: SyncResult): string {
  if (result.message) return result.message;

  const parts = [];
  if (result.added > 0) parts.push(`+${result.added} новых`);
  if (result.updated > 0) parts.push(`${result.updated} обновлено`);
  if (parts.length === 0) parts.push("нет изменений");

  return `Синхронизировано ${result.synced} шт. (${parts.join(", ")})`;
}
