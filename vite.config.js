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
  },
});