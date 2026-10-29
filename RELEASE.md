# 🚀 發佈流程指引 - daterino

記錄如何發佈此套件到 npm。

---

## ✅ 發佈前檢查

- [ ] 已完成所有功能與測試
- [ ] 已更新版本號（遵循 SemVer）
- [ ] 已執行 `npm run build`
- [ ] 已確認 `dist/` 產物正確
- [ ] 已執行 `npm run test` 全部通過
- [ ] 已更新 `CHANGELOG.md`（如有）

---

## 📦 發佈步驟

### 1. 更新版本號

```bash
npm version patch # 或 minor (次版號) / major (主版號)
```

### 2. 推送變更與標籤

```bash
git push
git push --tags
```

### 3. 發佈至 npm

```bash
npm publish
```

---

## 📚 附註

- 套件名稱：`daterino`
- 特色：日期區間選擇器、跨日重建、自訂區段、動態更新
- 使用技術：Vite、JSDoc、Vitest、GitHub Actions 自動部署 docs
