"use client";

import { useEffect, useState } from "react";
import AutoRulesPanel from "@/components/ui/AutoRulesPanel";
import { useAutoRules } from "@/hooks/useAutoRules";

interface SettingsData {
  avitoClientId: string | null;
  avitoClientSecret: string | null;
  avitoUserId: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  monitorIntervalMin: number;
  monitorEnabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tgStatus, setTgStatus] = useState("");
  const { rules, createRule, toggleRule, deleteRule } = useAutoRules();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const body: Record<string, string | number | boolean> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });
    body.monitorIntervalMin = Number(body.monitorIntervalMin);
    body.monitorEnabled = formData.has("monitorEnabled");

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage("Настройки сохранены");
      const updated = await fetch("/api/settings").then((r) => r.json());
      setSettings(updated);
    } else {
      setMessage("Ошибка сохранения");
    }
    setSaving(false);
  }

  if (!settings) {
    return (
      <div className="animate-slide-up max-w-2xl space-y-6">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-slide-up">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Настройки</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Avito API */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Avito API</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
            Получите ключи на{" "}
            <a
              href="https://www.avito.ru/professionals/api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors duration-150"
              style={{ color: "var(--primary)" }}
            >
              avito.ru/professionals/api
            </a>
          </p>
          <div className="space-y-3">
            <Field
              label="Client ID"
              name="avitoClientId"
              defaultValue={settings.avitoClientId || ""}
              placeholder="Введите Client ID"
            />
            <Field
              label="Client Secret"
              name="avitoClientSecret"
              defaultValue={settings.avitoClientSecret || ""}
              placeholder="Введите Client Secret"
              type="password"
            />
            <Field
              label="User ID"
              name="avitoUserId"
              defaultValue={settings.avitoUserId || ""}
              placeholder="Ваш ID пользователя на Авито"
            />
          </div>
        </section>

        {/* Бизнес 360 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Бизнес 360</h2>
          <div
            className="rounded-lg p-3 sm:p-4 border"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: "#f0fdf4", color: "var(--success)" }}
              >
                Подключён
              </span>
              <span className="text-sm font-medium">Avito Pro — Бизнес 360</span>
            </div>
            <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
              Расширенная аналитика, бейдж «Бизнес», рекламные форматы, CRM-интеграция
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span>Компания: ООО Кубера</span>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://pro.avito.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors duration-150"
                style={{ color: "var(--primary)" }}
              >
                Управление на pro.avito.ru ↗
              </a>
            </div>
          </div>
        </section>

        {/* Telegram */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Telegram-уведомления</h2>
          <div className="space-y-3">
            <Field
              label="Bot Token"
              name="telegramBotToken"
              defaultValue={settings.telegramBotToken || ""}
              placeholder="123456:ABC-..."
              type="password"
            />
            <Field
              label="Chat ID"
              name="telegramChatId"
              defaultValue={settings.telegramChatId || ""}
              placeholder="ID чата для уведомлений"
            />
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setTgStatus("Отправка...");
                  try {
                    const res = await fetch("/api/telegram/test", { method: "POST" });
                    const data = await res.json();
                    setTgStatus(data.ok ? "Сообщение отправлено!" : `Ошибка: ${data.error}`);
                  } catch {
                    setTgStatus("Ошибка сети");
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
              >
                Тест Telegram
              </button>
              {tgStatus && (
                <span
                  className="text-xs animate-fade-in"
                  style={{ color: tgStatus.includes("Ошибка") ? "var(--destructive)" : "var(--success)" }}
                >
                  {tgStatus}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Мониторинг */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Мониторинг</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                Интервал проверки
              </label>
              <select
                name="monitorIntervalMin"
                defaultValue={settings.monitorIntervalMin}
                className="w-full px-3 py-2 rounded-lg border text-sm transition-colors duration-150"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                }}
              >
                <option value={15}>Каждые 15 минут</option>
                <option value={30}>Каждые 30 минут</option>
                <option value={60}>Каждый час</option>
                <option value={240}>Каждые 4 часа</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="monitorEnabled"
                id="monitorEnabled"
                defaultChecked={settings.monitorEnabled}
                className="w-4 h-4"
              />
              <label htmlFor="monitorEnabled" className="text-sm">
                Включить автоматический мониторинг
              </label>
            </div>
          </div>
        </section>

        {/* Кнопка сохранения */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 active:scale-95 w-full sm:w-auto"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {message && (
            <span
              className="text-sm animate-fade-in"
              style={{ color: message.includes("Ошибка") ? "var(--destructive)" : "var(--success)" }}
            >
              {message}
            </span>
          )}
        </div>
      </form>

      {/* Автоправила */}
      <div className="mt-10">
        <AutoRulesPanel
          rules={rules}
          onCreateRule={createRule}
          onToggleRule={toggleRule}
          onDeleteRule={deleteRule}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm transition-colors duration-150"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--border)",
        }}
      />
    </div>
  );
}
