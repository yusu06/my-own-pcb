import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/my-own-pcb/",
  plugins: [
    VitePWA({
      // 업데이트는 자동 적용하지 않고 배너로 묻는다 (단원 진행 중 화면이 바뀌지 않게)
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "icon.svg"],
      manifest: {
        name: "내 하드웨어 공방",
        short_name: "하드웨어 공방",
        description: "의뢰서로 배우는 회로 설계 공부 앱",
        lang: "ko",
        start_url: "/my-own-pcb/",
        scope: "/my-own-pcb/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1b2a41",
        background_color: "#15171c",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
  ],
});
