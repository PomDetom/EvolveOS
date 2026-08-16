import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const APP_URL = '/?mode=app';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('牛马笔记：日报', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const d = new Date(y.getFullYear(), y.getMonth(), 1); // 本月 1 号，规避跨月 flake
      if (iso(d) === iso(new Date())) d.setDate(2); // 今天=1号时避开，防新建 today 触发覆盖确认
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(d), primary: '推进需求联调', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1000 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
  });

  test('写日报全流程：新建→列表→编辑→删除', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__report-row')).toHaveCount(1);
    await expect(page.locator('.notes__report-row').first()).toContainText('推进需求联调');

    // 新建（默认今天）
    await page.locator('.notes__write .c-btn').click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    const today = iso(new Date());
    await page.locator('[data-notes-ed="date"]').fill(today);
    await page.locator('input[name="notes-attendance"][value="overtime"]').check();
    await page.locator('[data-notes-ed="primary"]').fill('写新日报');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.notes__report-row')).toHaveCount(2);
    await expect(page.locator(`.notes__report-row[data-date="${today}"]`)).toContainText('写新日报');

    // 编辑：点击该行 → 改内容 → 保存
    await page.locator(`.notes__report-row[data-date="${today}"]`).click();
    await page.locator('[data-notes-ed="primary"]').fill('改后的日报');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator(`.notes__report-row[data-date="${today}"]`)).toContainText('改后的日报');

    // 删除：进编辑器 → 删除 → 确认
    await page.locator(`.notes__report-row[data-date="${today}"]`).click();
    await page.locator('[data-notes-ed="del"]').click();
    await page.locator('.c-dialog__footer .c-btn:last-child').last().click();
    await expect(page.locator('.notes__report-row')).toHaveCount(1);
  });

  test('同日期二次保存：覆盖确认；非法保存（无日期）拒绝', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    // 无日期直接保存 → 拒绝（日期字段默认预填今天，须先清空）
    await page.locator('.notes__write .c-btn').click();
    await page.locator('[data-notes-ed="date"]').fill('');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.c-dialog')).toBeVisible(); // 仍在编辑器
    // 填日期保存两次（第一次新建，第二次覆盖确认）
    const today = iso(new Date());
    await page.locator('[data-notes-ed="date"]').fill(today);
    await page.locator('[data-notes-ed="primary"]').fill('第一版');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await page.locator('.notes__write .c-btn').click();
    await page.locator('[data-notes-ed="date"]').fill(today);
    await page.locator('[data-notes-ed="primary"]').fill('第二版');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.c-dialog')).toHaveCount(2); // 覆盖确认对话框
    await page.locator('.c-dialog__footer .c-btn:last-child').last().click(); // 确认覆盖
    await expect(page.locator(`.notes__report-row[data-date="${today}"]`)).toContainText('第二版');
    await expect(page.locator(`.notes__report-row[data-date="${today}"]`)).toHaveCount(1); // 覆盖未产生重复行
    await expect(page.locator('.notes__report-row')).toHaveCount(2); // seed（本月1/2号）+ 今天
  });

  test('编辑改日期：原日期记录移除，无重复', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__report-row')).toHaveCount(1);
    const xDate = await page.locator('.notes__report-row').first().getAttribute('data-date');
    // 找空闲日 Y：本月内、非今天、非原日期（当前仅 seed 一条）
    const y = new Date();
    let yDate;
    for (let d = 3; d <= 28; d += 1) {
      const cand = iso(new Date(y.getFullYear(), y.getMonth(), d));
      if (cand !== xDate && cand !== iso(new Date())) { yDate = cand; break; }
    }
    expect(yDate).toBeTruthy();
    // 点击行进入编辑 → 改日期为 Y → 保存
    await page.locator('.notes__report-row').first().click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    await page.locator('[data-notes-ed="date"]').fill(yDate);
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    // 原日期消失、新日期出现、总数 1（无重复）
    await expect(page.locator('.notes__report-row')).toHaveCount(1);
    await expect(page.locator(`.notes__report-row[data-date="${yDate}"]`)).toHaveCount(1);
    await expect(page.locator(`.notes__report-row[data-date="${xDate}"]`)).toHaveCount(0);
  });
});

