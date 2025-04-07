import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daterino } from '../src/index.js';
import $ from 'jquery';
import moment from "moment/moment";

describe('daterino-test', () => {
  let input;
  let defaultDateFormat = 'YYYY-MM-DD';

  beforeEach(() => {
    // 建立 DOM 元素
    document.body.innerHTML = `<input type="text" class="js-datepicker" />`;
    input = document.querySelector('.js-datepicker');
  });

  it('應該成功初始化並回傳元件物件', () => {
    const picker = daterino('.js-datepicker');
    expect(picker).toBeDefined();
    expect(typeof picker.update).toBe('function');
    expect(typeof picker.data).toBe('object');
  });

  it('初始化後 data 應包含 selector、startDate、endDate', () => {
    const picker = daterino('.js-datepicker');
    expect(picker.data.selector).toBe('.js-datepicker');
    expect(typeof picker.data.startDate).toBe('string');
    expect(typeof picker.data.endDate).toBe('string');
  });

  it('呼叫 update() 應更新日期資料應該要返回新的回傳值', () => {
    const picker = daterino('.js-datepicker');
    const newStartDate = '2025-01-01';
    const newEndDate = '2025-01-15';
    picker.update(newStartDate, newEndDate);
    expect(picker.data.startDate).toBe(newStartDate);
    expect(picker.data.endDate).toBe(newEndDate);
  });

  it('不合法日期格式應拋出錯誤', () => {
    const picker = daterino('.js-datepicker');
    expect(() => {
      picker.update('invalid-date', '2025-05-10');
    }).toThrow();
  });

  it('應觸發 daterangepicker:ready 事件', async () => {
    const callback = vi.fn();
    document.addEventListener('daterangepicker:ready', callback);
    daterino('.js-datepicker');
    await new Promise(resolve => setTimeout(resolve, 50)); // 等待事件觸發
    expect(callback).toHaveBeenCalled();
  });

  it('應正確處理最小與最大日期邊界', () => {
    const minDate = moment().subtract(40, 'days').format(defaultDateFormat);
    const maxDate = moment().add(30, 'days').format(defaultDateFormat);

    // 應允許合法範圍內的更新
    const pickerValid = daterino('.js-datepicker', {
      minDate,
      maxDate,
    });

    pickerValid.update(minDate, maxDate);
    expect(pickerValid.data.startDate).toBe(minDate);
    expect(pickerValid.data.endDate).toBe(maxDate);

    // 更新日期小於 minDate 時應拋出錯誤
    const pickerTooEarly = daterino('.js-datepicker', { minDate });
    const tooEarlyDate = moment().subtract(41, 'days').format(defaultDateFormat);
    expect(() => pickerTooEarly.update(tooEarlyDate)).toThrow();

    // 更新日期大於 maxDate 時應拋出錯誤
    const pickerTooLate = daterino('.js-datepicker', { maxDate });
    const tooLateDate = moment().add(31, 'days').format(defaultDateFormat);
    expect(() => pickerTooLate.update(null, tooLateDate)).toThrow();
  });

  it('選擇與目前相同的日期不應觸發 callback', async () => {
    const callback = vi.fn();
    const startDate = '2025-01-01';
    const endDate = '2025-01-10';

    daterino('.js-datepicker', {
      startDate: startDate,
      endDate: endDate
    }, callback);

    await new Promise(resolve => {
      document.addEventListener('daterangepicker:ready', resolve, { once: true });
    });

    const instance = $(input).data('daterangepicker');
    instance.callback(moment(startDate), moment(endDate));

    expect(callback).not.toHaveBeenCalled();
  });

  it('只更新 startDate 或 endDate 時另一個日期應保留原值', () => {
    const picker = daterino('.js-datepicker', {
      startDate: '2025-01-01',
      endDate: '2025-01-10'
    });

    picker.update('2025-01-05', null);
    expect(picker.data.startDate).toBe('2025-01-05');
    expect(picker.data.endDate).toBe('2025-01-10');

    picker.update(null, '2025-01-15');
    expect(picker.data.startDate).toBe('2025-01-05');
    expect(picker.data.endDate).toBe('2025-01-15');
  });

  it('跨日點擊應自動重新初始化', async () => {
    const today = moment().subtract(1, 'days').format(defaultDateFormat);
    vi.setSystemTime(new Date(today)); // 模擬昨天

    const picker = daterino('.js-datepicker');
    const instanceBefore = $(input).data('daterangepicker');

    // 模擬隔天
    vi.setSystemTime(new Date());
    input.click(); // 會觸發跨日重建邏輯

    await new Promise(resolve => setTimeout(resolve, 10));
    const instanceAfter = $(input).data('daterangepicker');
    expect(instanceAfter).not.toBe(instanceBefore); // 應該已重新初始化
  });
});
