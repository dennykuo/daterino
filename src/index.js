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
import { resolve, getDateBounds, isDateInRange } from './utils.js';
import './css/style.css';

// 跨日判斷固定以「日」比對（dateFormat 可能含時間，不能拿來判斷是否跨日）
const DAY_FORMAT = 'YYYY-MM-DD';

/**
 * 初始化 daterino 套件
 * @function
 * @param {string} selector - jQuery 選擇器（如 '.js-datepicker'）
 * @param {Object} options - 使用者傳入的初始化選項
 * @param {string} [options.startDate] - 預設的開始日期（格式同 dateFormat），預設為 6 天前
 * @param {string} [options.endDate] - 預設的結束日期（格式同 dateFormat），預設為今天
 * @param {string|Date|moment.Moment|Function} [options.minDate] - 最小允許選擇的日期；
 *        傳入函式時，每次建立元件（含跨日重建、setOptions）都會重新求值
 * @param {string|Date|moment.Moment|Function} [options.maxDate] - 最大允許選擇的日期，預設為今天；
 *        傳入函式時同 minDate
 * @param {Object|Function} [options.ranges] - 快速選擇區段 { 名稱: [開始, 結束] }，或回傳該物件的函式
 * @param {boolean} [options.autoApply] - 選完日期是否直接套用，預設為 false（顯示套用 / 取消按鈕）
 * @param {string} [options.dateFormat] - 日期格式，預設為 YYYY-MM-DD
 * @param {number} [options.minYear] - 可選擇的最小年份
 * @param {Function} [callback] - 日期選擇變更時的回呼函式
 * @returns {{ data: Object, update: function(string?, string?): void, setOptions: function(Object): void }}
 *          - 回傳包含 data 狀態與 update、setOptions 方法的物件
 */
