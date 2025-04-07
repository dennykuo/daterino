# Date Range Picker

自訂且可擴充的日期區間選擇器，基於 [daterangepicker](https://www.daterangepicker.com/) 做封裝，支援跨日自動更新、自訂區段與動態更新。

## 🔧 安裝

使用 NPM 或其他包管理工具安裝套件：

```bash
npm install daterino
```

## 🚀 使用方式

### HTML 範例

```html
<input type="text" class="js-datepicker" />
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

| 參數 | 說明 | 預設值          |
|------|------|--------------|
| `startDate` | 初始開始日期 | 7 天前         |
| `endDate` | 初始結束日期 | 昨天           |
| `minDate` | 可選最小日期 | 無限制          |
| `maxDate` | 可選最大日期 | 昨天           |
| `minYear` | 可選年份下限 | 無限制          |
| `dateFormat` | 日期格式 | `YYYY-MM-DD` |

## 🧩 方法

- `update(startDate, endDate)`：更新為傳入的日期
- `data`：取得目前元件的狀態物件（selector、startDate、endDate）

### 🔍 `data` 結構

`data` 回傳一個物件，包含以下屬性：

| 屬性名        | 說明                       | 資料型別     |
|---------------|----------------------------|--------------|
| `selector`    | 綁定的 DOM 選擇器字串       | `string`     |
| `startDate`   | 目前選取的開始日期（字串） | `string`     |
| `endDate`     | 目前選取的結束日期（字串） | `string`     |
| `initDate`    | 最後初始化的系統當日       | `string`     |