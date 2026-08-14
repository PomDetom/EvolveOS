export const DEFAULTS = {
  theme: 'system',
  accent: 'indigo',
  glass: { opacity: 0.48, blur: 30, noise: 0.06, blurEnabled: true },
  type: { baseSize: 14, scale: 1, weight: 400 },
  radiusScale: 1,
  motion: { enabled: true, durationScale: 1, springStrength: 0.6 },
  shadow: 0.5,
  closeBehavior: 'exit', // 主窗关闭：exit=退出应用 / background=保留后台（悬浮窗常驻）
  stripMaterial: 'solid', // 悬浮窗材质：solid=实底（默认）/ none=无背景（仅文字）
  nav: { order: [], hidden: [] }, // 0.1.2 入口排序/隐藏（功能性配置，非样式参数，不入 apply）
};

export const RANGES = {
  opacity: [0.4, 0.95, 0.01],
  blur: [8, 48, 1],
  noise: [0, 0.12, 0.01],
  baseSize: [12, 16, 0.5],
  scale: [0.9, 1.15, 0.01],
  radiusScale: [0.7, 1.6, 0.05],
  durationScale: [0.5, 2, 0.05],
  springStrength: [0, 1, 0.05],
  shadowIntensity: [0, 1, 0.05],
};

export const ACCENTS = [
  { id: 'indigo', name: '靛蓝', color: '#6e7bf2', desc: '冷静、专业' },
  { id: 'teal', name: '青绿', color: '#2dd4bf', desc: '清爽、科技' },
  { id: 'sky', name: '天蓝', color: '#38bdf8', desc: '明朗、开放' },
  { id: 'amber', name: '琥珀', color: '#f59e0b', desc: '活力、温暖' },
  { id: 'violet', name: '紫罗兰', color: '#a78bfa', desc: '优雅、个性' },
  { id: 'emerald', name: '翡翠', color: '#34d399', desc: '自然、治愈' },
  { id: 'rose', name: '玫红', color: '#f43f5e', desc: '热情、张力' },
  { id: 'orange', name: '橙', color: '#f97316', desc: '活力、明亮' },
  { id: 'lime', name: '青柠', color: '#84cc16', desc: '清新、能量' },
  { id: 'cyan', name: '青', color: '#06b6d4', desc: '通透、清爽' },
  { id: 'blue', name: '蓝', color: '#3b82f6', desc: '稳重、可靠' },
  { id: 'fuchsia', name: '品红', color: '#d946ef', desc: '时尚、鲜明' },
];

export const THEME_MODES = ['system', 'light', 'dark'];
