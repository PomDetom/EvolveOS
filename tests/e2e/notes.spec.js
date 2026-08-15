import { test, expect } from '@playwright/test';

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
    // 无日期直接保存 → 拒绝
    await page.locator('.notes__write .c-btn').click();
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
});

test.describe('牛马笔记：模板', () => {
  test('模板增删改 + 编辑器一键填入', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    // 进模板目录
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="templates"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.notes__template-list')).toBeVisible();
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
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const y = new Date();
      const d1 = new Date(y.getFullYear(), y.getMonth(), 1);
      const d2 = new Date(y.getFullYear(), y.getMonth(), 2);
      const d3 = new Date(y.getFullYear(), y.getMonth(), 3);
      localStorage.setItem('evolveos.notes.reports', JSON.stringify([
        { date: iso(d1), primary: '正常日', secondary: '', attendance: 'normal', phase: 'intern', location: 'qingdao', updatedAt: 1 },
        { date: iso(d2), primary: '半天请假', secondary: '', attendance: 'leave-am', phase: 'intern', location: 'qingdao', updatedAt: 2 },
        { date: iso(d3), primary: '出差日', secondary: '', attendance: 'overtime', phase: 'regular', location: 'xian', updatedAt: 3 },
      ]));
      localStorage.setItem('evolveos.notes.templates', '[]');
    });
  });

  test('统计卡：当月/累计牛马日(含0.5)/休息日/实习期/正式期/出差日 + 日历着色与角标', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('.app-main__nav-l .c-navwheel__item[data-id="notes"]').click();
    await page.waitForTimeout(400);
    await page.locator('.app-main__nav-r .c-navwheel__item[data-id="stats"]').click();
    await page.waitForTimeout(400);

    // 当月卡（本月 3 条）：牛马日 = 1 + 0.5 + 1 = 2.5；实习期 2；正式期 1；出差日 1；休息日 0
    await expect(page.locator('.notes__stats-group').first()).toContainText('当月');
    await expect(page.locator('.notes__stats-group').first()).toContainText('2.5');
    await expect(page.locator('.notes__stats-group').first()).toContainText('实习期');
    await expect(page.locator('.notes__stats-group').first()).toContainText('出差日');
    // 累计卡 = 当月卡（无跨月数据）
    await expect(page.locator('.notes__stats-group').nth(1)).toContainText('累计');

    // 日历：3 个格子带对应着色类
    await expect(page.locator('.notes__cal-cell--normal')).toHaveCount(1);
    await expect(page.locator('.notes__cal-cell--leave-am')).toHaveCount(1);
    await expect(page.locator('.notes__cal-cell--overtime')).toHaveCount(1);
    // 出差角标（xian）
    await expect(page.locator('.notes__cal-cell--trip')).toHaveCount(1);
    await expect(page.locator('.notes__cal-trip-dot')).toHaveCount(1);
    // 今天描边
    await expect(page.locator('.notes__cal-cell--today')).toHaveCount(1);
    // 图例
    await expect(page.locator('.notes__legend-item').first()).toBeVisible();

    // 点日历格 → 打开该日编辑器
    await page.locator('.notes__cal-cell--normal').click();
    await expect(page.locator('.c-dialog')).toBeVisible();
    await expect(page.locator('[data-notes-ed="primary"]')).toHaveValue('正常日');
    await page.locator('.c-dialog__footer .c-btn').first().click(); // 取消关闭
  });
});
