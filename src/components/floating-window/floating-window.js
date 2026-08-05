import { icon } from '../icon/icon.js';

// 悬浮窗：玻璃材质浮层（.c-fwin）。Tauri 场景下 titlebar 的
// data-tauri-drag-region 由系统接管拖动；页面内演示用 transform 平移模拟拖动
// （红线：动画只动 transform/opacity，不用 left/top）。
export function renderFloatingWindow({ title = '悬浮窗', body = '' } = {}) {
  return `
  <div class="c-fwin">
    <div class="c-fwin__titlebar" data-tauri-drag-region>
      <span class="c-fwin__title">${title}</span>
      <button class="c-fwin__btn c-fwin__pin" type="button" aria-label="置顶">${icon('pin', 14)}</button>
      <button class="c-fwin__btn c-fwin__fold" type="button" aria-label="折叠">${icon('chevron-down', 14)}</button>
      <button class="c-fwin__btn c-fwin__close" type="button" aria-label="关闭">${icon('close', 14)}</button>
    </div>
    <div class="c-fwin__body">${body}</div>
  </div>`;
}

export function mountFloatingWindow(root) {
  const win = root.classList.contains('c-fwin') ? root : root.querySelector('.c-fwin');
  const bar = win.querySelector('.c-fwin__titlebar');
  let dragging = null;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.c-fwin__btn')) return;
    dragging = { dx: e.clientX, dy: e.clientY, tx: 0, ty: 0 };
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragging.tx += e.clientX - dragging.dx;
    dragging.ty += e.clientY - dragging.dy;
    dragging.dx = e.clientX;
    dragging.dy = e.clientY;
    win.style.transform = `translate(${dragging.tx}px, ${dragging.ty}px)`;
  });
  const endDrag = () => { dragging = null; };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  const pinBtn = win.querySelector('.c-fwin__pin');
  pinBtn.addEventListener('click', () => {
    const on = win.classList.toggle('c-fwin--pinned');
    pinBtn.classList.toggle('c-fwin__btn--on', on);
    pinBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const foldBtn = win.querySelector('.c-fwin__fold');
  foldBtn.addEventListener('click', () => {
    win.classList.toggle('c-fwin--folded');
    foldBtn.innerHTML = icon(
      win.classList.contains('c-fwin--folded') ? 'chevron-up' : 'chevron-down', 14);
  });
}
