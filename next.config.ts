import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Вимикаємо PWA в dev-режимі, щоб не кешувало баги
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Тут будуть інші налаштування, якщо знадобляться
};

export default withPWA(nextConfig);