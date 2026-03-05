import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем загрузку картинок с Авито
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.avito.st",
      },
    ],
  },
};

export default nextConfig;
