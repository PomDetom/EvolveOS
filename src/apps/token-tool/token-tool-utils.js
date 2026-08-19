// tokenTool 纯函数（无 DOM/Tauri 依赖，可单测）
import { renderBadge } from '../../components/badge/badge.js';
import { renderButton } from '../../components/button/button.js';
import { icon } from '../../components/icon/icon.js';
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

export function isAccountVisible(account) {
  return account?.visible !== false;
}

// 余量展示页卡片（只读）：头部 = 名称+badge；主体 = 余额/窗口进度；底部 = 上次刷新。
// 无任何操作按钮 —— 账户管理（测试/编辑/删除）在账户管理页。
export function usageCard(account, balance) {
  const isOpen = account.kind === 'opencode_go';
  const isCodex = account.kind === 'codex';
  const badgeLabel = isCodex ? 'Codex' : isOpen ? 'OpenCode Go' : 'DeepSeek';
  const badgeVariant = isCodex || isOpen ? 'info' : 'accent';
  const last = balance?.lastUpdated
    ? `<span class="tt__card-last" data-tt-last="${balance.lastUpdated}">上次刷新: ${formatRelative(balance.lastUpdated)}</span>`
    : '<span class="tt__card-last">尚未刷新</span>';
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
  } else if (isCodex) {
    const wins = balance?.windows ?? [];
    body += `<div class="tt__card-plan">套餐: ${escapeHtml(balance?.planType ?? 'unknown')}</div>`;
    if (!wins.length) body += '<div class="tt__card-none">暂无限额窗口数据</div>';
    for (const w of wins) {
      const usedPct = Number(w.usedPct ?? 0);
      body += `
        <div class="tt__window">
          <div class="tt__window-head">
            <span class="tt__window-label">${escapeHtml(w.label)}</span>
            <span class="tt__window-meta">${usedPct.toFixed(1)}% · 剩余 ${(100 - usedPct).toFixed(1)}%</span>
          </div>
          ${renderProgress({ value: usedPct, variant: usedPct >= 90 ? 'danger' : usedPct >= 70 ? 'warning' : 'accent' })}
          <div class="tt__window-sub">重置: ${formatReset(w.resetsIn)}</div>
        </div>`;
    }
    if (balance?.credits) {
      const credits = balance.credits;
      const label = credits.unlimited ? '无限 credits' : credits.hasCredits ? `credits 余额: ${credits.balance}` : '无额外 credits';
      body += `<div class="tt__card-credits">${escapeHtml(label)}</div>`;
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
        ${renderBadge({ label: badgeLabel, variant: badgeVariant })}
      </div>
      ${body}
      <div class="tt__card-foot">${last}</div>
    </div>`;
}

// 账户管理页行：名称 + badge + 动态刷新文案 + 上次刷新 + 操作列（测试/编辑/删除，固定列，不随文本浮动）。
export function accountRow(account, balance) {
  const isOpen = account.kind === 'opencode_go';
  const isCodex = account.kind === 'codex';
  const badgeLabel = isCodex ? 'Codex' : isOpen ? 'OpenCode Go' : 'DeepSeek';
  const badgeVariant = isCodex || isOpen ? 'info' : 'accent';
  const last = balance?.lastUpdated
    ? `<span class="tt__row-last" data-tt-last="${balance.lastUpdated}">上次刷新: ${formatRelative(balance.lastUpdated)}</span>`
    : '<span class="tt__row-last">尚未刷新</span>';
  const actions = `
    <span class="tt__row-drag" data-tt-drag draggable="true" title="拖拽调整顺序" aria-label="拖拽调整顺序">${icon('drag', 16)}</span>
    <button class="tt__visibility" type="button" data-tt-action="toggle-visibility" aria-pressed="${isAccountVisible(account)}" title="${isAccountVisible(account) ? '隐藏在余量页和悬浮窗中' : '显示在余量页和悬浮窗中'}">
      ${icon('eye', 15)}<span>${isAccountVisible(account) ? '已展示' : '已隐藏'}</span>
    </button>
    <span class="tt__row-actions">
      <span data-tt-action="test">${renderButton({ label: '测试', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="edit">${renderButton({ label: '编辑', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="del">${renderButton({ label: '删除', variant: 'danger', size: 'sm' })}</span>
    </span>`;
  return `
    <div class="tt__row" data-tt-id="${escapeHtml(account.id)}">
      <div class="tt__row-main">
        <strong class="tt__row-name">${escapeHtml(account.name)}</strong>
        ${renderBadge({ label: badgeLabel, variant: badgeVariant })}
        <span class="tt__row-meta">动态 30s~5min 自适应</span>
        ${last}
      </div>
      ${actions}
    </div>`;
}
