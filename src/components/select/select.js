export function renderSelect({ options = [], value = '', disabled = false, placeholder = '请选择' } = {}) {
  const opts = options.length
    ? options.map(o => {
        const v = o.value ?? o;
        return `<option value="${v}"${v === value ? ' selected' : ''}>${o.label ?? o}</option>`;
      }).join('')
    : `<option value="">${placeholder}</option>`;
  return `<select class="c-select"${disabled ? ' disabled' : ''}>${opts}</select>`;
}
