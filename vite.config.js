import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'; // 透過 JS 注入 CSS 檔案

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],

  // 打包配置
  build: {
    lib: {
      entry: './src/index.js', // 主入口
      name: 'daterino',  // 全域變數名稱 (UMD)
      fileName: (format) => `daterino.${format}.js`,
      formats: ['umd', 'es'], // 輸出 UMD 與 ES Module
    },
    rollupOptions: {
      // UMD 模式用
      output: {
        inlineDynamicImports: true, // 禁用 code splitting，讓依賴合併打包
      }
    }
  },

  // vitest 測試框架用
  test: {
    dir: './test',
    globals: true,
    environment: 'jsdom',
    // 固定時區為 UTC+8：new Date('YYYY-MM-DD') 會以 UTC 解析，這類「差一天」的錯誤只在非 UTC 時區重現，
    // 不固定的話在 UTC 的 CI 上相關測試會假性通過
    env: { TZ: 'Asia/Taipei' },
  },
});