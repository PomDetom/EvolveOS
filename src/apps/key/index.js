// 密码管理器（升级原 key 占位）——复用 Tauri 桌面后端（Argon2id + AES-256-GCM 保险库）。
import { keyPage, mountKey } from './key.js';

export const module = {
  id: 'key', name: '密码', icon: 'key', order: 1,
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'data', name: '数据管理', icon: 'folder' },
    { id: 'settings', name: '设置', icon: 'settings' },
  ],
  render: (ctx) => keyPage(ctx),
  mount: (pageEl, ctx) => mountKey(pageEl, ctx),
};
