export function showcase(title, items) {
  const wrap = document.createElement('div');
  wrap.className = 'showcase';
  wrap.innerHTML = `
    <h3 class="showcase__title">${title}</h3>
    <div class="showcase__grid">
      ${items.map(it => `<div class="showcase__item">
        <div class="showcase__stage">${it.html}</div>
        <div class="showcase__label">${it.label}</div>
      </div>`).join('')}
    </div>`;
  return wrap;
}
