import { expect } from '@playwright/test';

/**
 * 进入应用壳设置分区（B1-3 迁移入口）：goto `?mode=app` → 点 ⚙（设置）→ 点第 index 个分区项。
 * 分区索引以 APP_SECTIONS 实际序为准（0.1.2 增导航后实测：通用0/导航1/外观2/…/组件9/动效10）。
 *
 * 相对任务计划书基线 helper 的两处必要微调：
 * - `.csettings__page--active` 限定在桌面设置页 section[data-page="settings"] 内，防与手机
 *   页面栈同态类 strict mode 冲突（.app-main__stack 的 settings 页渲染同套 .csettings__ 类）。
 * - 组件/动效/外观分区内容为惰性挂载（动态 import + 首次激活才渲染），等待容器非空再返回，
 *   避免测试与懒加载竞态（迁移后逐文件跑绿的前提：断言目标真实存在）。
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} index APP_SECTIONS 分区索引
 * @returns {Promise<import('@playwright/test').Locator>} 桌面设置页激活分区容器（.csettings__page--active）
 */
export async function openSettingsPartition(page, index) {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(index).click();
  const active = page.locator('.app-main__page[data-page="settings"] .csettings__page--active');
  await expect(active).toBeVisible();
  // 惰性挂载容器：外观定制器（.csettings__cust）/ 组件·动效展示（[data-partition]）
  const cust = active.locator('.csettings__cust');
  if (await cust.count()) await expect(cust).not.toBeEmpty({ timeout: 10000 });
  const partition = active.locator('[data-partition]');
  if (await partition.count()) await expect(partition).not.toBeEmpty({ timeout: 10000 });
  return active;
}

/**
 * 测量滑杆 track 的 accent 填充宽度比例（0-1）—— B5-final（find 1）修复验证。
 * Chromium 151 起 getComputedStyle 对 ::-webkit-slider-* 伪元素样式反射失效（返回原生默认值），
 * 无法用 computed 读 track 背景，改为像素级：注入样式隐藏 thumb（仅测试，防 surface-2 拇指
 * 在填充区产生干扰列）→ 元素截图 → 页内 canvas 解码 PNG → 轨道中线逐列分类 accent 色
 * （页内探针 resolve var(--accent)，opaque 色直接比对）→ 返回 accent 列占比。
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} slider
 * @returns {Promise<number>} 填充宽度 / 轨道宽度（[-1,1]，-1 表示 PNG 解码失败）
 */
export async function measureSliderFill(page, slider) {
  await page.evaluate(() => {
    if (!document.getElementById('b5-test-hide-thumb')) {
      const s = document.createElement('style');
      s.id = 'b5-test-hide-thumb';
      s.textContent = '.c-slider::-webkit-slider-thumb { display: none; }';
      document.head.appendChild(s);
    }
  });
  await slider.scrollIntoViewIfNeeded();
  await slider.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(250); // swiftshader 确定性渲染，等布局/绘制稳定
  const buf = await slider.screenshot();
  return page.evaluate((b64) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      // 探针 resolve var(--accent) → opaque rgb（滑杆填充渐变消费同一变量）
      const probe = document.createElement('i');
      probe.style.color = 'var(--accent)';
      document.body.appendChild(probe);
      const m = getComputedStyle(probe).color.match(/\d+/g).map(Number);
      probe.remove();
      const y = c.height >> 1; // 24px 输入中 8px 轨道居中 → 中线必在轨道内
      let filled = 0;
      const W = c.width - 2;
      for (let x = 1; x < c.width - 1; x++) {
        const i = (y * c.width + x) * 4;
        const dist = Math.abs(d[i] - m[0]) + Math.abs(d[i + 1] - m[1]) + Math.abs(d[i + 2] - m[2]);
        if (dist < 45) filled++;
      }
      resolve(filled / W);
    };
    img.onerror = () => resolve(-1);
    img.src = 'data:image/png;base64,' + b64;
  }), buf.toString('base64'));
}
