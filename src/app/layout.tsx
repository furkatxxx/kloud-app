import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Providers from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "KLOUD — Управление Авито",
  description: "Мониторинг, аналитика и управление объявлениями на Авито",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <Sidebar />
          <main className="min-h-screen p-4 pt-18 sm:p-6 sm:pt-20 lg:pt-6 lg:ml-60">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
