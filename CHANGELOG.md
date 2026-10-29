# 📦 CHANGELOG - daterino

## [0.1.0] - 2026-10-29

### ⚠️ Breaking：預設值變更

未明確帶入下列選項的呼叫端，行為會改變：

- `startDate` 預設由 7 天前改為 6 天前，`endDate` 由昨天改為今天（預設選取改為「含今天的最近 7 天」）
- `maxDate` 預設由昨天改為今天
- `autoApply` 預設由 `true` 改為 `false`：選完日期要按「套用」才會生效並觸發 callback
- 預設快速區段「最近 7 天」改為 6 天前至今天
- `update()` 改為依 `dateFormat` 嚴格解析，格式不符（例如 `2025-1-5`、`2025-01-01abc`）會拋錯
- `data.initDate` 固定為 `YYYY-MM-DD`，不再跟著 `dateFormat`

### 新增

- `minDate` / `maxDate` 接受 `string | Date | moment`，或回傳上述值的函式；`ranges` 接受物件，或回傳物件的函式。函式型選項在初始化、跨日重建與 `setOptions()` 時重新求值，`update()` 也以求值結果檢查上下限
- `setOptions(partial)`：合併選項並重建元件，目前的選取會被夾進新的上下限；ready 前呼叫則待初始化時套用；不觸發 callback
- 套用 / 取消按鈕改為中文

### 修正

- 跨日重建不再把呼叫端自訂的 `maxDate` 蓋回預設值；預設的 `maxDate` 與快速區段改為跨日自動更新
- 跨日重建保留使用者目前的選取（先前會重設回初始化時的日期）
- 跨日重建後顯示新的實例（先前對已移除的舊實例呼叫 `show()`）
- 跨日檢查擴及 focus / click（例如以 Tab 聚焦）與 `update()`，先前只在 mousedown 時檢查
- 開啟中重建（跨日或 `setOptions()`）時先關閉舊實例並捨棄未套用的選取；先前舊實例留著，之後點外部會把未套用的選取送進 callback，並把舊區間寫回 input
- `dateFormat` 含時間時，同一天內點選會被誤判為跨日而重建
- 初始化時 `endDate` 超過 `maxDate` 會被 daterangepicker 截斷，`data` 卻留著原值，導致之後 `update()` 相同日期時被略過；現在 `data` 會同步夾回
- 上下限改依 `dateFormat` 以當地時間解析：先前用 `new Date('YYYY-MM-DD')` 會以 UTC 解析，在 UTC+8 上下限當天可能被誤判為不可選
- `update()` 依 `dateFormat` 解析日期（先前非 ISO 格式會被誤判）
- `update()` 依元件目前的上下限檢查，先前檢查通過的日期仍可能被元件默默截斷
- 開啟中呼叫 `update()` 時，關閉會觸發 callback、按取消會把元件還原成舊區間
- `update()` 只傳其中一個日期時，元件的另一個日期會變成 `Invalid date`
- `update()` 傳入的日期被 daterangepicker 調整時（例如結束早於開始），`data` 與元件不一致
- 上下限改由 daterangepicker 的 `minDate` / `maxDate` 統一處理：`maxDate` 設為 `false` 時，快速區段也截到今天（先前只停用日期格）；呼叫端自訂 `isInvalidDate` 不再連帶取消上下限
- 開啟 `timePicker` 時保留 `minDate` / `maxDate` 的精確時間，不再截成整天
- `setOptions()` 變更 `dateFormat` 時，目前的選取會轉成新格式
- 重建時不再清掉呼叫端掛在 input 上的 jQuery data

---

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

