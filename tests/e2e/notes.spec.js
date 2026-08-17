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

  test('日报列表超高：末条可达（body 内部滚动，页面固定高度不裁切）', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const reports = [];
      for (let d = 1; d <= 15; d += 1) {
        reports.push({ date: iso(new Date(y.getFullYear(), y.getMonth(), d)), primary: `日报第${d}条`, secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: d });
      }
      localStorage.setItem('evolveos.notes.reports', JSON.stringify(reports));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__report-row')).toHaveCount(15);
    // body 即滚动容器（overflow-y:auto，内容超高）——页面 height:100% 下不被裁切、用户可滚到末条
    const bodyScroll = await page.locator('.app-main__page[data-page="notes"] .app-main__page-body').evaluate((el) => {
      const s = getComputedStyle(el);
      return { overflowY: s.overflowY, scrollH: el.scrollHeight, clientH: el.clientHeight };
    });
    expect(bodyScroll.overflowY).toBe('auto');
    expect(bodyScroll.scrollH).toBeGreaterThan(bodyScroll.clientH);
    // 滚动 body 容器到底 → 末条进入浏览器视口（scrollIntoViewIfNeeded 会被 overflow:hidden 祖先程序性吞掉，不用它）
    await page.locator('.app-main__page[data-page="notes"] .app-main__page-body').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(100);
    const lastTop = await page.locator('.notes__report-row').last().evaluate((el) => el.getBoundingClientRect().top);
    expect(lastTop).toBeGreaterThanOrEqual(0);
    expect(lastTop).toBeLessThan(await page.evaluate(() => window.innerHeight));
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

  test('Dashboard 布局：左栏日历全高 + 右栏汇总竖排 + 统计方块/日历着色', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    // Dashboard：左栏日历 + 右栏汇总（日历在左、汇总在右）
    const calBox = await page.locator('.notes__dash-cal').boundingBox();
    const statsBox = await page.locator('.notes__dash-stats').boundingBox();
    expect(calBox.x).toBeLessThan(statsBox.x);
    // 日历宽 = 页面 2/3（.notes__dash-cal flex-basis 66.67%）：dash 容器内 cal 宽占比 ≈ 2/3
    const dashBox = await page.locator('.notes__dash').boundingBox();
    expect(calBox.width / dashBox.width).toBeCloseTo(2 / 3, 2);
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
    // 右栏内容自然高度（不再撑满屏）：align-self: flex-start + max-height:100% 兜底内部滚动
    const dashStatsLayout = await page.locator('.notes__dash-stats').evaluate((el) => {
      const s = getComputedStyle(el);
      return { alignSelf: s.alignSelf, maxHeight: s.maxHeight };
    });
    expect(dashStatsLayout.alignSelf).toBe('flex-start');
    expect(dashStatsLayout.maxHeight).toBe('100%');

    // 两列左右：.notes__stats-columns flex 两列；左=活动月组、右=累计组（x 坐标左<右）
    const columnsDisplay = await page.locator('.notes__stats-columns').evaluate((el) => getComputedStyle(el).display);
    expect(columnsDisplay).toBe('flex');
    const monthBox = await page.locator('[data-notes-stats-month]').boundingBox();
    const totalBox = await page.locator('[data-notes-stats-total]').boundingBox();
    expect(monthBox.x).toBeLessThan(totalBox.x);
    await expect(page.locator('.notes__stats-group')).toHaveCount(2);
    // 各组 6 张非零卡片（label 上/值下/单位「天」）——七卡非零过滤：休息日 0 隐藏，加班/请假 1 显示
    await expect(page.locator('[data-notes-stats-month] .notes__stat-card')).toHaveCount(6);
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card')).toHaveCount(6);
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card').first().locator('.notes__stat-label')).toHaveText('牛马日');
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card').first().locator('.notes__stat-value')).toHaveText('2.5天');
    // 6 卡值（本页数据全在当前月，累计=当月；固定顺序 牛马日/实习期/正式期/出差日/加班/请假）：2.5；2；1；1；1；1
    await expect(page.locator('[data-notes-stats-total] .notes__stat-value')).toHaveText(['2.5天', '2天', '1天', '1天', '1天', '1天']);
    // 加班卡、请假卡存在（seed 非零）；值为 0 的休息日卡不渲染
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card').filter({ hasText: '加班' })).toHaveCount(1);
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card').filter({ hasText: '请假' })).toHaveCount(1);
    await expect(page.locator('[data-notes-stats-total] .notes__stat-card').filter({ hasText: '休息日' })).toHaveCount(0);
    // 卡片半宽居中：.notes__stat-card 宽 ≈ 列宽一半，且水平居中（align-items: center）
    const cardsBox = await page.locator('[data-notes-stats-total] .notes__stats-cards').boundingBox();
    const firstCardBox = await page.locator('[data-notes-stats-total] .notes__stat-card').first().boundingBox();
    expect(Math.abs(firstCardBox.width - cardsBox.width / 2)).toBeLessThan(2);
    expect(Math.abs(firstCardBox.x - cardsBox.x - (cardsBox.width - firstCardBox.width) / 2)).toBeLessThan(2);
    // 左组标题=活动月标签、右组标题=累计
    const y = new Date();
    await expect(page.locator('.notes__stats-group').nth(0)).toContainText(`${y.getFullYear()}年${y.getMonth() + 1}月`);
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText('累计');

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
    // 日历头底色与日历容器一体（--surface-1，非纯白 --surface-solid）
    const headBg = await page.locator('.notes__cal-head').evaluate((el) => getComputedStyle(el).backgroundColor);
    const scrollBg = await page.locator('[data-notes-cal-scroll]').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(headBg).toBe(scrollBg);
    const headAlpha = await page.locator('.notes__cal-head').evaluate((el) => {
      const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) return 1; // 无 alpha 的 rgb → 视为 opaque
      const parts = m[1].split(',').map((x) => parseFloat(x));
      return parts.length === 4 ? parts[3] : 1;
    });
    expect(headAlpha).toBeLessThan(1);
    // 今天无任何标记（--today 类已彻底移除）：今天格与其他格一样普通
    await expect(page.locator('.notes__cal-cell--today')).toHaveCount(0);
    // 悬浮描边圆环（替代持久选中环）：hover 出勤格 → ::after accent 圆环；无 --selected 类
    await expect(page.locator('.notes__cal-cell--selected')).toHaveCount(0);
    await page.locator('.notes__cal-cell--normal').first().hover();
    const hoverShadow = await page.locator('.notes__cal-cell--normal').first().evaluate((el) => getComputedStyle(el, '::after').boxShadow);
    expect(hoverShadow).not.toBe('none');
    // 灰化格悬浮不显环：加载样式表含 `.notes__cal-cell--out:hover::after { content:none }`（覆盖通用 hover 环；行为级 hover 会触发滚动联动导致灰格重着色，故用规则存在性守卫）
    const hasOutHoverGuard = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) {
          if (r.selectorText && r.selectorText.includes('.notes__cal-cell--out:hover::after') && r.style.content === 'none') return true;
        }
      }
      return false;
    });
    expect(hasOutHoverGuard).toBe(true);
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

  test('其他月份保色：非活动月有记录格保留出勤色淡化，无记录格仅灰化', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const cur = new Date(y.getFullYear(), y.getMonth(), 1);
      const prev = new Date(y.getFullYear(), y.getMonth() - 1, 15);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(cur), primary: '本月记录', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(prev), primary: '上月记录', secondary: '', attendance: 'overtime', phase: 'intern', location: 'qingdao', updatedAt: 2 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    // 活动月=本月：上月记录格 = out + 出勤类 + opacity 淡化（0 < opacity < 1）
    const y = new Date();
    const prevDate = iso(new Date(y.getFullYear(), y.getMonth() - 1, 15));
    const prevCell = page.locator(`.notes__cal-cell[data-date="${prevDate}"]`);
    await expect(prevCell).toHaveClass(/notes__cal-cell--out/);
    await expect(prevCell).toHaveClass(/notes__cal-cell--overtime/);
    const prevOpacity = await prevCell.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(prevOpacity).toBeGreaterThan(0);
    expect(prevOpacity).toBeLessThan(1);
    // 无记录 out 格：仅 --out（无出勤类），背景透明灰化
    const noRecordOut = await page.locator('.notes__cal-cell--out').evaluateAll((cells) => {
      const attrs = ['normal', 'overtime', 'rest', 'leave-am', 'leave-pm', 'leave-full'];
      const cell = Array.from(cells).find((el) => !attrs.some((a) => el.classList.contains(`notes__cal-cell--${a}`)));
      if (!cell) return null;
      const s = getComputedStyle(cell);
      return { opacity: Number(s.opacity), bg: s.backgroundColor };
    });
    expect(noRecordOut).not.toBeNull();
    expect(noRecordOut.opacity).toBeLessThan(1);
    expect(noRecordOut.bg).toBe('rgba(0, 0, 0, 0)');
    // out 格仍不可点（点击守卫保留）
    await prevCell.evaluate((el) => el.click());
    await expect(page.locator('.c-dialog')).toHaveCount(0);
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

    const monthStat = () => page.locator('[data-notes-stats-month] .notes__stat-value').first();
    const y = new Date();
    const prevM = new Date(y.getFullYear(), y.getMonth() - 1, 1);
    const prevLabel = `${prevM.getFullYear()}年${prevM.getMonth() + 1}月`;
    const curLabel = `${y.getFullYear()}年${y.getMonth() + 1}月`;
    const prevYM = `${prevM.getFullYear()}-${prevM.getMonth()}`;
    // 上月周行存在（连续周流跨度覆盖最早记录月；月可占多行，取首行）
    await expect(page.locator(`[data-notes-cal-scroll] .notes__cal-week[data-ym="${prevYM}"]`).first()).toBeVisible();

    // 初始：活动月=本月，左列组标题=本月，牛马日=1（normal）
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(page.locator('.notes__stats-group').nth(0)).toContainText(curLabel);
    await expect(monthStat()).toHaveText('1天');

    // 滚动到上月首行 → 联动更新左列组（上月 1 条 leave-am → 0.5）
    await page.locator('[data-notes-cal-scroll]').evaluate((el, ym) => {
      const head = el.querySelector('.notes__cal-head');
      const row = el.querySelector(`.notes__cal-week[data-ym="${ym}"]`);
      el.scrollTop = row.offsetTop - head.offsetHeight;
      el.dispatchEvent(new Event('scroll'));
    }, prevYM);
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(0)).toContainText(prevLabel);
    await expect(monthStat()).toHaveText('0.5天');
    // 上月日期着色（该月 leave-am 记录格仍彩色）；相邻当前月记录格 out 保色淡化（出勤类 + opacity<1）
    await expect(page.locator(`.notes__cal-cell[data-date="${iso(new Date(y.getFullYear(), y.getMonth() - 1, 15))}"]`)).toHaveClass(/notes__cal-cell--leave-am/);
    const curOutCell = page.locator(`.notes__cal-cell[data-date="${iso(new Date(y.getFullYear(), y.getMonth(), 1))}"]`);
    await expect(curOutCell).toHaveClass(/notes__cal-cell--out/);
    await expect(curOutCell).toHaveClass(/notes__cal-cell--normal/);
    const curOutOpacity = await curOutCell.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(curOutOpacity).toBeLessThan(1);
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

    const monthStat = () => page.locator('[data-notes-stats-month] .notes__stat-value').first();
    const y = new Date();
    const curLabel = `${y.getFullYear()}年${y.getMonth() + 1}月`;
    const prevM = new Date(y.getFullYear(), y.getMonth() - 1, 1);
    const prevLabel = `${prevM.getFullYear()}年${prevM.getMonth() + 1}月`;
    // 初始本月：左列组标题=本月，牛马日=1
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(monthStat()).toHaveText('1天');
    // ‹ 上月：标签/左列组更新为上月（0.5）
    await page.locator('[data-notes-cal-prev]').click();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(0)).toContainText(prevLabel);
    await expect(monthStat()).toHaveText('0.5天');
    // › 回本月
    await page.locator('[data-notes-cal-next]').click();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(curLabel);
    await expect(monthStat()).toHaveText('1天');
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

    const monthStat = () => page.locator('[data-notes-stats-month] .notes__stat-value').first();
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
    // 选上月 → 面板关闭 + 标签/左列组联动
    await page.locator(`[data-cal-month="${prevM.getMonth()}"]`).click();
    await expect(page.locator('[data-notes-cal-picker]')).toBeHidden();
    await expect(page.locator('[data-notes-cal-label]')).toHaveText(prevLabel);
    await expect(page.locator('.notes__stats-group').nth(0)).toContainText(prevLabel);
    await expect(monthStat()).toHaveText('0.5天');
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

