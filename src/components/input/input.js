export function renderInput({ type = 'text', value = '', placeholder = '', disabled = false, label = '' } = {}) {
  return `<input class="c-input" type="${type}" value="${value}" placeholder="${placeholder}"${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''}>`;
}
