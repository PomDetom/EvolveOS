// 智能备忘应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'memo', name: '智能备忘', icon: 'edit', order: 3,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
