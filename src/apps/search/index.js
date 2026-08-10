import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'search', name: '搜索', icon: 'search', order: 4,
  dir: [
    { id: 'all', name: '全部', icon: 'search' },
    { id: 'web', name: '网页', icon: 'globe' },
    { id: 'files', name: '文件', icon: 'image' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
