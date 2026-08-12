// 记账应用（占位）—— 并行治理验收演示：新增应用碰零共享文件（壳 glob 自动发现）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'ledger', name: '记账', icon: 'wallet', order: 8,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
