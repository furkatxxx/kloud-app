import { memo } from "react";

// Карточка быстрой метрики (для дашборда)
interface QuickStatProps {
  label: string;
  value: string;
}

export default memo(function QuickStat({ label, value }: QuickStatProps) {
  return (
    <div
      className="rounded-xl p-3 sm:p-4 border transition-colors duration-150"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs mb-1 truncate" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
    </div>
  );
});
