// tokenTool 纯函数（无 DOM/Tauri 依赖，可单测）
import { renderBadge } from '../../components/badge/badge.js';
import { renderButton } from '../../components/button/button.js';
import { renderProgress } from '../../components/progress/progress.js';

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatReset(secs) {
  if (secs <= 0) return '即将重置';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

export function formatRelative(epochSecs) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - epochSecs);
  if (diff < 60) return '刚刚';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  const dt = new Date(epochSecs * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function accountCard(account, balance) {
  const isOpen = account.kind === 'opencode_go';
  const last = balance?.lastUpdated
    ? `<span class="tt__card-last" data-tt-last="${balance.lastUpdated}">上次刷新: ${formatRelative(balance.lastUpdated)}</span>`
    : '';
  const actions = `
    <span class="tt__card-actions">
      <span data-tt-action="test">${renderButton({ label: '测试', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="edit">${renderButton({ label: '编辑', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="del">${renderButton({ label: '删除', variant: 'danger', size: 'sm' })}</span>
    </span>`;
  let body = '';
  if (balance?.error) {
    body += `<div class="tt__card-error">${escapeHtml(balance.error)}</div>`;
  }
  if (isOpen) {
    const wins = balance?.windows ?? [];
    if (!wins.length) body += '<div class="tt__card-none">暂无窗口数据</div>';
    for (const w of wins) {
      const used = w.used ?? (w.limit * w.usedPct / 100);
      const remaining = w.limit - used;
      body += `
        <div class="tt__window">
          <div class="tt__window-head">
            <span class="tt__window-label">${escapeHtml(w.label)}</span>
            <span class="tt__window-meta">${w.usedPct.toFixed(1)}% · 剩余 $${remaining.toFixed(2)} / $${w.limit}</span>
          </div>
          ${renderProgress({ value: w.usedPct, variant: w.usedPct >= 90 ? 'danger' : w.usedPct >= 70 ? 'warning' : 'accent' })}
          <div class="tt__window-sub">重置: ${formatReset(w.resetsIn)}</div>
        </div>`;
    }
  } else {
    const has = balance?.balance != null;
    body += `
      <div class="tt__card-balance${has ? '' : ' tt__card-balance--empty'}">${has ? `${balance.balance.toFixed(2)} ${escapeHtml(balance.currency ?? '')}` : '—'}</div>`;
  }
  return `
    <div class="tt__card" data-tt-id="${escapeHtml(account.id)}">
      <div class="tt__card-head">
        <strong class="tt__card-name">${escapeHtml(account.name)}</strong>
        ${renderBadge({ label: isOpen ? 'OpenCode Go' : 'DeepSeek', variant: isOpen ? 'info' : 'accent' })}
        ${last}
        ${actions}
      </div>
      ${body}
    </div>`;
}
