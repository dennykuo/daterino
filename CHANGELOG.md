# 📦 CHANGELOG - daterino

## [0.0.0] - 2025-04-07

初始版本發佈！

### 新增
- 封裝基於 `daterangepicker` 的日期區間選擇元件
- 支援 `startDate` / `endDate` / `minDate` / `maxDate` / `minYear` 等初始化參數
- 提供 `.update()` 方法動態更新日期
- 自動判斷跨日並重建選擇器
- 支援多個實例與 selector
- 提供 `daterangepicker:ready` 事件，讓外部可接收初始化完成通知
- 整合範圍選項（本月、上個月、上週等）
- 格式合法性與範圍驗證機制（避免錯誤更新）
- 透過 `vite` 打包支援 UMD + ES Module
- 透過 JS 自動注入 CSS，不需手動引入
- 撰寫完整 `README.md` 說明文件
- 加入 JSDoc 註解與 GitHub Actions 自動部署文件
- 使用 `vitest` 撰寫單元測試

---

