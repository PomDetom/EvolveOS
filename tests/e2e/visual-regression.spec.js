import { test, expect } from '@playwright/test';

// 视觉回归（Task 21 + Task A7）：深/浅 × 3 accent 对 3 个内容区 + 3 个场景模板 + 应用壳截图。
// 稳定性：Windows GPU 文字抗锯齿跨实例抖动会让 toHaveScreenshot 偶发失败，
// 已在 playwright.config.js 强制 --use-angle=swiftshader 软件栅格化（像素级确定性）。
// 基线须在相同参数下生成（--update-snapshots）。
// 首次运行生成基线：npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots
// 之后 npm run test:visual 对比基线；界面有意变更（含新组件/令牌）后需重新生成。
// accent 抽样取 3 套（默认靛蓝 + 暖色琥珀 + 冷色翡翠）覆盖色相两端，基线不膨胀。
// SHOTS 第三字段 mode = 页面入口：docs 6 组固定 '/'；app-main 走 '?mode=app'（应用壳，
// 右窗默认收起单窗口态，无入场相位 —— 截图稳定性与 docs 组一致，沿用 data-motion=off + animations disabled）。

const SHOTS = [
  ['tokens', '#tokens', '/'],
  ['components', '#components', '/'],
  ['scenes', '#scenes', '/'],
  ['main-window', '.cmain', '/'],
  ['settings-window', '.csettings', '/'],
  ['clipboard', '.cfloat', '/'],
  ['app-main', '.app-main', '/?mode=app'],
];

const THEMES = ['light', 'dark'];
const ACCENTS = ['indigo', 'amber', 'emerald'];
// 最长入场动效：剪贴板列表 stagger（30ms × 8 + 200ms = 440ms），留余量
const SETTLE_MS = 600;

for (const [name, selector, mode = '/'] of SHOTS) {
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      test(`视觉回归 — ${name} · ${theme} / ${accent}`, async ({ page }) => {
        await page.goto(mode);
        // app 壳：闭环 I1 修复后 mount 首行即 applyConfig —— 直接 evaluate 覆盖 data-theme 会在
        // 挂载期 applyConfig 之前/之后产生歧义（overview 卡片在挂载时按 data-theme 渲染，需与页面
        // 主题一致）。改经配置链路注入测试主题/强调色并 reload，令挂载期 applyConfig 应用该配置，
        // 卡片与页面主题一致；随后清除配置内联变量，令截图回落纯主题 CSS（与既有基线一致）。
        if (mode === '/?mode=app') {
          await page.evaluate(([t, a]) => {
            localStorage.setItem('ui-design-config', JSON.stringify({ theme: t, accent: a }));
          }, [theme, accent]);
          await page.reload();
          await page.locator('.app-main').first().waitFor();
        }
        await page.evaluate(([t, a, m]) => {
          document.documentElement.dataset.theme = t;
          document.documentElement.dataset.accent = a;
          // motion=off：所有动效时长归零（motion.css）—— 入场 stagger 立即完成，
          // 截图不依赖动画相位（否则列表淡入中途相位随运行抖动，基线偶发不一致）
          document.documentElement.dataset.motion = 'off';
          // 清除 applyConfig 写入的配置内联变量（--glass-*/--dur-* 等），app-main 渲染回落纯主题 CSS
          // —— 保持既有基线零变化（docs 组基线在 applyConfig 生效态生成，不受影响，不清除）
          if (m === '/?mode=app') document.documentElement.removeAttribute('style');
        }, [theme, accent, mode]);
        const locator = page.locator(selector).first();
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
