export function renderRadio({ label = '', name = 'radio', checked = false, disabled = false } = {}) {
  return `<input type="radio" name="${name}" class="c-radio"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''}>`;
}
