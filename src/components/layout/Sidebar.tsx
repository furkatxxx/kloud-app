"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Дашборд", icon: "📊" },
  { href: "/listings", label: "Объявления", icon: "📋" },
  { href: "/ads", label: "Реклама", icon: "📣" },
  { href: "/analytics", label: "Аналитика", icon: "📈" },
  { href: "/settings", label: "Настройки", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Закрываем меню при навигации
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Закрываем при Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* Мобильная шапка с бургер-кнопкой */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 border-b lg:hidden z-40"
        style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: isOpen ? "var(--muted)" : "transparent" }}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {isOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight">KLOUD</h1>
        <div className="w-10" /> {/* Балансирующий спейсер */}
      </header>

      {/* Оверлей для мобильного меню */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Сайдбар — десктоп: всегда виден, мобильный: выезжает слева */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-60 flex flex-col border-r z-50
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <h1 className="text-xl font-bold tracking-tight">KLOUD</h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Управление Авито
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="p-4 border-t text-xs"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          KLOUD v0.3.0
        </div>
      </aside>
    </>
  );
}
