import { test, expect } from '@playwright/test';

// 视觉回归（Task 21 + Task A7 + Task B1-4 重构）：应用壳 + 设置「组件/动效」分区截图。
// docs 渲染已删除（B1-4），基线不再含 docs 展示页 —— 全部走 '?mode=app'（浏览器与 Tauri 一致）。
// 稳定性：Windows GPU 文字抗锯齿跨实例抖动会让 toHaveScreenshot 偶发失败，
// 已在 playwright.config.js 强制 --use-angle=swiftshader 软件栅格化（像素级确定性）。
// 基线须在相同参数下生成（--update-snapshots）。
// 首次运行生成基线：npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots
// 之后 npm run test:visual 对比基线；界面有意变更（含新组件/令牌）后需重新生成。
// accent 抽样取 3 套（默认靛蓝 + 暖色琥珀 + 冷色翡翠）覆盖色相两端，基线不膨胀。
// SHOTS：name / selector / settingsPartitionIndex（⚙ 进入设置右窗分区项序号；null = 单窗口态不进设置）。
//   应用壳右窗默认收起单窗口态，无入场相位；设置分区惰性挂载展示内容（外观定制器/组件/动效），
//   截图稳定化沿用 data-motion=off + animations disabled（入场 stagger 相位无关）。
//   appearance-partition：B2 返工后外观分区「表面质感」组（亚克力开关 + 噪点强度滑杆 + 噪点预览），
//   锁定自定义器整页形态的亚克力观感（与 R2 起 surface 配方一致）。

const SHOTS = [
  ['app-main', '.app-main', null],
  ['appearance-partition', '.app-main__settings [data-page="appearance"]', 1],
  ['components-partition', '.app-main__settings [data-page="components"]', 8],
  ['motion-partition', '.app-main__settings [data-page="motion"]', 9],
];

const THEMES = ['light', 'dark'];
const ACCENTS = ['indigo', 'amber', 'emerald'];
// 最长入场动效：剪贴板列表 stagger（30ms × 8 + 200ms = 440ms），留余量
const SETTLE_MS = 600;

for (const [name, selector, partition] of SHOTS) {
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      test(`视觉回归 — ${name} · ${theme} / ${accent}`, async ({ page }) => {
        await page.goto('/?mode=app');
        // 应用壳：闭环 I1 修复后 mount 首行即 applyConfig —— 直接 evaluate 覆盖 data-theme 会在
        // 挂载期 applyConfig 之前/之后产生歧义（overview 卡片在挂载时按 data-theme 渲染，需与页面
        // 主题一致）。改经配置链路注入测试主题/强调色并 reload，令挂载期 applyConfig 应用该配置，
        // 卡片与页面主题一致；随后清除配置内联变量，令截图回落纯主题 CSS（与既有基线一致）。
        await page.evaluate(([t, a]) => {
          localStorage.setItem('ui-design-config', JSON.stringify({ theme: t, accent: a }));
        }, [theme, accent]);
        await page.reload();
        await page.locator('.app-main').first().waitFor();
        if (partition != null) {
          // 设置分区基线：⚙ 进入设置 → 点右窗分区项 → 等惰性挂载（动态 import 完成后内容非空）
          await page.locator('.c-titlebar__control--settings').click();
          await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
          await page.locator('.app-main__nav-r .c-navwheel__item').nth(partition).click();
          if (partition === 1) {
            // 外观分区：定制器整页形态 6 组（含「表面质感」组 + 噪点预览），锁定 .cust-group 计数
            await expect(page.locator('.app-main__settings [data-page="appearance"] .cust-group')).toHaveCount(6);
          } else if (partition === 8) {
            // 组件分区：6 组矩阵 + 1 个交互悬浮窗实例块（csg count 7）+ 剪贴板悬浮窗组合示例
            await expect(page.locator('.app-main__settings [data-page="components"] .csg')).toHaveCount(7);
            await expect(page.locator('.app-main__settings [data-page="components"] .cfloat')).toBeVisible();
          } else {
            await expect(page.locator('.app-main__settings [data-page="motion"] .ml-card')).toHaveCount(5);
          }
        }
        await page.evaluate(([t, a]) => {
          document.documentElement.dataset.theme = t;
          document.documentElement.dataset.accent = a;
          // motion=off：所有动效时长归零（motion.css）—— 入场 stagger 立即完成，
          // 截图不依赖动画相位（否则列表淡入中途相位随运行抖动，基线偶发不一致）
          document.documentElement.dataset.motion = 'off';
          // 清除 applyConfig 写入的配置内联变量（--glass-*/--dur-* 等），渲染回落纯主题 CSS
          document.documentElement.removeAttribute('style');
        }, [theme, accent]);
        const locator = page.locator(selector).first();
        // B5-1：CJK 字体大，截图前必须等加载完成防抖动 —— 显式 load 强制拉取普惠体
        //（仅 document.fonts.ready 不足：字体由渲染惰性触发，ready 可能在 load 前已 settle）
        await page.evaluate(() =>
          Promise.all([
            document.fonts.load('14px "Alibaba PuHuiTi"'),
            document.fonts.load('700 14px "Alibaba PuHuiTi"'),
          ]));
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(SETTLE_MS); // 字体/布局稳定
        // animations: 'disabled' —— 入场 stagger 处于不同相位会导致截图抖动
        // （基线曾捕获到列表淡入中途），禁用动画后各元素渲染为自然终态，相位无关
        await expect(locator).toHaveScreenshot(`${name}-${theme}-${accent}.png`, {
          animations: 'disabled',
        });
      });
    }
  }
}