test.describe('牛马笔记：模板', () => {
  test('内置示例模板：首用播种 3 条，可删至空，重载不重播种', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="templates"]').click();
    await page.waitForTimeout(400);
    // 首用：3 条内置示例模板可见
    await expect(page.locator('.notes__template-row')).toHaveCount(3);
    await expect(page.locator('.notes__template-list')).toContainText('需求开发');
    await expect(page.locator('.notes__template-list')).toContainText('日常总结');
    await expect(page.locator('.notes__template-list')).toContainText('会议纪要');
    // 逐个删除到空（每次带确认）
    for (let i = 0; i < 3; i += 1) {
      await page.locator('[data-notes-template-del]').first().click();
      await page.locator('.c-dialog__footer .c-btn:last-child').click();
    }
    await expect(page.locator('.notes__template-list .c-empty')).toBeVisible(); // 可删至空
    // 重载页面 → 存过 []（用户删空）不重播种
    await page.reload();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="templates"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__template-row')).toHaveCount(0);
    await expect(page.locator('.notes__template-list .c-empty')).toBeVisible();
  });

  test('模板增删改 + 编辑器一键填入', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    // 进模板目录
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="templates"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__template-list')).toBeVisible();
    // 首用播种 3 条内置示例 → 先删空，回到原始空态流程
    await expect(page.locator('.notes__template-row')).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await page.locator('[data-notes-template-del]').first().click();
      await page.locator('.c-dialog__footer .c-btn:last-child').click();
    }
    await expect(page.locator('.notes__template-list .c-empty')).toBeVisible(); // 空态（壳内其它应用也有 .c-empty，须限定在模板列表内）

    // 新建模板
    await page.locator('.notes__write .c-btn').click();
    await page.locator('[data-notes-tpl="name"]').fill('需求开发');
    await page.locator('[data-notes-tpl="primary"]').fill('推进 XX 需求联调');
    await page.locator('[data-notes-tpl="secondary"]').fill('整理技术方案');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.notes__template-row')).toHaveCount(1);
    await expect(page.locator('.notes__template-row')).toContainText('需求开发');

    // 编辑模板
    await page.locator('[data-notes-template-edit]').click();
    await page.locator('[data-notes-tpl="name"]').fill('需求开发改');
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.notes__template-row')).toContainText('需求开发改');

    // 写日报 → 从模板一键填入
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="report"]').click();
    await page.waitForTimeout(400);
    await page.locator('.notes__write .c-btn').click();
    await page.locator('.notes__tpl-picker .c-popover__trigger').click(); // 打开模板 picker
    await page.locator('[data-notes-template]').click(); // 填第一条模板
    await expect(page.locator('[data-notes-ed="primary"]')).toHaveValue('推进 XX 需求联调');
    await expect(page.locator('[data-notes-ed="secondary"]')).toHaveValue('整理技术方案');

    // 删除模板
    await page.locator('.c-dialog__footer .c-btn').first().click(); // 关编辑器
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="templates"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-notes-template-del]').click();
    await page.locator('.c-dialog__footer .c-btn:last-child').click(); // 删除确认
    await expect(page.locator('.notes__template-row')).toHaveCount(0);
  });
});

