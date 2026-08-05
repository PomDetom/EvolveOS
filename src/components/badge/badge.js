// 徽标 Badge —— variant: default|accent|success|warning|danger|info
export function renderBadge({ label, variant = 'default' } = {}) {
  return `<span class="c-badge c-badge--${variant}">${label}</span>`;
}
