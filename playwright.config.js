import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    // Windows GPU 文字抗锯齿跨实例抖动会使 toHaveScreenshot 偶发失败（实测默认/disable-gpu
    // 均不稳定）—— 强制 ANGLE SwiftShader 软件栅格化，像素级确定性。仅影响渲染速度，不影响断言。
    launchOptions: { args: ['--use-angle=swiftshader'] },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