test.describe('牛马笔记：统计与日历', () => {
  test.describe.configure({ retries: 1 }); // 冷启动渲染进程崩溃 flake（隔离复跑绿即接受）→ 重试 1 次
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const d1 = new Date(y.getFullYear(), y.getMonth(), 1);
      const d2 = new Date(y.getFullYear(), y.getMonth(), 2);
      const d5 = new Date(y.getFullYear(), y.getMonth(), 5); // normal 放 5 号：任意月起始日首周必完全可见（盲周至多 4 天）
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(d1), primary: '出差日', secondary: '', attendance: 'overtime', phase: 'regular', location: 'xian', updatedAt: 1 },
        { date: iso(d2), primary: '半天请假', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 2 },
        { date: iso(d5), primary: '正常日', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 3 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
  });

  test('Dashboard 布局：左栏日历全高 + 右栏汇总竖排 + 统计行/日历着色/彩色 breakdown', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    // Dashboard：左栏日历 + 右栏汇总（日历在左、汇总在右）
    const calBox = await page.locator('.notes__dash-cal').boundingBox();
    const statsBox = await page.locator('.notes__dash-stats').boundingBox();
    expect(calBox.x).toBeLessThan(statsBox.x);
    // 左栏含 日历滚动区 + 图例；右栏含 工具栏 + 累计组 + 活动月组（纵向排列）
    await expect(page.locator('.notes__dash-cal [data-notes-cal-scroll]')).toBeVisible();
    await expect(page.locator('.notes__dash-cal .notes__legend')).toBeVisible();
    await expect(page.locator('.notes__dash-stats .notes__toolbar')).toBeVisible();
    await expect(page.locator('.notes__dash-stats [data-notes-stats-total]')).toBeVisible();
    await expect(page.locator('.notes__dash-stats [data-notes-stats-month]')).toBeVisible();

    // 页面自身不滚动（notes 页固定高度 + overflow hidden）；日历区内部滚动可达
    const pageOverflow = await page.locator('.app-main__page[data-page="notes"]').evaluate((el) => getComputedStyle(el).overflow);
    expect(pageOverflow).toBe('hidden');
    const calScrollBox = await page.locator('[data-notes-cal-scroll]').evaluate((el) => {
      const s = getComputedStyle(el);
      return { overflowY: s.overflowY, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    });
    expect(calScrollBox.overflowY).toBe('auto');
    expect(calScrollBox.scrollHeight).toBeGreaterThan(calScrollBox.clientHeight);
    const statsScrollY = await page.locator('.notes__dash-stats').evaluate((el) => getComputedStyle(el).overflowY);
    expect(statsScrollY).toBe('auto');

    // 每组 5 张统计卡改为竖排行（label 左、值右一行）
    await expect(page.locator('[data-notes-stats-total] .notes__stat-row')).toHaveCount(5);
    await expect(page.locator('[data-notes-stats-month] .notes__stat-row')).toHaveCount(5);
    await expect(page.locator('.notes__stat-row').first()).toContainText('牛马日');
    // 累计组（本页数据全在当前月，累计=当月）：牛马日 = 1 + 0.5 + 1 = 2.5；实习期 2；正式期 1；出差日 1；休息日 0
    await expect(page.locator('.notes__stats-group').first()).toContainText('累计');
    await expect(page.locator('.notes__stats-group').first()).toContainText('2.5');
    await expect(page.locator('.notes__stats-group').first()).toContainText('实习期');
    await expect(page.locator('.notes__stats-group').first()).toContainText('出差日');
    // 活动月组（默认当前月）：标题为月份名，数据同累计
    const y = new Date();
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText(`${y.getFullYear()}年${y.getMonth() + 1}月`);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText('2.5');

    // 彩色 breakdown：正常/加班/休息日各自色类，请假三态统一 leave 色
    await expect(page.locator('[data-notes-stats-month] .notes__breakdown-item--normal')).toHaveCount(1);
    await expect(page.locator('[data-notes-stats-month] .notes__breakdown-item--overtime')).toHaveCount(1);
    await expect(page.locator('[data-notes-stats-month] .notes__breakdown-item--rest')).toHaveCount(1);
    await expect(page.locator('[data-notes-stats-month] .notes__breakdown-item--leave')).toHaveCount(3);

    // 日历：3 个格子带对应着色类（连续周流仍各 1）
    await expect(page.locator('.notes__cal-cell--normal')).toHaveCount(1);
    await expect(page.locator('.notes__cal-cell--leave-am')).toHaveCount(1);
    await expect(page.locator('.notes__cal-cell--overtime')).toHaveCount(1);
    // 请假半格：--leave-am/--leave-pm 用 linear-gradient（上半请假色/下半正常色）
    const leaveBg = await page.locator('.notes__cal-cell--leave-am').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(leaveBg).toContain('linear-gradient');
    // 出差角标（xian）
    await expect(page.locator('.notes__cal-cell--trip')).toHaveCount(1);
    await expect(page.locator('.notes__cal-trip-dot')).toHaveCount(1);
    // 正方形格：宽高近似相等（aspect-ratio: 1 生效）
    const cellBox = await page.locator('.notes__cal-cell').first().boundingBox();
    expect(Math.abs(cellBox.width - cellBox.height)).toBeLessThan(2);
    // 无月块/月标题分隔（连续周流单段）
    await expect(page.locator('.notes__cal-month')).toHaveCount(0);
    await expect(page.locator('.notes__cal-month-title')).toHaveCount(0);
    await expect(page.locator('.notes__cal-week--head')).toHaveCount(1);
    // 今天实心圆：::before 圆（accent 底）+ accent-contrast 字；直径缩至格宽 2/3（原 inset 2px → calc(100%/6)）
    await expect(page.locator('.notes__cal-cell--today')).toHaveCount(1);
    const todayBefore = await page.locator('.notes__cal-cell--today').evaluate((el) => {
      const b = getComputedStyle(el, '::before');
      return { radius: b.borderRadius, bg: b.backgroundColor, insetTop: parseFloat(b.top), insetBottom: parseFloat(b.bottom) };
    });
    expect(todayBefore.radius).toBe('50%');
    expect(todayBefore.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(todayBefore.insetTop).toBeGreaterThan(2);
    expect(todayBefore.insetBottom).toBeGreaterThan(2);
    // 悬浮描边圆环（替代持久选中环）：hover 出勤格 → ::after accent 圆环；无 --selected 类
    await expect(page.locator('.notes__cal-cell--selected')).toHaveCount(0);
    await page.locator('.notes__cal-cell--normal').first().hover();
    const hoverShadow = await page.locator('.notes__cal-cell--normal').first().evaluate((el) => getComputedStyle(el, '::after').boxShadow);
    expect(hoverShadow).not.toBe('none');
    await page.mouse.move(0, 0);
    // 图例：正常/加班/休息日/请假（单琥珀块）/出差，无 半天·上/下 /全天 /西安
    const legendText = await page.locator('.notes__legend').innerText();
    expect(legendText).toContain('正常');
    expect(legendText).toContain('加班');
    expect(legendText).toContain('休息日');
    expect(legendText).toContain('请假');
    expect(legendText).toContain('出差');
    expect(legendText).not.toContain('半天');
    expect(legendText).not.toContain('全天');
    expect(legendText).not.toContain('西安');
    // 点日历格 → 打开该日编辑器（无持久选中态）
    await page.locator('.notes__cal-cell--normal').click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    await expect(page.locator('[data-notes-ed="primary"]')).toHaveValue('正常日');
    await page.locator('.c-dialog__footer .c-btn').first().click(); // 取消关闭
    await expect(page.locator('.c-dialog')).toHaveCount(0);

    // 连续日期灰格存在（相邻月填充），点击不弹编辑器
    // 直接对「视口内灰格」派发 click：绕开 Playwright 自动滚动（滚动会触发活动月联动+重着色，灰格可能就地变回 in-month）
    expect(await page.locator('.notes__cal-cell--out').count()).toBeGreaterThan(0);
    await page.locator('.notes__cal-cell--out').evaluateAll((cells) => {
      const vr = document.querySelector('[data-notes-cal-scroll]').getBoundingClientRect();
      const visible = Array.from(cells).find((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= vr.top && r.bottom <= vr.bottom;
      });
      visible?.click();
    });
    await expect(page.locator('.c-dialog')).toHaveCount(0);
  });

  test('回溯可达：无记录月（当前月−2）可达且该月格可点开编辑器', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('evolveos.notes.reports', '[]');
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    const y = new Date();
    const target = new Date(y.getFullYear(), y.getMonth() - 2, 1);
    const targetYM = `${target.getFullYear()}-${target.getMonth()}`;
    // 目标月周行存在（连续周流窗口覆盖回溯月份；月可占多行，取首行）
    await expect(page.locator(`[data-notes-cal-scroll] .notes__cal-week[data-ym="${targetYM}"]`).first()).toBeVisible();
    // 滚动到目标月首行
    await page.locator('[data-notes-cal-scroll]').evaluate((el, ym) => {
      const head = el.querySelector('.notes__cal-head');
      const row = el.querySelector(`.notes__cal-week[data-ym="${ym}"]`);
      el.scrollTop = row.offsetTop - head.offsetHeight;
      el.dispatchEvent(new Event('scroll'));
    }, targetYM);
    // 点该月某 in-month 格 → 打开该日编辑器
    const cellDate = await page.locator(`.notes__cal-cell[data-ym="${targetYM}"][data-date]`).first().getAttribute('data-date');
    expect(cellDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.locator(`.notes__cal-cell[data-ym="${targetYM}"][data-date]`).first().click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    await expect(page.locator('[data-notes-ed="date"]')).toHaveValue(cellDate);
    await page.locator('.c-dialog__footer .c-btn').first().click(); // 取消关闭
  });
});

