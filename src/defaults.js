// 參數預設值處理
import moment from "moment/moment";

/**
 * 套用套件的預設 options 設定
 * @param {Object} [options={}] - 使用者傳入的自訂參數
 * @param {string} [options.dateFormat] - 日期格式（預設為 'YYYY-MM-DD'）
 * @param {string} [options.startDate] - 起始日期（若未提供則預設為 7 天前）
 * @param {string} [options.endDate] - 結束日期（若未提供則預設為昨天）
 * @param {string|null} [options.minDate] - 最小可選日期
 * @param {string|null} [options.maxDate] - 最大可選日期
 * @param {number|null} [options.minYear] - 最小可選年份
 * @param {Object} [options.ranges] - 使用者自訂的快速選擇區段
 * @returns {Object} - 合併後的完整 options 物件
 */
export const applyDefaultOptions = (options = {}) => {
  const dateFormat = options.dateFormat || 'YYYY-MM-DD'; // 日期格式

  return {
    dateFormat: dateFormat, // 日期格式
    startDate: moment().subtract(7, 'days').format(dateFormat), // 起始日期，預設為 7 天前
    endDate: moment().subtract(1, 'days').format(dateFormat), // 結束日期，預設為昨天
    minDate: false, // 可選擇的最小日期，預設為 false (設為 null，月份前進後退的箭頭會失效)
    maxDate: moment().subtract(1, 'days').format(dateFormat), // 可選擇的最大日期，預設為昨天
    minYear: false, // 可選擇的最小年份
    ranges: options.ranges || getPresetRanges(), // 快速選擇的日期範圍，沒有值得話帶入預設值
    showDropdowns: true,
    autoApply: true,
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
    '最近 7 天': [ // 7 天前至昨天
      moment().subtract(7, 'days'),
      moment().subtract(1, 'days')
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
