/**
 * 工具函式
 */

export { isValidDateObject, isDateInRange };

/**
 * 檢查是否為有效的 Date 物件
 * @param {*} date - 欲檢查的物件
 * @returns {boolean} - 是否為有效的 Date
 */
const isValidDateObject = (date) => date instanceof Date && ! isNaN(date.getTime());

/**
 * 判斷給定日期是否在 min/max 範圍內
 * @param {Date} date - 欲檢查的日期
 * @param {Date|null} min - 最小允許日期（可為 null）
 * @param {Date|null} max - 最大允許日期（可為 null）
 * @returns {boolean} - 日期是否落在範圍內
 */
const isDateInRange = (date, min, max) => {
  if (! date || ! (date instanceof Date) || isNaN(date.getTime())) return false;
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
};