test.describe('牛马笔记：统计滚动联动', () => {
  test('滚动到上月周行 → 底部组标题/统计跟随 + 上月着色/相邻灰化', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const cur = new Date(y.getFullYear(), y.getMonth(), 1);
      const prev = new Date(y.getFullYear(), y.getMonth() - 1, 15);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(cur), primary: '本月记录', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(prev), primary: '上月记录', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 2 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    const monthStat = (groupIndex) => page.locator('.notes__stats-group').nth(groupIndex).locator('.notes__stat-value').first();
    const y = new Date();
    const prevM = new Date(y.getFullYear(), y.getMonth() - 1, 1);
    const prevLabel = `${prevM.getFullYear()}年${prevM.getMonth() + 1}月`;
    const curLabel = `${y.getFullYear()}年${y.getMonth() + 1}月`;
    const prevYM = `${prevM.getFullYear()}-${prevM.getMonth()}`;
    // 上月周行存在（连续周流跨度覆盖最早记录月；月可占多行，取首行）
    await expect(page.locator(`[data-notes-cal-scroll] .notes__cal-week[data-ym="${prevYM}"]`).first()).toBeVisible();

    // 初始：活动月=本月，底部组标题=本月，牛马日=1（normal）
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText(curLabel);
    await expect(monthStat(1)).toHaveText('1天');

    // 滚动到上月首行 → 联动更新底部组（上月 1 条 leave-am → 0.5）
    await page.locator('[data-notes-cal-scroll]').evaluate((el, ym) => {
      const head = el.querySelector('.notes__cal-head');
      const row = el.querySelector(`.notes__cal-week[data-ym="${ym}"]`);
      el.scrollTop = row.offsetTop - head.offsetHeight;
      el.dispatchEvent(new Event('scroll'));
    }, prevYM);
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText(prevLabel);
    await expect(monthStat(1)).toHaveText('0.5天');
    // 上月日期着色（该月 leave-am 记录格仍彩色）、相邻当前月灰化
    await expect(page.locator(`.notes__cal-cell[data-date="${iso(new Date(y.getFullYear(), y.getMonth() - 1, 15))}"]`)).toHaveClass(/notes__cal-cell--leave-am/);
    await expect(page.locator(`.notes__cal-cell[data-date="${iso(new Date(y.getFullYear(), y.getMonth(), 1))}"]`)).toHaveClass(/notes__cal-cell--out/);
    await expect(page.locator('.notes__cal-cell--normal')).toHaveCount(0); // 当前月记录不再着色
  });
});

