// 头像 Avatar —— 取名字首字 + 主题色背景
export function renderAvatar({ name, size = 'md' } = {}) {
  return `<span class="c-avatar c-avatar--${size}" title="${name}">${name ? name.trim().charAt(0) : ''}</span>`;
}
