import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daterino } from '../src/index.js';
import $ from 'jquery';
import moment from "moment/moment";

// 所有測試固定「現在」，避免結果隨實際日期變動
const FORMAT = 'YYYY-MM-DD';
const NOW = new Date(2026, 9, 29, 10, 0); // 2026-10-29 10:00（當地時間）
const LATE_NIGHT = new Date(2026, 9, 29, 23, 0); // 10/29 23:00
const NEXT_DAY = new Date(2026, 9, 30, 0, 30); // 跨日後 10/30 00:30

beforeEach(() => vi.setSystemTime(NOW));

// 每個測試結束後清掉所有實例與 DOM
// WHY: 開啟中的實例會在 document 留下 mousedown 等事件，後面的測試觸發 mousedown 時會讓它 hide()、
//      呼叫前一個測試的 callback，並 $(document).off('.daterangepicker') 拿掉所有實例的事件，結果變得依執行順序而定
afterEach(async () => {
  // 先讓「daterino-test」同步測試延後執行的 initPicker 跑完，才不會在清理之後才建立實例
  await import('daterangepicker');
  await new Promise(resolve => setTimeout(resolve, 0));

  $('input').each(function () {
    $(this).data('daterangepicker')?.remove();
  });
  $(document).off('.daterangepicker');
  $(window).off('.daterangepicker');
  document.body.innerHTML = '';
  vi.useRealTimers();
});

/**
 * 等待指定 selector 的 daterangepicker:ready 事件
 * @param {string} selector
 * @returns {Promise<void>}
 */
function waitForReady(selector) {
  return new Promise(resolve => {
    document.addEventListener('daterangepicker:ready', function handler(e) {
      if (e.detail?.selector !== selector) return;
      document.removeEventListener('daterangepicker:ready', handler);
      resolve();
    });
  });
}

let mountSeq = 0;

/**
 * 以獨立 selector 建立 picker（不等待初始化）
 * WHY: 「daterino-test」裡的同步測試不會等 ready，它們的 initPicker 會延到後面的測試期間才執行；
 *      若共用 '.js-datepicker'，等待中的 ready 事件可能是別的測試的實例發出的，因此每個測試用自己的 selector 隔離
 */
const create = (options = {}, callback = null) => {
  const className = `js-daterino-${++mountSeq}`;
  const selector = `.${className}`;
  document.body.insertAdjacentHTML('beforeend', `<input type="text" class="${className}" />`);
  const ready = waitForReady(selector);
  const picker = daterino(selector, options, callback);
  return { picker, $input: $(selector), ready };
};

/**
 * 建立 picker 並等到 daterangepicker 初始化完成
 */
const mount = async (options = {}, callback = null) => {
  const mounted = create(options, callback);
  await mounted.ready;
  return mounted;
};

const instanceOf = ($input) => $input.data('daterangepicker');
const formatRange = (range) => range.map(date => date.format(FORMAT));

/**
 * 模擬跨日後使用者點擊 input（跨日判斷綁在 mousedown 上，click() 不會觸發 mousedown）
 */
const crossDayClick = ($input, date) => {
  vi.setSystemTime(date);
  $input.trigger('mousedown');
};

/**
 * 取得月曆上某一天日期格的 class（須先 show() 才會渲染）
 * @param {Object} instance - daterangepicker 實例
 * @param {'left'|'right'} side - 左側或右側月曆
 * @param {string} date - YYYY-MM-DD
 * @returns {string|undefined}
 */
const cellClass = (instance, side, date) => {
  const calendar = instance[`${side}Calendar`].calendar;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (calendar[row][col].format(FORMAT) === date) {
        return instance.container.find(`.drp-calendar.${side} td[data-title="r${row}c${col}"]`).attr('class');
      }
    }
  }
};

