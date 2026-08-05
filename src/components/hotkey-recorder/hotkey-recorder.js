import { renderHotkeyHint } from '../hotkey-hint/hotkey-hint.js';

const MODIFIERS = ['Control', 'Alt', 'Shift', 'Meta'];

// 快捷键录制器：value: ['Ctrl','K'] | null。点击进入录制态，
// 键盘捕获组合键 → renderHotkeyHint 格式显示 → onChange。
export function renderHotkeyRecorder({ value = null, placeholder = '点击设置快捷键' } = {}) {
  const inner = value && value.length
    ? renderHotkeyHint(value)
    : `<span class="c-hotkey-recorder__placeholder">${placeholder}</span>`;
  return `<button class="c-hotkey-recorder" type="button">${inner}</button>`;
}

export function mountHotkeyRecorder(root, { onChange = () => {} } = {}) {
  const btn = root.classList.contains('c-hotkey-recorder')
    ? root : root.querySelector('.c-hotkey-recorder');

  const exit = () => {
    btn.classList.remove('c-hotkey-recorder--recording');
    document.removeEventListener('keydown', capture);
  };
  const capture = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Meta');
    if (MODIFIERS.includes(e.key)) return; // 仅修饰键：等待主键
    keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    btn.innerHTML = renderHotkeyHint(keys);
    onChange(keys);
    exit();
  };

  btn.addEventListener('click', () => {
    if (btn.classList.contains('c-hotkey-recorder--recording')) return;
    btn.classList.add('c-hotkey-recorder--recording');
    document.addEventListener('keydown', capture);
  });
}
