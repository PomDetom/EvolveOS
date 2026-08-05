import { getConfig, saveConfig, subscribe } from '../config/store.js';
import { applyConfig } from '../config/apply.js';
import { ACCENTS } from '../config/defaults.js';
import { icon } from '../components/icon/icon.js';

const MODES = [
  { id: 'light', label: '浅' }, { id: 'dark', label: '深' }, { id: 'system', label: '跟随' },
];

export function mountThemeSwitcher(root) {
  root.innerHTML = `
    <div class="tsw">
      <div class="tsw__modes">
        ${MODES.map(m => `<button class="tsw__mode" data-mode="${m.id}" title="${m.label}" aria-pressed="false">${icon(m.id === 'light' ? 'sun' : m.id === 'dark' ? 'moon' : 'monitor')}<span class="c-sr">${m.label}</span></button>`).join('')}
      </div>
      <div class="tsw__accents">
        ${ACCENTS.map(a => `<button class="tsw__accent" data-accent="${a.id}" title="${a.name}（${a.desc}）" style="--swatch: ${a.color}"><span class="c-sr">${a.name}</span></button>`).join('')}
      </div>
    </div>`;
  const cfg = getConfig();
  syncUI(cfg);
  root.querySelector('.tsw__modes').addEventListener('click', (e) => {
    const btn = e.target.closest('.tsw__mode'); if (!btn) return;
    const next = saveConfig({ theme: btn.dataset.mode });
    applyConfig(next); syncUI(next);
  });
  root.querySelector('.tsw__accents').addEventListener('click', (e) => {
    const btn = e.target.closest('.tsw__accent'); if (!btn) return;
    const next = saveConfig({ accent: btn.dataset.accent });
    applyConfig(next); syncUI(next);
  });
  // OS 主题监听：theme === 'system' 时挂载，离开时卸载（幂等：同函数引用反复 add/remove 无害）。
  // 修复（最终审查 C）：此前仅在挂载时按初始 theme 判断，中途切「跟随」后 OS 变化不传播
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => applyConfig(getConfig());
  function watchSystemTheme(c) {
    if (c.theme === 'system') mql.addEventListener('change', onSystemChange);
    else mql.removeEventListener('change', onSystemChange);
  }
  function syncUI(c) {
    // aria-pressed 单选语义：当前主题为按下（true），其余弹起（false），与 active 类同步
    root.querySelectorAll('.tsw__mode').forEach(b => {
      b.classList.toggle('tsw__mode--active', b.dataset.mode === c.theme);
      b.setAttribute('aria-pressed', String(b.dataset.mode === c.theme));
    });
    root.querySelectorAll('.tsw__accent').forEach(b =>
      b.classList.toggle('tsw__accent--active', b.dataset.accent === c.accent));
  }
  watchSystemTheme(getConfig());
  // 订阅 store：定制器改主题/主题色、预设、重置等外部变更 → 同步顶栏高亮态 + 挂/卸监听
  // （saveConfig 与 notify 都会广播；同步回调不 applyConfig，避免与 main.js 订阅重复应用）
  subscribe((next) => {
    syncUI(next);
    watchSystemTheme(next);
  });
}
