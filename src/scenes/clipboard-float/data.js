// 剪贴板悬浮窗场景 —— 模拟数据（12 条固定数据，本地状态，不写 store）。
// type → icon 映射在 clipboard-float.js：link=globe / text=clipboard / image=image。
// 至少 2 条含 "github"（供搜索过滤演示），至少 1 条 pinned（置顶置排序 + 图钉变色演示）。
export const CLIP_ITEMS = [
  { id: 1, type: 'link',  title: 'https://github.com/rust-lang/rust', meta: '刚刚', pinned: false },
  { id: 2, type: 'text',  title: 'let result = items.map(i => i * 2);', meta: '2 分钟前', pinned: false },
  { id: 3, type: 'image', title: '截图_2026-08-04.png', meta: '5 分钟前', pinned: true },
  { id: 4, type: 'text',  title: 'npm run build && npm run test:e2e', meta: '8 分钟前', pinned: false },
  { id: 5, type: 'link',  title: 'https://github.com/tauri-apps/tauri', meta: '12 分钟前', pinned: false },
  { id: 6, type: 'text',  title: 'const { app } = require("electron")', meta: '16 分钟前', pinned: false },
  { id: 7, type: 'image', title: '设计稿_主窗口_v2.png', meta: '22 分钟前', pinned: false },
  { id: 8, type: 'link',  title: 'https://vite.dev/guide/', meta: '半小时前', pinned: false },
  { id: 9, type: 'text',  title: '欢迎使用剪贴板管理器', meta: '1 小时前', pinned: false },
  { id: 10, type: 'link', title: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS', meta: '2 小时前', pinned: false },
  { id: 11, type: 'image', title: '登录页_背景.png', meta: '3 小时前', pinned: false },
  { id: 12, type: 'text', title: 'git commit -m "feat: 场景模板"', meta: '昨天', pinned: false },
];
