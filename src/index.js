/**
 * 將核心 daterino 模組統一出口（對應到 Vite 的 lib.name 設定）
 * @module daterino
 */

export {
  daterino,
  daterino as Daterino // 和 Vite 的 lib.name 對齊
};

// 此套件依賴 daterangepicker，但其對依賴 (jQuery、moment) 都沒有做 import，而是仰賴全域注入，這邊需將這些依賴注入
import jQuery from 'jquery'; // 避免重複在全域註冊，導致錯誤 (注意這邊不直接使用 import $ from 'jquery')
const $ = typeof window !== 'undefined' && window.jQuery
  ? window.jQuery
  : jQuery;

import moment from 'moment'; // daterangepicker 自己沒有 import 他們，而是仰賴全域注入
window.moment = moment; // 讓 moment 可以在全域使用，daterangepicker 需要

import 'daterangepicker/daterangepicker.css';
// end daterangepicker 依賴注入

import { applyDefaultOptions } from './defaults.js';
import { isValidDateObject, isDateInRange } from './utils.js';
import './css/style.css';

/**
 * 初始化 daterino 套件
 * @function
 * @param {string} selector - jQuery 選擇器（如 '.js-datepicker'）
 * @param {Object} options - 使用者傳入的初始化選項
 * @param {string} [options.startDate] - 預設的開始日期（格式: YYYY-MM-DD）
 * @param {string} [options.endDate] - 預設的結束日期（格式: YYYY-MM-DD）
 * @param {string} [options.minDate] - 最小允許選擇的日期
 * @param {string} [options.maxDate] - 最大允許選擇的日期
 * @param {string} [options.dateFormat] - 日期格式，預設為 YYYY-MM-DD
 * @param {number} [options.minYear] - 可選擇的最小年份
 * @param {Function} [callback] - 日期選擇變更時的回呼函式
 * @returns {{ data: Object, update: function(string?, string?): void }} - 回傳包含 data 狀態與 update 方法的物件
 */
const daterino = (selector = 'input.js-datepicker', options = {}, callback = null) => {
  // 設定參數預設值
  options = applyDefaultOptions(options);

  // 實例的內部狀態資料
  let data = {
    selector: selector,
    startDate: options.startDate, // 預設為 7 天前
    endDate: options.endDate, // endDate 若沒有設定，則設定為昨天
    initDate: moment().format(options.dateFormat), // 初始化當下的日期
  };

  loadDateRangePicker().then(() => {
    // 初始化 dateRangePicker 的內部函式，供第一次與跨日後重建使用
    const initPicker = () => {
      $(selector).daterangepicker({
        locale: {
          format: options.dateFormat,
          daysOfWeek: ['日', '一', '二', '三', '四', '五', '六'],
          monthNames: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
          // monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
          separator: " – ",
        },
        isInvalidDate: function (momentDate) {
          const date = momentDate.toDate();
          const min = options.minDate ? new Date(options.minDate) : null;
          const max = options.maxDate ? new Date(options.maxDate) : new Date();
          return ! isDateInRange(date, min, max) ? 'disabled' : false;
        },
        ...options // 合併傳入的 options
      }, function(newStartDate, newEndDate) {
        // ----------------------------
        // 選擇日期後的相關處理及執行 callback
        // 因依賴套件在日期沒有變動時，就不執行此 callback，所以不用在這邊判斷是否選擇不同日期
        // ----------------------------
        // 將 moment 物件轉換為字串
        newStartDate = newStartDate.format(options.dateFormat);
        newEndDate = newEndDate.format(options.dateFormat);

        // 更新內部狀況
        data.startDate = newStartDate;
        data.endDate = newEndDate;

        // 執行傳入的 callback 函式
        if (typeof callback === 'function') {
          callback(data.startDate, data.endDate);
        }
      });

      // 在初始化後 dispatch 自訂事件
      document.dispatchEvent(
        new CustomEvent('daterangepicker:ready', {
          detail: { selector: data.selector }
        })
      );

    }; // end initPicker

    // 初始化
    initPicker();

    // 偵測是否跨日重新初始化（使用者點選 input 時檢查是否需重新初始化）
    $(selector).on('mousedown', function (e) {
      const today = moment().format(options.dateFormat);
      if (today === data.initDate) return; // 無需重建元件

      console.log('跨日，重新初始化 _dateRangePicker');
      const $this = $(this);
      let picker = $this.data('daterangepicker');

      if (picker) {
        picker.remove();
        data.initDate = today;

        // 先取預設值 (未有自訂的參數帶入)
        const defaults = applyDefaultOptions();
        // 若 options.maxDate 不等於 defaults.maxDate，則將 options.maxDate 更新為預設值
        if (options.maxDate !== defaults.maxDate) {
          options.maxDate = defaults.maxDate;
          console.log('更新 maxDate 為預設值：', options.maxDate);
        }

        // 重新初始化
        initPicker();
        // 顯示視窗
        picker.show();
      } else {
        console.warn('找不到 daterangepicker 實例，可能尚未初始化');
      }
    });

  }); // end loadDateRangePicker

  // 回傳物件，包含 startDate, endDate, update 方法
  return {
    data: data,
    // 可由回傳的物件來更新日期
    // TODO: 可加上 callback 參數，如果日期沒變也要 callback
    update: (newStartDate = null, newEndDate = null) => {
      handleUpdateDate(data, options, newStartDate, newEndDate);
    }
  }; // end return

}; // end _dateRangePicker

