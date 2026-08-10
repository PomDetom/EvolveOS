import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'info', name: '关于', icon: 'info', order: 6,
  dir: [
    { id: 'version', name: '版本', icon: 'box' },
    { id: 'license', name: '许可', icon: 'shield' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
