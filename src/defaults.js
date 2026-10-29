// 參數預設值處理
import moment from "moment/moment";

/**
 * 套用套件的預設 options 設定
 * @param {Object} [options={}] - 使用者傳入的自訂參數
 * @param {string} [options.dateFormat] - 日期格式（預設為 'YYYY-MM-DD'）
 * @param {string} [options.startDate] - 起始日期（若未提供則預設為 6 天前，與今天合計 7 天）
 * @param {string} [options.endDate] - 結束日期（若未提供則預設為今天）
 * @param {string|Date|moment.Moment|Function|false} [options.minDate] - 最小可選日期（或回傳日期的函式）
 * @param {string|Date|moment.Moment|Function|false} [options.maxDate] - 最大可選日期（或回傳日期的函式），預設為今天
 * @param {number|null} [options.minYear] - 最小可選年份
 * @param {Object|Function} [options.ranges] - 使用者自訂的快速選擇區段（或回傳區段物件的函式）
 * @param {boolean} [options.autoApply] - 選完日期是否直接套用（預設為 false）
 * @returns {Object} - 合併後的完整 options 物件
 */
export const applyDefaultOptions = (options = {}) => {
  const dateFormat = options.dateFormat || 'YYYY-MM-DD'; // 日期格式

  return {
    dateFormat: dateFormat, // 日期格式
    startDate: moment().subtract(6, 'days').format(dateFormat), // 起始日期，預設為 6 天前（含今天共 7 天）
    endDate: moment().format(dateFormat), // 結束日期，預設為今天
    minDate: false, // 可選擇的最小日期，預設為 false (設為 null，月份前進後退的箭頭會失效)
    // 可選擇的最大日期，預設為今天
    // 函式型：每次建立元件時才求值，跨日重建後會自動變成新的今天（固定字串會停在初始化當天）；
    // 回傳 moment 而非字串，之後以 setOptions 變更 dateFormat 也不受影響
    maxDate: () => moment().endOf('day'),
    minYear: false, // 可選擇的最小年份
    ranges: getPresetRanges, // 快速選擇的日期範圍（函式型，理由同 maxDate），使用者有傳入時會被覆蓋
    showDropdowns: true,
    autoApply: false,
    alwaysShowCalendars: true,
    opens: 'center',
    linkedCalendars: false,
    showCustomRangeLabel: false,
    ...options, // 合併使用者傳入的選項，相同項目以使用者傳入為覆蓋
  };
};

/**
 * 取得常用的日期範圍區段（如最近 7 天、上個月等）
 * @returns {Object} 日期區段的集合（鍵為名稱，值為 [moment, moment] - 每個區段對應的開始與結束 moment 日期物件
 */
const getPresetRanges = () => {
  return {
    // '今天': [moment(), moment()],
    // '昨天': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
    '最近 7 天': [ // 6 天前至今天
      moment().subtract(6, 'days'),
      moment()
    ],
    '上週一至日': [
      moment().subtract(1, 'weeks').startOf('isoWeek'),
      moment().subtract(1, 'weeks').startOf('isoWeek').add(6, 'days')
    ],
    '本月': [moment().startOf('month'), moment().endOf('month')],
    '上個月': [
      moment().subtract(1, 'month').startOf('month'),
      moment().subtract(1, 'month').endOf('month')
    ]
  };
};
