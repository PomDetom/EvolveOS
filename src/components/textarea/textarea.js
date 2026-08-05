export function renderTextarea({ value = '', placeholder = '', rows = 3, disabled = false, label = '' } = {}) {
  return `<textarea class="c-textarea" rows="${rows}" placeholder="${placeholder}"${disabled ? ' disabled' : ''}${label ? ` aria-label="${label}"` : ''}>${value}</textarea>`;
}