test.describe('牛马笔记：统计月切换', () => {
  test('日历 ‹ › 切换：标签/底部组联动', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const cur = new Date(y.getFullYear(), y.getMonth(), 1);
      const prev = new Date(y.getFullYear(), y.getMonth() - 1, 15);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(cur), primary: '本月记录', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(prev), primary: '上月记录', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 2 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    const monthStat = (groupIndex) => page.locator('.notes__stats-group').nth(groupIndex).locator('.notes__stat-value').first();
    const y = new Date();
    const curLabel = `${y.getFullYear()}年${y.getMonth() + 1}月`;
    const prevM = new Date(y.getFullYear(), y.getMonth() - 1, 1);
    const prevLabel = `${prevM.getFullYear()}年${prevM.getMonth() + 1}月`;
    // 初始本月：底部组标题=本月，牛马日=1
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(monthStat(1)).toHaveText('1天');
    // ‹ 上月：标签/底部组更新为上月（0.5）
    await page.locator('[data-notes-cal-prev]').click();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText(prevLabel);
    await expect(monthStat(1)).toHaveText('0.5天');
    // › 回本月
    await page.locator('[data-notes-cal-next]').click();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(monthStat(1)).toHaveText('1天');
  });

  test('月标签弹面板：选上月 → 日历滚动 + 底部组联动', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const cur = new Date(y.getFullYear(), y.getMonth(), 1);
      const prev = new Date(y.getFullYear(), y.getMonth() - 1, 15);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(cur), primary: '本月记录', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(prev), primary: '上月记录', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 2 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    const monthStat = (groupIndex) => page.locator('.notes__stats-group').nth(groupIndex).locator('.notes__stat-value').first();
    const y = new Date();
    const prevM = new Date(y.getFullYear(), y.getMonth() - 1, 1);
    const prevLabel = `${prevM.getFullYear()}年${prevM.getMonth() + 1}月`;

    // 打开月面板
    await page.locator('[data-notes-cal-label]').click();
    await expect(page.locator('[data-notes-cal-picker]')).toBeVisible();
    await expect(page.locator('[data-cal-year-label]')).toHaveText(String(y.getFullYear()));
    // 上月跨年时先退一年
    if (prevM.getFullYear() !== y.getFullYear()) {
      await page.locator('[data-cal-year-prev]').click();
      await expect(page.locator('[data-cal-year-label]')).toHaveText(String(prevM.getFullYear()));
    }
    // 选上月 → 面板关闭 + 标签/底部组联动
    await page.locator(`[data-cal-month="${prevM.getMonth()}"]`).click();
    await expect(page.locator('[data-notes-cal-picker]')).toBeHidden();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText(prevLabel);
    await expect(monthStat(1)).toHaveText('0.5天');
    // 日历已滚动到该月首行（行顶落入滚动视口；平滑滚动需轮询等待落定）
    await expect.poll(() => page.evaluate((ym) => {
      const scrollEl = document.querySelector('[data-notes-cal-scroll]');
      const row = scrollEl.querySelector(`.notes__cal-week[data-ym="${ym}"]`);
      const s = scrollEl.getBoundingClientRect();
      const b = row.getBoundingClientRect();
      return b.top >= s.top && b.top < s.bottom;
    }, `${prevM.getFullYear()}-${prevM.getMonth()}`)).toBe(true);
  });
});