test.describe('牛马笔记：统计右栏滚动（短视口）', () => {
  test.use({ viewport: { width: 1280, height: 360 } });
  test('右栏超高：内部滚动可达（末个统计方块可见）', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      // 7 张卡片全显（该 seed 七卡均非零：牛马日/休息日/实习期/正式期/出差日/加班/请假），极短视口下右栏内容必超高
      const d1 = new Date(y.getFullYear(), y.getMonth(), 1);
      const d2 = new Date(y.getFullYear(), y.getMonth(), 2);
      const d3 = new Date(y.getFullYear(), y.getMonth(), 3);
      const d4 = new Date(y.getFullYear(), y.getMonth(), 4);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(d1), primary: '正常', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(d2), primary: '休息', secondary: '', attendance: 'rest', phase: 'intern', location: 'qingdao', updatedAt: 2 },
        { date: iso(d3), primary: '加班出差', secondary: '', attendance: 'overtime', phase: 'regular', location: 'xian', updatedAt: 3 },
        { date: iso(d4), primary: '请假', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 4 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);
    // 极短视口下右栏内容超高 → 右栏内部滚动（max-height:100% 兜底）
    const statsBox = await page.locator('.notes__dash-stats').evaluate((el) => ({ clientH: el.clientHeight, scrollH: el.scrollHeight }));
    expect(statsBox.scrollH).toBeGreaterThan(statsBox.clientH);
    await page.locator('[data-notes-stats-month] .notes__stat-card').last().scrollIntoViewIfNeeded();
    await expect(page.locator('[data-notes-stats-month] .notes__stat-card').last()).toBeInViewport();
  });
});
