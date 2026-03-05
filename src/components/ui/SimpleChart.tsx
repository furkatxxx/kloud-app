// Простой SVG-график без зависимостей
interface DataPoint {
  label: string;
  value: number;
}

interface SimpleChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

export default function SimpleChart({
  data,
  color = "var(--primary)",
  height = 200,
}: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm rounded-lg border"
        style={{ height, color: "var(--muted-foreground)", borderColor: "var(--border)" }}
      >
        Нет данных
      </div>
    );
  }

  const padding = { top: 20, right: 10, bottom: 30, left: 45 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  // Точки для линии
  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartHeight - (d.value / maxValue) * chartHeight,
    ...d,
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Горизонтальные линии сетки (5 уровней)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((maxValue / 4) * i);
    const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
    return { y, value };
  });

  // Подписи по оси X (показываем каждую N-ю)
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
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

      {/* Область под графиком */}
      <polygon
        points={`${points[0].x},${padding.top + chartHeight} ${polylinePoints} ${points[points.length - 1].x},${padding.top + chartHeight}`}
        fill={color}
        opacity="0.1"
      />

      {/* Линия графика */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Точки */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}

      {/* Подписи оси X */}
      {points.map(
        (p, i) =>
          i % labelStep === 0 && (
            <text
              key={i}
              x={p.x}
              y={height - 5}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {p.label}
            </text>
          )
      )}
    </svg>
  );
}
