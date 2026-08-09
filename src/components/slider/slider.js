export function renderSlider({ min = 0, max = 100, step = 1, value = 50, disabled = false, label = '' } = {}) {
  // B5-final（find 1）：内联 --fill（0-100% 按值）—— 组件展示区滑杆默认按值填充，不再静态 50% 兜底。
  // customizer syncUI 与 motion-lab applyParams 各自覆盖同名变量（全接线）；max<=min 时兜底 0 防除零。
  const fill = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return `<input type="range" class="c-slider" min="${min}" max="${max}" step="${step}" value="${value}"${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''} style="--fill:${fill}%">`;
}
