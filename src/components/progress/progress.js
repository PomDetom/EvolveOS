// 进度条 Progress —— value 0-100，渲染时转 0-1 小数写入 --progress 局部变量
export function renderProgress({ value = 0, variant = 'accent' } = {}) {
  const p = Math.min(100, Math.max(0, value)) / 100;
  const cls = ['c-progress__fill'];
  if (variant !== 'accent') cls.push(`c-progress__fill--${variant}`);
  return `<div class="c-progress"><div class="${cls.join(' ')}" style="--progress: ${p}"></div></div>`;
}
