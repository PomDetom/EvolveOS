// 远端同步应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'sync', name: '远端同步', icon: 'refresh', order: 4,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'history', name: '历史', icon: 'refresh' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
