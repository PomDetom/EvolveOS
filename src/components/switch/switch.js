export function renderSwitch({ checked = false, label = '' } = {}) {
  return `<button role="switch" aria-checked="${checked}" class="c-switch" aria-label="${label}">
    <span class="c-switch__thumb"></span></button>`;
}
export function mountSwitch(root) {
  root.querySelectorAll('.c-switch').forEach((el) => {
    el.addEventListener('click', () => {
      const next = el.getAttribute('aria-checked') === 'true' ? 'false' : 'true';
      el.setAttribute('aria-checked', next);
    });
  });
}
