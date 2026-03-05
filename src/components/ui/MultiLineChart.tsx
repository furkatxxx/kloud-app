import { memo } from "react";

// Мульти-линейный SVG-график без зависимостей
interface DataSeries {
  label: string;
  color: string;
  data: number[];
}

interface MultiLineChartProps {
  labels: string[];       // Подписи оси X (даты)
  series: DataSeries[];   // Набор линий
  height?: number;
}

export default memo(function MultiLineChart({
  labels,
  series,
  height = 240,
}: MultiLineChartProps) {
  if (labels.length === 0 || series.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm rounded-lg border"
        style={{ height, color: "var(--muted-foreground)", borderColor: "var(--border)" }}
      >
        Нет данных для отображения
      </div>
    );
  }

  const padding = { top: 20, right: 16, bottom: 32, left: 50 };
  const width = 700;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Максимальное значение по всем сериям
  const allValues = series.flatMap((s) => s.data);
  const maxValue = Math.max(...allValues, 1);

  const stepX = chartWidth / Math.max(labels.length - 1, 1);

  // Координаты точек для каждой серии
  const seriesPoints = series.map((s) =>
    s.data.map((value, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
      value,
    }))
  );

  // Горизонтальные линии сетки (5 уровней)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((maxValue / 4) * i);
    const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
    return { y, value };
  });

  // Подписи оси X — каждую N-ю
  const labelStep = Math.max(1, Math.floor(labels.length / 7));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {/* Сетка */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="var(--border)"
              strokeDasharray="4"
            />
            <text
              x={padding.left - 8}
              y={line.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {line.value}
            </text>
          </g>
        ))}

        {/* Линии данных */}
        {seriesPoints.map((points, si) => {
          const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
          const color = series[si].color;

          return (
            <g key={si}>
              {/* Область под линией */}
              <polygon
                points={`${points[0].x},${padding.top + chartHeight} ${polyline} ${points[points.length - 1].x},${padding.top + chartHeight}`}
                fill={color}
                opacity="0.08"
              />
              {/* Линия */}
              <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Точки */}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
              ))}
            </g>
          );
        })}

        {/* Подписи оси X */}
        {labels.map((label, i) =>
          i % labelStep === 0 ? (
            <text
              key={i}
              x={padding.left + i * stepX}
              y={height - 5}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          ) : null
        )}
      </svg>

      {/* Легенда */}
      <div className="flex gap-4 mt-2 justify-center">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
            />
            <span style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
