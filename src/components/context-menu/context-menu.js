import { icon } from '../icon/icon.js';

let current = null;

function closeMenu() {
  if (!current) return;
  current.remove();
  document.removeEventListener('click', closeMenu);
  document.removeEventListener('contextmenu', closeMenu);
  document.removeEventListener('keydown', onKey);
  current = null;
}

function onKey(e) { if (e.key === 'Escape') closeMenu(); }

/**
 * 在 root 上挂载右键菜单。items: [{ label, iconName, danger, action }]。
 * 右键在 (x,y) 弹出 .c-context-menu（玻璃材质，位置自动夹取视口内），
 * document 点击 / 再次右键 / Esc 关闭。
 */
export function mountContextMenu(root, items) {
  root.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'c-context-menu glass';
    menu.innerHTML = items.map((it, i) => `
      <button class="c-context-menu__item${it.danger ? ' c-context-menu__item--danger' : ''}"
        data-i="${i}" type="button">${it.iconName ? icon(it.iconName, 16) : ''}<span>${it.label}</span></button>`).join('');
    document.body.appendChild(menu);
    // 位置夹取：菜单不超出视口（固定 8px 边距）
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(e.clientX, window.innerWidth - rect.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(e.clientY, window.innerHeight - rect.height - 8))}px`;
    current = menu;
    // 监听器在本次 contextmenu 派发过程中注册，不会对当前事件生效
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
    document.addEventListener('keydown', onKey);
    menu.querySelectorAll('.c-context-menu__item').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        closeMenu();
        const action = items[i]?.action;
        if (action) action();
      });
    });
  });
}
