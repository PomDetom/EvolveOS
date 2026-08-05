export function renderSlider({ min = 0, max = 100, step = 1, value = 50, disabled = false, label = '' } = {}) {
  return `<input type="range" class="c-slider" min="${min}" max="${max}" step="${step}" value="${value}"${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''}>`;
}