const daterino = (selector = 'input.js-datepicker', options = {}, callback = null) => {
  // 設定參數預設值（保留呼叫端原始的值，函式型選項到建立元件時才求值）
  options = applyDefaultOptions(options);

  // 實例的內部狀態資料
  let data = {
    selector: selector,
    startDate: options.startDate, // 未設定時預設為 6 天前
    endDate: options.endDate, // 未設定時預設為今天
    initDate: moment().format(DAY_FORMAT), // 最後一次建立元件時的系統當日（跨日判斷依據）
  };

  // 初始化 dateRangePicker 的內部函式，供第一次、跨日後與 setOptions 重建使用（須在 daterangepicker 載入後呼叫）
  const initPicker = () => {
    // 每次建立元件都重新求值上下限（函式型 minDate / maxDate 在此求值）
    const { min, max } = getDateBounds(options);
    // 函式型選項以建立當下的「今天」求值，跨日判斷以此為基準
    data.initDate = moment().format(DAY_FORMAT);

    const $elements = $(selector);
    const pickerOptions = {
      locale: {
        format: options.dateFormat,
        daysOfWeek: ['日', '一', '二', '三', '四', '五', '六'],
        monthNames: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        // monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        separator: " – ",
        // autoApply 為 false 時會出現套用 / 取消按鈕，daterangepicker 預設是英文 Apply / Cancel
        applyLabel: '套用',
        cancelLabel: '取消',
      },
      ...options, // 合併傳入的 options
      // 函式型選項由 daterino 求值後才交給 daterangepicker
      // WHY: daterangepicker 只認字串 / Date / moment 的 minDate、maxDate 與物件型 ranges（typeof 判斷），
      //      直接傳函式會被默默忽略
      // 上下限直接用 getDateBounds 的結果；日期格停用、選取與快速區段的截斷都交給 daterangepicker
      minDate: min || false, // null 會讓月份箭頭失效（見 defaults.js）
      maxDate: max,
      ranges: resolve(options.ranges),
      // 以 data 為準：重建時保留使用者目前的選取，而不是重設回初始化時的 startDate / endDate
      startDate: data.startDate,
      endDate: data.endDate,
    };

    const $showing = closeSilently($elements);
    const restoreData = preserveElementData($elements, pickerOptions);

    // 跨日檢查須排在 daterangepicker 自己的 focus / click（show）之前，才能先重建再顯示，所以每次建立前重新綁定
    $elements.off('mousedown focus click', refreshOnInteraction).on('mousedown focus click', refreshOnInteraction);

    // 已有實例時，$.fn.daterangepicker 會先 remove() 舊實例再建立新的（daterangepicker.js:1569-1570）
    $elements.daterangepicker(pickerOptions, function(newStartDate, newEndDate) {
      // ----------------------------
      // 選擇日期後的相關處理及執行 callback
      // 因依賴套件在日期沒有變動時，就不執行此 callback，所以不用在這邊判斷是否選擇不同日期
      // ----------------------------
      writeSelection(data, newStartDate, newEndDate, options.dateFormat);

      // 執行傳入的 callback 函式
      if (typeof callback === 'function') {
        callback(data.startDate, data.endDate);
      }
    });

    restoreData();
    syncSelection(data, options, false);

    // 重建前開著的，重建後也維持開啟
    $showing.each(function () {
      $(this).data('daterangepicker').show();
    });

    // 在初始化後 dispatch 自訂事件
    document.dispatchEvent(
      new CustomEvent('daterangepicker:ready', {
        detail: { selector: data.selector }
      })
    );

  }; // end initPicker

  /**
   * 跨日時重建元件，讓函式型選項（含預設的 maxDate、ranges）以新的「今天」重新求值，選取則沿用 data
   * @returns {boolean} - 是否有重建
   */
  const refreshIfDayChanged = () => {
    if (! $(selector).data('daterangepicker')) return false; // 尚未初始化
    if (moment().format(DAY_FORMAT) === data.initDate) return false; // 無需重建元件

    console.log('跨日，重新初始化 _dateRangePicker');
    initPicker();
    return true;
  };

  /**
   * 使用者點選或聚焦 input 時檢查是否跨日（mousedown 之外也要處理 focus / click，例如以 Tab 聚焦）
   * @param {jQuery.Event} e
   */
  const refreshOnInteraction = function (e) {
    if (! refreshIfDayChanged()) return;

    // jQuery 在派送前已取好這次事件的 handler 清單，focus / click 之後還會執行舊實例的 show()，停掉它改由新實例顯示；
    // mousedown 沒有舊實例的 handler，保留冒泡讓頁面上其他元件判斷點擊外部
    if (e.type !== 'mousedown') {
      e.stopImmediatePropagation();
    }

    const picker = $(this).data('daterangepicker');
    if (picker) {
      picker.show();
    }
  };

  loadDateRangePicker().then(() => {
    // 初始化
    initPicker();
  }); // end loadDateRangePicker

  // 回傳物件，包含 data 狀態、update 與 setOptions 方法
  return {
    data: data,
    // 可由回傳的物件來更新日期
    // TODO: 可加上 callback 參數，如果日期沒變也要 callback
    update: (newStartDate = null, newEndDate = null) => {
      // 跨日後尚未互動就呼叫時，先以新的一天重建，檢查與夾取才會用新的上下限
      refreshIfDayChanged();
      handleUpdateDate(data, options, newStartDate, newEndDate);
    },
    /**
     * 更新元件選項（例如同一頁切換品牌時，改變可選的上限）
     * - 合併進目前的選項，未傳入的選項維持原值；minDate / maxDate / ranges 同樣可傳入函式
     * - 元件已初始化時立即重建，並把目前的選取夾進新的上下限（夾回後的日期可由 data 取得）
     * - 元件尚未初始化時只合併選項，待初始化時一併套用
     * - 不觸發 callback（與 update() 一致）；重建後會再發出一次 daterangepicker:ready 事件
     * - 開啟中呼叫時維持開啟，但會捨棄尚未套用的選取
     * - startDate / endDate 只是初始值，重建一律沿用目前的選取；要變更選取請用 update()
     * - 變更 dateFormat 時，目前的選取會轉成新格式；字串型的 minDate / maxDate / ranges 請一併以新格式傳入
     * @param {Object} [partial={}] - 欲變更的選項，可用欄位同 daterino() 的 options
     */
    setOptions: (partial = {}) => {
      // data 以 dateFormat 字串保存，格式變更時先轉成新格式
      if (partial.dateFormat && partial.dateFormat !== options.dateFormat) {
        const start = moment(data.startDate, options.dateFormat);
        const end = moment(data.endDate, options.dateFormat);
        writeSelection(data, start, end, partial.dateFormat);
      }

      Object.assign(options, partial);
      // 元件尚未建立時不必處理：初始化時 initPicker 會讀到合併後的選項
      if ($(selector).data('daterangepicker')) {
        initPicker();
      }
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
 * @param {Object} options - 目前的設定選項（含 setOptions 合併的變更）
 * @param {string} [newStartDate] - 欲更新的開始日期
 * @param {string} [newEndDate] - 欲更新的結束日期
 */
const handleUpdateDate = (data, options, newStartDate, newEndDate) => {
  // 依 dateFormat 以當地時間嚴格解析（理由見 getDateBounds；非嚴格模式會接受 '2025-01-01abc' 這類字串）
  const start = newStartDate ? moment(newStartDate, options.dateFormat, true) : null;
  const end = newEndDate ? moment(newEndDate, options.dateFormat, true) : null;
  // 檢查更新的日期是否符格式
  if ((start && ! start.isValid()) || (end && ! end.isValid())) {
    throw new Error('更新失敗：傳入的日期不是有效的日期字串');
  }

  // 比較是否超出日期範圍
  // 元件已建立時以它目前的上下限為準，與畫面一致（否則通過檢查的日期仍會被元件默默截斷）；尚未建立時才自行求值
  const picker = $(data.selector).data('daterangepicker');
  const { min, max } = picker
    ? { min: picker.minDate || null, max: picker.maxDate || null }
    : getDateBounds(options);
  if ((start && ! isDateInRange(start, min, max)) || (end && ! isDateInRange(end, min, max))) {
    throw new Error('更新失敗：選擇的日期不在允許的範圍內');
  }

  // 沒有傳入的日期沿用原值
  const startDate = start ? start.format(options.dateFormat) : data.startDate;
  const endDate = end ? end.format(options.dateFormat) : data.endDate;

  // 日期並無更新則不繼續動作
  if (data.startDate === startDate && data.endDate === endDate) {
    return;
  }

  // 先處理內部狀態資料，便利取得返回值，不用等待元件處理更新
  data.startDate = startDate;
  data.endDate = endDate;

  // 交給元件；元件尚未初始化時，initPicker 會以 data 為準建立
  syncSelection(data, options);
};

/**
 * 把 moment 選取依 dateFormat 寫回 data
 * @param {Object} data - 套件的內部狀態資料
 * @param {moment.Moment} start - 開始日期
 * @param {moment.Moment} end - 結束日期
 * @param {string} format - 日期格式
 */
const writeSelection = (data, start, end, format) => {
  data.startDate = start.format(format);
  data.endDate = end.format(format);
};

/**
 * daterangepicker 建構時只把起日夾到下限、迄日夾到上限（daterangepicker.js:189-195）；
 * 起日晚於上限、迄日早於下限（兩者都會讓起迄顛倒）或超過 maxSpan 時，才需要再走 setStartDate / setEndDate 的完整夾取
 * @param {Object} picker - daterangepicker 實例
 * @returns {boolean}
 */
const needsFullClamp = (picker) => picker.startDate.isAfter(picker.endDate)
  || Boolean(picker.maxSpan && picker.startDate.clone().add(picker.maxSpan).isBefore(picker.endDate));

/**
 * 把 data 的選取交給 daterangepicker，再把它調整後的結果讀回 data
 * WHY: daterangepicker 會默默調整日期（截到上下限、結束早於開始時對齊開始、maxSpan 等），
 *      data 若留著原值，之後 update() 以相同日期呼叫時會被「日期並無更新」提早 return，畫面顯示錯的區間
 * @param {Object} data - 套件的內部狀態資料
 * @param {Object} options - 目前的設定選項
 * @param {boolean} [push=true] - 是否把 data 寫進元件；剛建構完的元件已帶入 data，只在建構的夾取不足時才需要
 */
const syncSelection = (data, options, push = true) => {
  $(data.selector).each(function () {
    const picker = $(this).data('daterangepicker');
    if (! picker) return; // 尚未初始化

    if (push || needsFullClamp(picker)) {
      // 字串由 daterangepicker 依 locale.format（即 dateFormat）解析
      picker.setStartDate(data.startDate);
      picker.setEndDate(data.endDate);
    }

    if (picker.isShowing) {
      // 開啟中：同步「開啟前的日期」，關閉或取消時才不會把程式設定的日期當成使用者的變更（觸發 callback）或還原掉；
      // 開啟中 setStartDate / setEndDate 不會更新 input，這裡補上並重繪月曆（隱藏時 show() 會自行重繪）
      picker.oldStartDate = picker.startDate.clone();
      picker.oldEndDate = picker.endDate.clone();
      picker.updateElement();
      picker.updateView();
    }

    writeSelection(data, picker.startDate, picker.endDate, options.dateFormat);
  });
};

/**
 * 關閉開啟中的實例並捨棄尚未套用的選取（不觸發 callback），供重建前呼叫
 * WHY: daterangepicker 的 remove() 不會關閉實例，舊實例的 document 事件仍在；之後點外部時它的 hide()
 *      會把未套用的選取當成選定送進 callback，並把舊區間寫回 input
 * @param {jQuery} $elements - 綁定 daterangepicker 的元素
 * @returns {jQuery} - 原本開啟中的元素
 */
const closeSilently = ($elements) => {
  return $elements.filter(function () {
    const picker = $(this).data('daterangepicker');
    if (! picker || ! picker.isShowing) return false;

    // 還原為開啟前的日期，hide() 比對不到變動就不會呼叫 callback
    picker.startDate = picker.oldStartDate.clone();
    picker.endDate = picker.oldEndDate.clone();
    picker.hide();
    return true;
  });
};

/**
 * 保存元素上呼叫端自己的 jQuery data，回傳重建後寫回用的函式
 * WHY: 重建時舊實例的 remove() 會 removeData() 清掉元素上所有 jQuery data（daterangepicker.js:1560）；
 *      daterangepicker 建構時又會把選項複製進元素 data（daterangepicker.js:97），這些鍵與實例本身不保存，避免舊選項帶進新實例
 * @param {jQuery} $elements - 綁定 daterangepicker 的元素
 * @param {Object} pickerOptions - 這次要傳給 daterangepicker 的選項
 * @returns {function(): void}
 */
const preserveElementData = ($elements, pickerOptions) => {
  const excludedKeys = new Set([...Object.keys(pickerOptions), 'daterangepicker']);
  const saved = $elements.map(function () {
    const entries = Object.entries($(this).data()).filter(([key]) => ! excludedKeys.has(key));
    return Object.fromEntries(entries);
  }).get();

  return () => $elements.each(function (index) {
    $(this).data(saved[index]);
  });
};