test.describe('牛马笔记：导出/导入', () => {
  test('导出下载 JSON → 清空后导入恢复', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const d = new Date(y.getFullYear(), y.getMonth(), 1); // 本月 1 号，导入后日历格落当前月
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(d), primary: '导出的日报', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
      ]));
      localStorage.setItem('evolveos.notes.templates', JSON.stringify([
        { id: 't1', name: '导出模板', primary: 'p', secondary: 's', createdAt: 1, updatedAt: 1 },
      ]));
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    // 导出
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.notes__io .c-btn').first().click(),
    ]);
    const filePath = await download.path();
    // spec §3.4：文件名 `牛马笔记-YYYYMMDD.json`（无连字符）
    expect(download.suggestedFilename()).toBe(`牛马笔记-${iso(new Date()).replace(/-/g, '')}.json`);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(json.app).toBe('evolveos.notes');
    expect(json.reports).toHaveLength(1);
    expect(json.templates).toHaveLength(1);

    // 清空数据（直接写 localStorage，模拟丢数据）
    await page.evaluate(() => localStorage.removeItem('evolveos.notes.reports'));

    // 导入恢复
    const fcPromise = page.waitForEvent('filechooser');
    await page.locator('.notes__io .c-btn').nth(1).click();
    const fc = await fcPromise;
    await fc.setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
    // 覆盖确认
    await expect(page.locator('.c-dialog')).toBeVisible();
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    // 日历恢复该日着色
    await expect(page.locator('.notes__cal-cell--normal')).toHaveCount(1);
  });

  test('导入非法文件：拒绝且数据不动', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('evolveos.notes.reports', '[]');
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    const fcPromise = page.waitForEvent('filechooser');
    await page.locator('.notes__io .c-btn').nth(1).click();
    const fc = await fcPromise;
    await fc.setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"other"}') });
    await expect(page.locator('.c-dialog')).toHaveCount(0); // 无覆盖确认 → 直接拒绝
    await expect(page.locator('.c-toast--danger')).toBeVisible();
  });
});