describe('daterino-test', () => {
  beforeEach(() => {
    // 建立 DOM 元素
    document.body.innerHTML = `<input type="text" class="js-datepicker" />`;
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
    const minDate = moment().subtract(40, 'days').format(FORMAT);
    const maxDate = moment().add(30, 'days').format(FORMAT);

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
    const tooEarlyDate = moment().subtract(41, 'days').format(FORMAT);
    expect(() => pickerTooEarly.update(tooEarlyDate)).toThrow();

    // 更新日期大於 maxDate 時應拋出錯誤
    const pickerTooLate = daterino('.js-datepicker', { maxDate });
    const tooLateDate = moment().add(31, 'days').format(FORMAT);
    expect(() => pickerTooLate.update(null, tooLateDate)).toThrow();
  });

  // it('選擇與目前相同的日期也應觸發 callback', async () => {
  //   // 因依賴套件在日期沒有變動時，就不執行此 callback，所以目前測試沒有用
  //   const callback = vi.fn();
  //   const startDate = '2025-01-01';
  //   const endDate = '2025-01-10';
  //
  //   daterino('.js-datepicker', {
  //     startDate: startDate,
  //     endDate: endDate
  //   }, callback);
  //
  //   await new Promise(resolve => {
  //     document.addEventListener('daterangepicker:ready', resolve, { once: true });
  //   });
  //
  //   const instance = $(input).data('daterangepicker');
  //   instance.callback(moment(startDate), moment(endDate));
  //
  //   expect(callback).toHaveBeenCalled();
  // });

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

});

describe('預設值', () => {
  it('預設選取 6 天前至今天、可選上限為今天、不自動套用', async () => {
    const { picker, $input } = await mount();
    const instance = instanceOf($input);

    expect(picker.data.startDate).toBe('2026-10-23');
    expect(picker.data.endDate).toBe('2026-10-29');
    expect(instance.startDate.format(FORMAT)).toBe('2026-10-23');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-29');
    expect(instance.maxDate.format(FORMAT)).toBe('2026-10-29');
    expect(instance.autoApply).toBe(false);
    expect(formatRange(instance.ranges['最近 7 天'])).toEqual(['2026-10-23', '2026-10-29']);
  });
});

