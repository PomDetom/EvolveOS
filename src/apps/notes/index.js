// 牛马笔记应用：写日报 + 出勤统计（纯浏览器 localStorage 数据应用，零框架改动）。
import { notesPage, mountNotes } from './notes.js';

export const module = {
  id: 'notes', name: '牛马笔记', icon: 'clipboard', order: 5,
  dir: [
    { id: 'report', name: '日报', icon: 'clipboard' },
    { id: 'templates', name: '模板', icon: 'copy' },
    { id: 'stats', name: '统计', icon: 'layout' },
  ],
  render: (ctx) => notesPage(ctx),
  mount: (pageEl, ctx) => mountNotes(pageEl, ctx),
};
