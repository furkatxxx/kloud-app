import { memo } from "react";
import Link from "next/link";

const statusColors = {
  ok: "var(--success)",
  warning: "var(--warning)",
  critical: "var(--destructive)",
};

interface StatusCardProps {
  title: string;
  subtitle?: string;
  status: keyof typeof statusColors;
  price?: number;
  views?: number;
  contacts?: number;
  href: string;
}

export default memo(function StatusCard({
  title,
  subtitle,
  status,
  price,
  views,
  contacts,
  href,
}: StatusCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl p-3 sm:p-4 border transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm leading-tight pr-2">{title}</h3>
        <span
          className="w-3 h-3 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: statusColors[status] }}
        />
      </div>

      {subtitle && (
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          {subtitle}
        </p>
      )}

      {price !== undefined && (
        <p className="text-base sm:text-lg font-bold mb-2">
          {price.toLocaleString("ru-RU")} &#8381;
        </p>
      )}

      {(views !== undefined || contacts !== undefined) && (
        <div className="flex gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {views !== undefined && <span>{views} просм.</span>}
          {contacts !== undefined && <span>{contacts} конт.</span>}
        </div>
      )}
    </Link>
  );
});
