/**
 * 工具函式
 */
import moment from 'moment';

export { resolve, getDateBounds, isDateInRange };

/**
 * 將「值或回傳值的函式」求值，非函式則原樣回傳
 * 函式型選項（如 maxDate: () => moment()）在每次建立元件時重新求值，跨日重建後才會跟著更新
 * @param {*|Function} value - 選項值，或回傳選項值的函式
 * @returns {*} - 求值後的選項值
 */
const resolve = (value) => (typeof value === 'function' ? value() : value);

/**
 * 依 options 求出目前的可選上下限（皆為當地時間的 moment）
 * WHY: 不可用 new Date('YYYY-MM-DD')，它會以 UTC 解析，在 UTC+8 會落在當地 08:00，
 *      導致上下限當天被誤判為超出範圍；一律依 dateFormat 以當地時間解析
 * - 未開 timePicker 時以「整天」為單位：下限取當天開始、上限取當天結束
 * - 開了 timePicker 則保留呼叫端給的精確時間（例如上限為「現在」）
 * @param {Object} options - 套件的設定選項
 * @returns {{ min: moment.Moment|null, max: moment.Moment }} - min 為 null 表示不限；
 *          未設定 maxDate 時沿用既有行為，以今天為上限
 */
const getDateBounds = (options) => {
  const minDate = resolve(options.minDate);
  const maxDate = resolve(options.maxDate);
  const toBound = (value, edge) => {
    const date = moment(value, options.dateFormat);
    return options.timePicker ? date : date[edge]('day');
  };

  return {
    min: minDate ? toBound(minDate, 'startOf') : null,
    max: maxDate ? toBound(maxDate, 'endOf') : moment().endOf('day'),
  };
};

/**
 * 判斷給定日期是否在 min/max 範圍內
 * @param {moment.Moment} date - 欲檢查的日期
 * @param {moment.Moment|null} min - 最小允許日期（可為 null）
 * @param {moment.Moment|null} max - 最大允許日期（可為 null）
 * @returns {boolean} - 日期是否落在範圍內
 */
const isDateInRange = (date, min, max) => {
  if (min && date.isBefore(min)) return false;
  if (max && date.isAfter(max)) return false;
  return true;
};

