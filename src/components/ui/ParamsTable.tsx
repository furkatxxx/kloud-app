// Таблица параметров объявления (из JSON)
interface ParamsTableProps {
  paramsJson: string | null;
}

export default function ParamsTable({ paramsJson }: ParamsTableProps) {
  if (!paramsJson) return null;

  let params: Record<string, string>;
  try {
    params = JSON.parse(paramsJson);
  } catch {
    return null;
  }

  const entries = Object.entries(params);
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <td
                className="px-4 py-2 font-medium"
                style={{ color: "var(--muted-foreground)", width: "40%" }}
              >
                {key}
              </td>
              <td className="px-4 py-2">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
