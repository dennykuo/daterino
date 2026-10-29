# Daterino

自訂且可擴充的日期區間選擇器，基於 [daterangepicker](https://www.daterangepicker.com/) 做封裝，支援跨日自動更新、自訂區段與動態更新。

## TODO

- [ ] 更新樣式
- [ ] 完整文件 (目前僅是 JSDoc，不夠直觀)

---

## 🔧 安裝

使用 NPM 或其他包管理工具安裝套件：

```bash
npm install daterino
```

## 🚀 使用方式

### HTML 範例

```html
<input type="text" class="js-datepicker">
```

### 若使用 ESM/模組方式

```html
<script type="module">
    import { daterino } from 'daterino';
    
    const picker = daterino('.js-datepicker', {
      startDate: '2025-01-01',
      endDate: '2025-01-15'
    }, (start, end) => {
      console.log('選擇的日期:', start, end);
    });
    
    // 可由 JS 動態更新日期
    picker.update('2025-02-01', '2025-02-10');
    
    // 動態變更選項（例如切換品牌時改變可選上限），目前的選取會被夾進新的上下限
    picker.setOptions({ maxDate: '2025-02-08' });
    
    // 取得元件狀態
    console.log(picker, picker.data.startDate, picker.data.endDate);
</script>
```

### 若使用 CDN/打包匯出（UMD）：

```html
<script src="/dist/daterino.umd.js"></script>
<script>
  const picker = daterino.daterino('.js-datepicker', {
    startDate: '2025-01-01',
    endDate: '2025-01-15'
  }, (start, end) => {
    console.log('選擇的日期:', start, end);
  });

  // 可由 JS 動態更新日期
  picker.update('2025-02-01', '2025-02-10');

  // 取得元件狀態
  console.log(picker, picker.data.startDate, picker.data.endDate);
</script>
```

## ⚙️ 可用參數

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `startDate` | 初始開始日期（格式同 `dateFormat`） | 6 天前 |
| `endDate` | 初始結束日期（格式同 `dateFormat`） | 今天 |
| `minDate` | 可選最小日期：字串 / `Date` / moment，或回傳上述值的函式 | 無限制 |
| `maxDate` | 可選最大日期：型別同 `minDate`；設為 `false` 時仍以今天為上限 | 今天（跨日自動更新） |
| `ranges` | 快速選擇區段 `{ 名稱: [開始, 結束] }`，或回傳該物件的函式 | 最近 7 天、上週一至日、本月、上個月 |
| `autoApply` | 選完日期是否直接套用；`false` 時顯示「套用 / 取消」按鈕，按下套用才觸發 callback | `false` |
| `minYear` | 可選年份下限 | 無限制 |
| `dateFormat` | 日期格式 | `YYYY-MM-DD` |

其他 [daterangepicker 選項](https://www.daterangepicker.com/#options) 會直接傳入。

上下限預設以「整天」計（下限取當天開始、上限取當天結束）；開啟 `timePicker` 時則保留傳入的精確時間。

### 函式型選項

`minDate`、`maxDate`、`ranges` 傳入函式時，daterino 會在以下時機重新求值：

- 初始化
- 跨日重建：跨過午夜後，第一次點選或聚焦 input（含以 Tab 聚焦），或呼叫 `update()` 時
- 呼叫 `setOptions()` 時

需要「上限永遠是今天 / 昨天」這類隨日期移動的設定時，請傳函式而不是固定字串，否則過午夜後會停在初始化當天。函式依賴的其他狀態（例如目前選的品牌）改變時，請呼叫 `setOptions()` 讓它重新求值：

```js
import moment from 'moment'; // 由呼叫端自行引入；函式也可回傳 Date 或符合 dateFormat 的字串

let allowToday = false; // 例如依目前選的品牌決定能否選到今天

const picker = daterino('.js-datepicker', {
  maxDate: () => (allowToday ? moment() : moment().subtract(1, 'days')),
  ranges: () => ({
    '昨天': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
  }),
});

// 切換品牌後
allowToday = true;
picker.setOptions({}); // 重建元件，讓函式以新的狀態重新求值
```

快速區段會依 daterangepicker 的行為截到 `maxDate`，起點晚於 `maxDate` 的區段則不顯示。

## 🧩 方法

- `update(startDate, endDate)`：更新為傳入的日期；只傳其中一個時另一個維持原值，不觸發 callback
  - 日期須符合 `dateFormat`（嚴格解析），否則拋出錯誤
  - 依元件目前的上下限檢查（跨日時會先重建），超出時拋出錯誤
- `setOptions(partial)`：變更選項（見下方）
- `data`：取得目前元件的狀態物件（selector、startDate、endDate、initDate）

### `setOptions(partial)`

- 合併進目前的選項，未傳入的選項維持原值；`minDate` / `maxDate` / `ranges` 同樣可傳函式
- 元件已初始化時立即重建，並把目前的選取夾進新的上下限，夾回後的日期可由 `data` 取得
- 元件尚未初始化（`daterangepicker:ready` 之前）時只合併選項，初始化時一併套用
- 不觸發 callback（與 `update()` 一致）；重建後會再發出一次 `daterangepicker:ready` 事件（跨日重建亦同）
- 開啟中呼叫時維持開啟，但會捨棄尚未套用的選取
- `startDate` / `endDate` 只是初始值，重建一律沿用目前的選取；要變更選取請用 `update()`
- 變更 `dateFormat` 時，目前的選取會轉成新格式；字串型的 `minDate` / `maxDate` / `ranges` 請一併以新格式傳入
- 重建時會保留呼叫端掛在 input 上的 jQuery data

### 🔍 `data` 結構

`data` 回傳一個物件，包含以下屬性：

| 屬性名        | 說明                       | 資料型別     |
|---------------|----------------------------|--------------|
| `selector`    | 綁定的 DOM 選擇器字串       | `string`     |
| `startDate`   | 目前選取的開始日期（字串） | `string`     |
| `endDate`     | 目前選取的結束日期（字串） | `string`     |
| `initDate`    | 最後一次建立元件時的系統當日（固定為 `YYYY-MM-DD`，跨日判斷依據） | `string`     |

---

## 開發

index.html 是開發用頁面，src/ 是原始碼。

### 運行
```bash
npm run dev
```

## 測試

```bash
npm run test
```

## 打包
```bash
npm run build
```