describe('函式型選項與日期上下限', () => {
  it('函式型 minDate / maxDate 會在初始化時求值', async () => {
    const { $input } = await mount({
      minDate: () => moment().subtract(30, 'days').format(FORMAT),
      maxDate: () => moment().subtract(1, 'days'),
    });
    const instance = instanceOf($input);

    expect(instance.minDate.format(FORMAT)).toBe('2026-09-29');
    expect(instance.maxDate.format(FORMAT)).toBe('2026-10-28');
  });

  it('函式型 ranges 會被求值，且區間會截到 maxDate', async () => {
    const { $input } = await mount({
      maxDate: '2026-10-28',
      ranges: () => ({
        '最近 3 天': [moment().subtract(2, 'days'), moment()],
        '明天': [moment().add(1, 'days'), moment().add(1, 'days')],
      }),
    });
    const instance = instanceOf($input);

    expect(formatRange(instance.ranges['最近 3 天'])).toEqual(['2026-10-27', '2026-10-28']);
    expect(instance.ranges['明天']).toBeUndefined(); // 起點晚於 maxDate 的區間由 daterangepicker 丟掉
  });

  it('update() 以函式型 maxDate 的求值結果檢查上限', async () => {
    const { picker } = await mount({ maxDate: () => moment().subtract(1, 'days').format(FORMAT) });

    expect(() => picker.update(null, '2026-10-29')).toThrow();

    picker.update('2026-10-20', '2026-10-28');
    expect(picker.data.endDate).toBe('2026-10-28');
  });

  it('minDate 與 maxDate 當天在月曆上都可選，範圍外停用（不受 UTC 解析影響）', async () => {
    // 起訖跨月：左側月曆的日期格為 00:00，右側帶著 endDate 的時間（23:59:59），兩種都要涵蓋
    const { $input } = await mount({
      startDate: '2026-09-20',
      endDate: '2026-10-10',
      minDate: '2026-09-01',
      maxDate: '2026-10-29',
    });
    const instance = instanceOf($input);
    instance.show();

    expect(cellClass(instance, 'left', '2026-09-01')).not.toContain('disabled');
    expect(cellClass(instance, 'left', '2026-08-31')).toContain('disabled');
    expect(cellClass(instance, 'right', '2026-10-29')).not.toContain('disabled');
    expect(cellClass(instance, 'right', '2026-10-30')).toContain('disabled');
  });

  it('maxDate 設為 false 時以今天為上限：月曆停用明天，快速區段也截到今天', async () => {
    const { $input } = await mount({
      maxDate: false,
      ranges: { '未來 3 天': [moment(), moment().add(3, 'days')] },
    });
    const instance = instanceOf($input);
    instance.show();

    expect(formatRange(instance.ranges['未來 3 天'])).toEqual(['2026-10-29', '2026-10-29']);
    expect(cellClass(instance, 'left', '2026-10-30')).toContain('disabled');
  });

  it('update() 的上限取 maxDate 當天結束（Date 型 maxDate，不受 UTC 解析影響）', async () => {
    // UTC+8 早上 7 點；若以 new Date('2026-10-29') 解析會是當地 08:00，晚於上限而被誤判
    vi.setSystemTime(new Date(2026, 9, 29, 7, 0));
    const { picker } = await mount({ maxDate: new Date() });

    picker.update('2026-10-23', '2026-10-29');
    expect(picker.data.endDate).toBe('2026-10-29');
  });

  it('update() 依 dateFormat 解析日期', async () => {
    const dateFormat = 'DD/MM/YYYY';
    const { picker, $input } = await mount({
      dateFormat,
      startDate: '01/10/2026',
      endDate: '05/10/2026',
      maxDate: '29/10/2026',
    });

    picker.update('02/10/2026', '10/10/2026');
    const instance = instanceOf($input);
    expect(instance.startDate.format(FORMAT)).toBe('2026-10-02');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-10');

    expect(() => picker.update(null, '30/10/2026')).toThrow();
  });

  it('元件 ready 前呼叫 update()，初始化後元件顯示該區間', async () => {
    const { picker, $input, ready } = create({ startDate: '2026-10-01', endDate: '2026-10-05' });

    picker.update('2026-10-02', '2026-10-06');
    await ready;

    const instance = instanceOf($input);
    expect(instance.startDate.format(FORMAT)).toBe('2026-10-02');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-06');
  });

  it('update() 傳入的日期被 daterangepicker 調整時，data 與元件一致', async () => {
    const { picker, $input } = await mount({ startDate: '2026-10-01', endDate: '2026-10-05' });

    picker.update('2026-10-20', '2026-10-10'); // 結束早於開始，daterangepicker 會把結束對齊開始
    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-20');
    expect(picker.data.endDate).toBe('2026-10-20');
  });

  it('update() 依元件目前的上下限檢查：函式依賴的狀態改變但尚未 setOptions 時拋錯，而不是被默默截斷', async () => {
    let allowToday = false;
    const { picker } = await mount({
      maxDate: () => (allowToday ? moment() : moment().subtract(1, 'days')),
    });

    allowToday = true;
    expect(() => picker.update(null, '2026-10-29')).toThrow();

    picker.setOptions({}); // 重建後才以新的狀態求值
    picker.update(null, '2026-10-29');
    expect(picker.data.endDate).toBe('2026-10-29');
  });

  it('update() 依 dateFormat 嚴格解析，格式不符時拋錯', async () => {
    const { picker } = await mount();

    expect(() => picker.update('2026-10-01abc', '2026-10-05')).toThrow();
    expect(() => picker.update('2026', '2026-10-05')).toThrow();
  });

  it('開啟中呼叫 update()：input 立即顯示新區間，關閉時不觸發 callback', async () => {
    const callback = vi.fn();
    const { picker, $input } = await mount({ startDate: '2026-10-23', endDate: '2026-10-29' }, callback);
    instanceOf($input).show();

    picker.update('2026-10-01', '2026-10-05');
    expect($input.val()).toBe('2026-10-01 – 2026-10-05');

    $(document.body).trigger('mousedown'); // 點外部關閉
    expect(instanceOf($input).isShowing).toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it('開啟中呼叫 update() 後按取消，元件與 data 維持 update 的區間', async () => {
    const { picker, $input } = await mount({ startDate: '2026-10-23', endDate: '2026-10-29' });
    instanceOf($input).show();

    picker.update('2026-10-01', '2026-10-05');
    instanceOf($input).clickCancel();

    expect(instanceOf($input).startDate.format(FORMAT)).toBe('2026-10-01');
    expect(picker.data.startDate).toBe('2026-10-01');
    expect($input.val()).toBe('2026-10-01 – 2026-10-05');
  });

  it('timePicker 開啟時保留 maxDate 的精確時間', async () => {
    const dateFormat = 'YYYY-MM-DD HH:mm';
    const { picker, $input } = await mount({
      timePicker: true,
      timePicker24Hour: true,
      dateFormat,
      startDate: '2026-10-29 08:00',
      endDate: '2026-10-29 09:00',
      maxDate: () => moment(), // 現在 10:00
    });

    expect(instanceOf($input).maxDate.format(dateFormat)).toBe('2026-10-29 10:00');
    expect(() => picker.update(null, '2026-10-29 12:00')).toThrow();
  });

  it('update() 只傳 endDate 時，元件的 startDate 維持原值', async () => {
    const { picker, $input } = await mount({ startDate: '2026-10-01', endDate: '2026-10-05' });

    picker.update(null, '2026-10-10');
    const instance = instanceOf($input);
    expect(instance.startDate.format(FORMAT)).toBe('2026-10-01');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-10');
  });
});

describe('跨日重建', () => {
  beforeEach(() => vi.setSystemTime(LATE_NIGHT));

  it('跨日點擊應自動重新初始化', async () => {
    // 必須等 daterangepicker 載入完成，才拿得到實例與 mousedown 監聽
    const { $input } = await mount();
    const before = instanceOf($input);

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input)).toBeDefined();
    expect(instanceOf($input)).not.toBe(before); // 應該已重新初始化
  });

  it('函式型 minDate / maxDate 跨日後重新求值', async () => {
    const { $input } = await mount({
      minDate: () => moment().subtract(30, 'days').format(FORMAT),
      maxDate: () => moment().format(FORMAT),
    });
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-29');

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input).minDate.format(FORMAT)).toBe('2026-09-30');
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-30');
  });

  it('跨日不會把呼叫端自訂的 maxDate 蓋回預設值', async () => {
    const { $input } = await mount({ startDate: '2026-10-10', endDate: '2026-10-15', maxDate: '2026-10-20' });

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-20');
  });

  it('函式型 ranges 跨日後更新', async () => {
    const { $input } = await mount({
      maxDate: () => moment().format(FORMAT),
      ranges: () => ({ '今天': [moment(), moment()] }),
    });
    expect(formatRange(instanceOf($input).ranges['今天'])).toEqual(['2026-10-29', '2026-10-29']);

    crossDayClick($input, NEXT_DAY);
    expect(formatRange(instanceOf($input).ranges['今天'])).toEqual(['2026-10-30', '2026-10-30']);
  });

  it('未自訂時，預設的 maxDate 與快速區間跨日後隨之更新', async () => {
    const { $input } = await mount();

    crossDayClick($input, NEXT_DAY);
    const instance = instanceOf($input);
    expect(instance.maxDate.format(FORMAT)).toBe('2026-10-30');
    expect(formatRange(instance.ranges['最近 7 天'])).toEqual(['2026-10-24', '2026-10-30']);
  });

  it('跨日後選取維持使用者原本的選擇', async () => {
    const callback = vi.fn();
    const { picker, $input } = await mount({}, callback);

    // 模擬使用者在介面上選取 10/01 – 10/05 並按下套用
    const before = instanceOf($input);
    before.show();
    before.setStartDate(moment('2026-10-01', FORMAT));
    before.setEndDate(moment('2026-10-05', FORMAT));
    before.clickApply();
    expect(callback).toHaveBeenCalledWith('2026-10-01', '2026-10-05');

    crossDayClick($input, NEXT_DAY);
    const after = instanceOf($input);
    expect(after).not.toBe(before);
    expect(after.startDate.format(FORMAT)).toBe('2026-10-01');
    expect(after.endDate.format(FORMAT)).toBe('2026-10-05');
    expect(picker.data).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-05', initDate: '2026-10-30' });
  });

  it('跨日重建後顯示的是新的實例', async () => {
    const { $input } = await mount();
    const before = instanceOf($input);

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input).isShowing).toBe(true);
    expect(before.isShowing).toBe(false); // 已 remove() 的舊實例不應再被 show()
  });

  it('開啟中跨日重建：捨棄未套用的選取，不觸發 callback，input 與 data 一致', async () => {
    const callback = vi.fn();
    const { picker, $input } = await mount({}, callback);
    const before = instanceOf($input);

    // 使用者在開啟的月曆上點了 10/01 – 10/05，但還沒按套用
    before.show();
    before.setStartDate(moment('2026-10-01', FORMAT));
    before.setEndDate(moment('2026-10-05', FORMAT));

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input).isShowing).toBe(true);

    $(document.body).trigger('mousedown'); // 點外部關閉
    expect(callback).not.toHaveBeenCalled();
    expect(picker.data).toMatchObject({ startDate: '2026-10-23', endDate: '2026-10-29' });
    expect($input.val()).toBe('2026-10-23 – 2026-10-29');
    expect(instanceOf($input).isShowing).toBe(false);
  });

  it('跨日後尚未點選就呼叫 update()，以新的一天的上限更新', async () => {
    const { picker, $input } = await mount({ maxDate: () => moment().format(FORMAT) });

    vi.setSystemTime(NEXT_DAY);
    picker.update('2026-10-24', '2026-10-30');

    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-30');
    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-30');
    expect(picker.data.endDate).toBe('2026-10-30');
  });

  it.each(['focus', 'click'])('跨日後以 %s 開啟（例如 Tab 聚焦）也會重建並顯示新的實例', async (eventType) => {
    const { $input } = await mount({ maxDate: () => moment().format(FORMAT) });
    const before = instanceOf($input);

    vi.setSystemTime(NEXT_DAY);
    $input.trigger(eventType);

    const after = instanceOf($input);
    expect(after).not.toBe(before);
    expect(after.maxDate.format(FORMAT)).toBe('2026-10-30');
    expect(after.isShowing).toBe(true);
    expect(before.isShowing).toBe(false); // 舊實例不應被 show()
  });

  it('dateFormat 含時間時，同一天內點選不會被當成跨日而重建', async () => {
    const { $input } = await mount({
      timePicker: true,
      dateFormat: 'YYYY-MM-DD HH:mm',
      startDate: '2026-10-29 08:00',
      endDate: '2026-10-29 09:00',
    });
    const before = instanceOf($input);

    crossDayClick($input, new Date(2026, 9, 29, 23, 5)); // 同一天、不同分鐘
    expect(instanceOf($input)).toBe(before);
  });

  it('初始化時 endDate 超過 maxDate 會被夾回，data 與元件一致', async () => {
    const { picker, $input } = await mount({ startDate: '2026-10-20', endDate: '2026-10-29', maxDate: '2026-10-28' });

    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-28');
    expect(picker.data.endDate).toBe('2026-10-28');
  });
});

