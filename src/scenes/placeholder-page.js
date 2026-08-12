// 占位页骨架（框架场景模板，Task G1 从 app-main.js 移出）——
// 应用模块未接入真实页面时的占位渲染。接入真实页面后替换 render 即可
// （见 docs/integration/app-integration.md §5.1 页面骨架）。
import { renderEmptyState } from '../components/empty-state/empty-state.js';

export function placeholderPage(ctx) {
  const { module, dirName } = ctx;
  const sub = dirName ? ` › ${dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">${module.name}</h2>
      ${dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body">
      ${renderEmptyState({
        iconName: module.icon,
        title: '功能开发中',
        desc: `「${module.name}${sub}」为应用壳占位骨架，接入真实功能后替换此处。`,
      })}
    </div>`;
}
