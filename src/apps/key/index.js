import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'key', name: '密码', icon: 'key', order: 2,
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'groups', name: '分组', icon: 'folder' },
    { id: 'trash', name: '回收站', icon: 'trash' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
