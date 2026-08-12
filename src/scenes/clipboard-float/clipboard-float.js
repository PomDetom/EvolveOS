// 场景模板 1：剪贴板悬浮窗（Task 18）—— 模拟悬浮窗 + 搜索过滤 + 列表操作 + 清空 Dialog。
// 纯原生组件组装：FloatingWindow（窗口壳）+ SearchBar（过滤）+ 自建 .cfloat 列表
// （类型 icon + 首行 + 时间 meta + 悬停操作组）+ EmptyState。状态本地管理，不写 store。
// 动画红线：列表项 stagger 进入只动 transform/opacity；悬停操作组只动 opacity。
// 自身 import 本场景 CSS（Task B1-1 内化）：Vite 按模块去重，docs 静态引用与 app 动态 chunk 双引无害。
import './clipboard-float.css';
import { icon } from '../../components/icon/icon.js';
import { renderFloatingWindow, mountFloatingWindow } from '../../components/floating-window/floating-window.js';
import { renderSearchBar, mountSearchBar } from '../../components/search-bar/search-bar.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { toast } from '../../components/toast/toast.js';
import { openDialog } from '../../components/dialog/dialog.js';
import { CLIP_ITEMS } from './data.js';

// type → 类型图标（icon 集契约：globe/clipboard/image 均已存在）
const TYPE_ICON = { link: 'globe', text: 'clipboard', image: 'image' };

// 单条列表项：类型 icon + 首行（title）+ 时间 meta + 悬停操作组（复制/固定/删除）。
// style="--i" 供 stagger 进入延迟 calc(var(--i) * 30ms)。
function itemHtml(item, index) {
  const pinned = item.pinned;
  return `
    <div class="cfloat__item${pinned ? ' cfloat__item--pinned' : ''}" data-id="${item.id}" style="--i: ${index}">
      <span class="cfloat__type">${icon(TYPE_ICON[item.type] ?? 'copy', 16)}</span>
      <div class="cfloat__text">
        <div class="cfloat__title">${item.title}</div>
        <div class="cfloat__meta">${item.meta}</div>
      </div>
      <div class="cfloat__ops">
        <button class="cfloat__op cfloat__op--copy" type="button" aria-label="复制" title="复制">${icon('copy', 14)}</button>
        <button class="cfloat__op cfloat__op--pin${pinned ? ' cfloat__op--on' : ''}" type="button"
          aria-label="固定" aria-pressed="${pinned}" title="${pinned ? '取消固定' : '固定'}">${icon('pin', 14)}</button>
        <button class="cfloat__op cfloat__op--delete" type="button" aria-label="删除" title="删除">${icon('trash', 14)}</button>
      </div>
    </div>`;
}

// 列表主体：pinned 项排列表头（稳定排序），再按搜索词过滤（title 包含，不区分大小写）。
// items 空 → 「暂无内容」空态；搜索无结果 → 「未找到结果」空态（.c-empty-state 供 e2e 选择）。
function renderListBody(items, query) {
  const q = query.trim().toLowerCase();
  const filtered = items.length > 0
    ? [...items]
        .sort((a, b) => Number(b.pinned) - Number(a.pinned))
        .filter((it) => !q || it.title.toLowerCase().includes(q))
    : [];
  if (items.length === 0) {
    return `<div class="c-empty-state cfloat__empty">${renderEmptyState({
      iconName: 'clipboard', title: '暂无内容', desc: '复制任意内容后将出现在这里',
    })}</div>`;
  }
  if (filtered.length === 0) {
    return `<div class="c-empty-state cfloat__empty">${renderEmptyState({
      iconName: 'search', title: '未找到结果', desc: '换个关键词试试',
    })}</div>`;
  }
  return filtered.map(itemHtml).join('');
}

/**
 * 挂载剪贴板悬浮窗场景（追加到 #scenes 内）。
 * @param {HTMLElement} root #scenes section（外层 h2 由 main.js 写入）
 */
export function mountClipboardFloat(root) {
  const state = { items: CLIP_ITEMS.map((it) => ({ ...it })), query: '' };

  root.insertAdjacentHTML('beforeend', `
    <section class="cfloat">
      <header class="cfloat__header">
        <h3>剪贴板悬浮窗</h3>
        <p>浏览器内模拟悬浮窗；Tauri 接入见 <code>docs/integration/tauri-integration.md</code>。</p>
      </header>
      ${renderFloatingWindow({
        title: '剪贴板',
        body: `
          ${renderSearchBar({ placeholder: '搜索剪贴板内容…', hotkey: ['Ctrl', 'K'] })}
          <div class="cfloat__list" data-mount="list"></div>
          <div class="cfloat__pinned" data-mount="pinned"></div>
        `,
      })}
    </section>
  `);

  const scene = root.querySelector('.cfloat');
  const listEl = scene.querySelector('.cfloat__list');
  const pinnedEl = scene.querySelector('.cfloat__pinned');
  const fwin = scene.querySelector('.c-fwin');

  // 评审 Important 1：首渲染后抑制 stagger 重放 —— 重渲染（搜索/固定/删除/清空）重建列表节点前
  // 给容器加 .cfloat--entered（CSS animation: none），避免整列回退 opacity 0 再逐个淡入
  // （搜索每敲一键闪一次）。首渲染不加类，进入动画只播一次。
  let entered = false;
  const render = () => {
    if (entered) listEl.classList.add('cfloat--entered');
    entered = true;
    listEl.innerHTML = renderListBody(state.items, state.query);
    const pinnedCount = state.items.filter((it) => it.pinned).length;
    pinnedEl.innerHTML = state.items.length === 0 ? '' : `
      <span class="cfloat__pinned-label">${icon('pin', 12)}已固定 ${pinnedCount} 项</span>
      <button class="cfloat__clear c-btn c-btn--ghost c-btn--sm" type="button">${icon('trash', 16)}清空全部</button>`;
  };

  // 操作委托（列表重渲染后事件不丢失）：复制 → toast；固定 → 切换 pinned 置顶 + 图钉变色；
  // 删除 → 行移除，空则切空态。文案中文。
  listEl.addEventListener('click', (e) => {
    const op = e.target.closest('.cfloat__op');
    const row = e.target.closest('.cfloat__item');
    if (!op || !row) return;
    const item = state.items.find((it) => it.id === Number(row.dataset.id));
    if (!item) return;
    if (op.classList.contains('cfloat__op--copy')) {
      toast('已复制到剪贴板', { variant: 'success' });
    } else if (op.classList.contains('cfloat__op--pin')) {
      item.pinned = !item.pinned;
      render();
    } else if (op.classList.contains('cfloat__op--delete')) {
      state.items = state.items.filter((it) => it !== item);
      render();
    }
  });

  // 清空全部：危险确认 Dialog（取消/遮罩/Esc → false），确认后清空 + 空态。
  pinnedEl.addEventListener('click', (e) => {
    if (!e.target.closest('.cfloat__clear')) return;
    openDialog({
      title: '清空剪贴板',
      content: `将删除全部 ${state.items.length} 条记录，此操作无法恢复。`,
      confirmLabel: '清空',
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      state.items = [];
      state.query = '';
      scene.querySelector('.c-search-bar input').value = '';
      scene.querySelector('.c-search-bar').classList.remove('c-search-bar--has-input');
      render();
    });
  });

  mountFloatingWindow(fwin);
  mountSearchBar(scene, { onQuery: (q) => { state.query = q; render(); } });

  render();
}
