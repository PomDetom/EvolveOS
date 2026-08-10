import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'help', name: '帮助', icon: 'help', order: 5,
  dir: [
    { id: 'usage', name: '使用', icon: 'list' },
    { id: 'faq', name: '常见问题', icon: 'help' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
