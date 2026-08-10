import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'wallet', name: '记账', icon: 'wallet', order: 3,
  dir: [
    { id: 'overview', name: '概览', icon: 'wallet' },
    { id: 'flows', name: '流水', icon: 'list' },
    { id: 'categories', name: '分类', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
