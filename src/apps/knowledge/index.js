// 知识库应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'knowledge', name: '知识库', icon: 'globe', order: 6,
  dir: [
    { id: 'all', name: '全部', icon: 'globe' },
    { id: 'favorite', name: '收藏', icon: 'star' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
