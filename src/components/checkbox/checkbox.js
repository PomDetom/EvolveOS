export function renderCheckbox({ label = '', checked = false, disabled = false } = {}) {
  return `<input type="checkbox" class="c-checkbox"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''}>`;
}
