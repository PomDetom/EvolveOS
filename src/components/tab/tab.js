import { icon } from '../icon/icon.js';

/**
 * 渲染标签页（tablist + tabpanel）。tabs: [{ label, iconName?, content }]，content 为 HTML。
 * @param {{ tabs: Array, active?: number }} opts
 */
export function renderTabs({ tabs = [], active = 0 } = {}) {
  const list = tabs.map((t, i) => `
    <button class="c-tab${i === active ? ' c-tab--active' : ''}" role="tab"
      aria-selected="${i === active}" data-panel="${i}" type="button">
      ${t.iconName ? icon(t.iconName, 16) : ''}<span>${t.label}</span></button>`).join('');
  const panels = tabs.map((t, i) => `
    <div class="c-tabpanel${i === active ? ' c-tabpanel--active' : ''}" role="tabpanel"
      data-panel="${i}"${i === active ? '' : ' hidden'}>${t.content}</div>`).join('');
  return `<div class="c-tabs" role="tablist">${list}</div><div class="c-tabpanels">${panels}</div>`;
}

/**
 * 挂载交互：点击切换激活 tab 与内容面板；共享指示条通过
 * transform translateX(偏移) scaleX(宽度比) 平移到位（只动 transform，动画红线内）。
 */
export function mountTabs(root) {
  const bar = root.querySelector('.c-tabs');
  const indicator = document.createElement('span');
  indicator.className = 'c-tabs__indicator';
  bar.appendChild(indicator);

  const place = () => {
    const activeTab = bar.querySelector('.c-tab--active');
    if (!activeTab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    // 基准宽 = 首帧定宽（CSS width 固定，宽度只经 scaleX 过渡 —— 宽度不参与 transition）
    const curW = parseFloat(indicator.dataset.w || '0');
    if (!curW) {
      indicator.style.width = `${tabRect.width}px`;
      indicator.dataset.w = tabRect.width;
    }
    // scaleX 围绕指示条中心缩放会把左边缘额外推 (新宽-基准宽)/2px（Task I3 4c 根因：
    // resize 布局重排使 tab 宽度变化时，translateX 须加回该漂移量，视觉左边缘才 = tab 左边缘）
    const drift = (tabRect.width - curW) / 2;
    indicator.style.transform =
      `translateX(${tabRect.left - barRect.left + drift}px) scaleX(${curW ? tabRect.width / curW : 1})`;
  };

  bar.addEventListener('click', (e) => {
    const tab = e.target.closest('.c-tab');
    if (!tab || tab.classList.contains('c-tab--active')) return;
    bar.querySelectorAll('.c-tab').forEach((t) => {
      const on = t === tab;
      t.classList.toggle('c-tab--active', on);
      t.setAttribute('aria-selected', String(on));
    });
    root.querySelectorAll('.c-tabpanel').forEach((p) => {
      const on = p.dataset.panel === tab.dataset.panel;
      p.classList.toggle('c-tabpanel--active', on);
      p.hidden = !on;
    });
    place();
  });

  // Task I3 4c：窗口 resize 触发的布局重排（响应式字体/间距/换行）后重定位指示条
  // （place 是纯同步重算，resize 低频 —— 页面内 tab 实例有限，多实例各挂一个无感）
  window.addEventListener('resize', place);

  place();
}