/**
 * 確認依賴都載入完成才載入 daterangepicker.js (因 daterangepicker 未處理好依賴機制)
 * @returns {Promise<void>}
 */
const loadDateRangePicker = () => {
  return import('daterangepicker').then((module) => {
    if (! $.fn.daterangepicker) {
      $.fn.daterangepicker = module.default || module;
    }

    // 設定全域函式變數
    // if (! window.helpers) {
    //   window.helpers = {};
    // }
    //
    // window.helpers._dateRangePicker = _dateRangePicker;
  }).catch(error => {
    console.error('載入 daterangepicker 失敗:', error);
  });
};

/**
 * 處理外部呼叫 update 時的日期更新邏輯
 * @param {Object} data - 套件的內部狀態資料
 * @param {Object} options - 初始化時的設定選項
 * @param {string} [newStartDate] - 欲更新的開始日期
 * @param {string} [newEndDate] - 欲更新的結束日期
 */
const handleUpdateDate = (data, options, newStartDate, newEndDate) => {
  const start = newStartDate ? new Date(newStartDate) : null;
  const end = newEndDate ? new Date(newEndDate) : null;
  // 檢查更新的日期是否符格式
  if ((start && ! isValidDateObject(start)) || (end && ! isValidDateObject(end))) {
    throw new Error('更新失敗：傳入的日期不是有效的日期字串');
  }

  // 比較是否超出日期範圍
  // 將 minDate / maxDate 轉為 Date 物件，若無則允許任何範圍
  const min = options.minDate ? new Date(options.minDate) : null;
  const max = options.maxDate ? new Date(options.maxDate) : new Date();
  if ((start && ! isDateInRange(start, min, max)) || (end && ! isDateInRange(end, min, max))) {
    throw new Error('更新失敗：選擇的日期不在允許的範圍內');
  }

  // 日期並無更新則不繼續動作
  if (data.startDate === newStartDate && data.endDate === newEndDate) {
    return;
  }

  // 先處理內部狀態資料，便利取得返回值，不用等待元件處理更新 (沒有值則不變動)
  data.startDate = newStartDate || data.startDate;
  data.endDate = newEndDate || data.endDate;

  // 確認元件是否已完成初始化，若沒有則監聽事件後再處啦
  const picker = $(data.selector).data('daterangepicker');
  if (picker) {
    applyUpdate();
  } else {
    document.addEventListener('daterangepicker:ready', (e) => {
      if (e.detail?.selector === data.selector) {
        applyUpdate();
      }
    }, { once: true }); // 注意使用一次性監聽
  }

  function applyUpdate() {
    const picker = $(data.selector).data('daterangepicker');
    if (picker) {
      // 必須先轉為 moment 物件，才能使用 daterangepicker 的方法
      newStartDate = moment(newStartDate);
      newEndDate = moment(newEndDate);
      // 更新元件
      picker.setStartDate(newStartDate);
      picker.setEndDate(newEndDate);
      picker.updateView();
    }
  }
};
