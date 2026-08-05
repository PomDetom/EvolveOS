export const DEFAULTS = {
  theme: 'system',
  accent: 'indigo',
  glass: { opacity: 0.62, blur: 24, highlight: 0.5 },
  type: { baseSize: 14, scale: 1, weight: 400 },
  radiusScale: 1,
  motion: { enabled: true, durationScale: 1, springStrength: 0.6 },
  shadow: 0.5,
  color: { hue: -1, saturation: 100, temperature: 0 }, // hue: -1 = 跟随当前主题色
};

export const RANGES = {
  opacity: [0.4, 0.95, 0.01],
  blur: [8, 48, 1],
  highlight: [0, 1, 0.05],
  baseSize: [12, 16, 0.5],
  scale: [0.9, 1.15, 0.01],
  radiusScale: [0.7, 1.6, 0.05],
  durationScale: [0.5, 2, 0.05],
  springStrength: [0, 1, 0.05],
  shadowIntensity: [0, 1, 0.05],
  hue: [0, 360, 1],
  saturation: [60, 120, 1],
  temperature: [-1, 1, 0.05],
};

export const ACCENTS = [
  { id: 'indigo', name: '靛蓝', color: '#6e7bf2', desc: '冷静、专业' },
  { id: 'teal', name: '青绿', color: '#2dd4bf', desc: '清爽、科技' },
  { id: 'sky', name: '天蓝', color: '#38bdf8', desc: '明朗、开放' },
  { id: 'amber', name: '琥珀', color: '#f59e0b', desc: '活力、温暖' },
  { id: 'violet', name: '紫罗兰', color: '#a78bfa', desc: '优雅、个性' },
  { id: 'emerald', name: '翡翠', color: '#34d399', desc: '自然、治愈' },
];

export const THEME_MODES = ['system', 'light', 'dark'];
