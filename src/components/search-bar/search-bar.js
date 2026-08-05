import { icon } from '../icon/icon.js';
import { renderHotkeyHint } from '../hotkey-hint/hotkey-hint.js';

// 搜索栏：输入框 + 放大镜 + 右侧 HotkeyHint。
// hotkey 同时写入 data-hotkey（逗号分隔），mount 时经 window.__bindHotkey
// 注册全局热键 —— 多个实例时聚焦文档中第一个搜索框。
export function renderSearchBar({ placeholder = '搜索…', hotkey = ['Ctrl', 'K'] } = {}) {
  return `<div class="c-search-bar" data-hotkey="${hotkey.join(',')}">
    <span class="c-search-bar__icon">${icon('search', 16)}</span>
    <input class="c-search-bar__input" type="text" placeholder="${placeholder}" aria-label="搜索" />
    <div class="c-search-bar__hint">${renderHotkeyHint(hotkey)}</div>
  </div>`;
}

export function mountSearchBar(root, { onQuery = () => {} } = {}) {
  const bar = root.classList.contains('c-search-bar')
    ? root : root.querySelector('.c-search-bar');
  const input = bar.querySelector('.c-search-bar__input');
  input.addEventListener('input', () => {
    bar.classList.toggle('c-search-bar--has-input', input.value.length > 0);
    onQuery(input.value);
  });
  const hotkey = (bar.dataset.hotkey || 'Ctrl,K').split(',');
  if (window.__bindHotkey) {
    window.__bindHotkey(hotkey, () => {
      const first = document.querySelector('.c-search-bar input');
      if (first) first.focus();
    });
  }
}
