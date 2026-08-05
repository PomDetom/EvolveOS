/**
 * 渲染面包屑。items 为字符串或 { label, href }；末尾项为当前页
 * （--text-1 加粗 + aria-current="page"），中间项带 href 时渲染为链接。
 * @param {{ items: Array<string|{label:string, href?:string}> }} opts
 */
export function renderBreadcrumb({ items = [] } = {}) {
  const parts = items.map((it, i) => {
    const last = i === items.length - 1;
    const label = typeof it === 'string' ? it : it.label;
    const href = typeof it === 'object' && !last ? it.href : null;
    const item = href
      ? `<a class="c-breadcrumb__item" href="${href}">${label}</a>`
      : `<span class="c-breadcrumb__item${last ? ' c-breadcrumb__item--current' : ''}"${last ? ' aria-current="page"' : ''}>${label}</span>`;
    return i > 0 ? `<span class="c-breadcrumb__sep" aria-hidden="true">›</span>${item}` : item;
  }).join('');
  return `<nav class="c-breadcrumb" aria-label="面包屑">${parts}</nav>`;
}
