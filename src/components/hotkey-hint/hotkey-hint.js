// 快捷键提示：keys: ['Ctrl','K'] → <span class="c-hotkey-hint"><kbd class="c-kbd">Ctrl</kbd>…
export function renderHotkeyHint(keys = []) {
  return `<span class="c-hotkey-hint">${keys
    .map((k) => `<kbd class="c-kbd">${k}</kbd>`)
    .join('')}</span>`;
}
