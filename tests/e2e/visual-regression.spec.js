import { test, expect } from '@playwright/test';

// 视觉回归（Task 21）：深/浅 × 3 accent 对 3 个内容区 + 3 个场景模板截图。
// 稳定性：Windows GPU 文字抗锯齿跨实例抖动会让 toHaveScreenshot 偶发失败，
// 已在 playwright.config.js 强制 --use-angle=swiftshader 软件栅格化（像素级确定性）。
// 基线须在相同参数下生成（--update-snapshots）。
// 首次运行生成基线：npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots
// 之后 npm run test:visual 对比基线；界面有意变更（含新组件/令牌）后需重新生成。
// accent 抽样取 3 套（默认靛蓝 + 暖色琥珀 + 冷色翡翠）覆盖色相两端，基线不膨胀。

const SHOTS = [
  ['tokens', '#tokens'],
  ['components', '#components'],
  ['scenes', '#scenes'],
  ['main-window', '.cmain'],
  ['settings-window', '.csettings'],
  ['clipboard', '.cfloat'],
];

const THEMES = ['light', 'dark'];
const ACCENTS = ['indigo', 'amber', 'emerald'];
// 最长入场动效：剪贴板列表 stagger（30ms × 8 + 200ms = 440ms），留余量
const SETTLE_MS = 600;

for (const [name, selector] of SHOTS) {
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      test(`视觉回归 — ${name} · ${theme} / ${accent}`, async ({ page }) => {
        await page.goto('/');
        await page.evaluate(([t, a]) => {
          document.documentElement.dataset.theme = t;
          document.documentElement.dataset.accent = a;
          // motion=off：所有动效时长归零（motion.css）—— 入场 stagger 立即完成，
          // 截图不依赖动画相位（否则列表淡入中途相位随运行抖动，基线偶发不一致）
          document.documentElement.dataset.motion = 'off';
        }, [theme, accent]);
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