describe('setOptions()', () => {
  const SELECTION = { startDate: '2026-10-23', endDate: '2026-10-29', maxDate: '2026-10-29' };

  it('收窄上限時選取被夾回新上限，且不觸發 callback', async () => {
    const callback = vi.fn();
    const { picker, $input } = await mount(SELECTION, callback);
    const before = instanceOf($input);

    picker.setOptions({ maxDate: '2026-10-28' });

    const instance = instanceOf($input);
    expect(instance).not.toBe(before);
    expect(instance.maxDate.format(FORMAT)).toBe('2026-10-28');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-28');
    expect(picker.data).toMatchObject({ startDate: '2026-10-23', endDate: '2026-10-28' });
    expect($input.val()).toBe('2026-10-23 – 2026-10-28');
    expect(callback).not.toHaveBeenCalled();
  });

  it('收窄後再放寬，update() 回到原本的日期仍會更新畫面', async () => {
    const { picker, $input } = await mount(SELECTION);

    picker.setOptions({ maxDate: '2026-10-28' });
    picker.setOptions({ maxDate: '2026-10-29' });
    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-28'); // 放寬不會自動把選取擴回去

    picker.update('2026-10-23', '2026-10-29');
    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-29');
  });

  it('可傳入函式型選項，之後跨日重建時重新求值', async () => {
    const { picker, $input } = await mount(SELECTION);

    picker.setOptions({ maxDate: () => moment().subtract(1, 'days').format(FORMAT) });
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-28');

    crossDayClick($input, NEXT_DAY);
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-29');
  });

  it('未傳入的選項維持原值', async () => {
    const { picker, $input } = await mount({ ...SELECTION, minDate: '2026-10-01' });

    picker.setOptions({ maxDate: '2026-10-28' });
    expect(instanceOf($input).minDate.format(FORMAT)).toBe('2026-10-01');
  });

  it('收窄上限到起日之前時，起迄都夾到新上限', async () => {
    const { picker, $input } = await mount(SELECTION);

    picker.setOptions({ maxDate: '2026-10-20' });
    expect(instanceOf($input).startDate.format(FORMAT)).toBe('2026-10-20');
    expect(instanceOf($input).endDate.format(FORMAT)).toBe('2026-10-20');
    expect(picker.data).toMatchObject({ startDate: '2026-10-20', endDate: '2026-10-20' });
  });

  it('開啟中呼叫：維持開啟、捨棄未套用的選取，且不觸發 callback', async () => {
    const callback = vi.fn();
    const { picker, $input } = await mount(SELECTION, callback);
    const before = instanceOf($input);
    before.show();
    before.setStartDate(moment('2026-10-01', FORMAT));
    before.setEndDate(moment('2026-10-05', FORMAT));

    picker.setOptions({ maxDate: '2026-10-28' });
    expect(instanceOf($input).isShowing).toBe(true);

    $(document.body).trigger('mousedown'); // 點外部關閉
    expect(callback).not.toHaveBeenCalled();
    expect(picker.data).toMatchObject({ startDate: '2026-10-23', endDate: '2026-10-28' });
    expect($input.val()).toBe('2026-10-23 – 2026-10-28');
  });

  it('變更 dateFormat 時，目前的選取與預設上限改用新格式', async () => {
    const { picker, $input } = await mount();

    picker.setOptions({ dateFormat: 'DD/MM/YYYY' });
    expect(picker.data).toMatchObject({ startDate: '23/10/2026', endDate: '29/10/2026' });
    expect(instanceOf($input).maxDate.format(FORMAT)).toBe('2026-10-29');
    expect($input.val()).toBe('23/10/2026 – 29/10/2026');
  });

  it('重建後保留呼叫端掛在 input 上的 jQuery data', async () => {
    const { picker, $input } = await mount(SELECTION);
    $input.data('brand', 'A');

    picker.setOptions({ maxDate: '2026-10-28' });
    expect($input.data('brand')).toBe('A');
  });

  it('重建時不沿用上一次建構時的選項', async () => {
    const { picker, $input } = await mount({ ...SELECTION, ranges: { '昨天': ['2026-10-28', '2026-10-28'] } });

    picker.setOptions({ ranges: () => undefined });
    expect(instanceOf($input).ranges).toEqual({});
  });

  it('元件 ready 前呼叫只合併選項，ready 時套用', async () => {
    const callback = vi.fn();
    const { picker, $input, ready } = create(SELECTION, callback);

    picker.setOptions({ maxDate: '2026-10-28' });
    await ready;

    const instance = instanceOf($input);
    expect(instance.maxDate.format(FORMAT)).toBe('2026-10-28');
    expect(instance.endDate.format(FORMAT)).toBe('2026-10-28');
    expect(picker.data.endDate).toBe('2026-10-28');
    expect(callback).not.toHaveBeenCalled();
  });
});