test.describe('牛马笔记：编辑器选项拖拽换位', () => {
  test('出勤选项拖拽换位：保存后重开编辑器顺序保持', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('evolveos.notes.reports', '[]');
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.notes__write .c-btn').click();
    await expect(page.locator('.c-dialog')).toBeVisible();

    const group = page.locator('[data-notes-opt-group="attendance"]');
    await expect(group.locator('.notes__seg-item')).toHaveCount(6);
    // HTML5 拖拽序列模拟（dragTo 不触发原生 drag 事件）：dragstart(源) → dragover/drop(目标中心) → dragend(源)
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-notes-opt-group="attendance"] .notes__seg-item'));
      const source = items[1];
      const target = items[0];
      const dt = new DataTransfer();
      const rect = target.getBoundingClientRect();
      const mk = (type) => new DragEvent(type, { dataTransfer: dt, clientY: rect.top + rect.height / 2, bubbles: true, cancelable: true });
      source.dispatchEvent(mk('dragstart'));
      target.dispatchEvent(mk('dragover'));
      target.dispatchEvent(mk('drop'));
      source.dispatchEvent(mk('dragend'));
    });
    await expect(group.locator('.notes__seg-item').nth(0).locator('input')).toHaveValue('overtime');
    await expect(group.locator('.notes__seg-item').nth(1).locator('input')).toHaveValue('normal');

    // 保存 → 重开编辑器 → 顺序保持（持久化生效）
    await page.locator('.c-dialog__footer .c-btn:last-child').click();
    await expect(page.locator('.c-dialog')).toHaveCount(0);
    await page.locator('.notes__write .c-btn').click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    const group2 = page.locator('[data-notes-opt-group="attendance"]');
    await expect(group2.locator('.notes__seg-item').nth(0).locator('input')).toHaveValue('overtime');
    await expect(group2.locator('.notes__seg-item').nth(1).locator('input')).toHaveValue('normal');
  });
});
