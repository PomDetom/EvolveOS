import { getConfig, saveConfig } from '../config/store.js';
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
        ${MODES.map(m => `<button class="tsw__mode" data-mode="${m.id}" title="${m.label}">${icon(m.id === 'light' ? 'sun' : m.id === 'dark' ? 'moon' : 'monitor')}<span class="c-sr">${m.label}</span></button>`).join('')}
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
  if (getConfig().theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyConfig(getConfig());
    });
  }
  function syncUI(c) {
    root.querySelectorAll('.tsw__mode').forEach(b =>
      b.classList.toggle('tsw__mode--active', b.dataset.mode === c.theme));
    root.querySelectorAll('.tsw__accent').forEach(b =>
      b.classList.toggle('tsw__accent--active', b.dataset.accent === c.accent));
  }
}
